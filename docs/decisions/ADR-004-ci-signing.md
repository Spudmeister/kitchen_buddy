# ADR-004: CI signs with one dedicated, account-wide imported certificate

**Status:** Accepted
**Date:** 2026-09-07 (port of cardplay ADR-004)

## Context

The TestFlight job archives on clean GitHub macOS runners with automatic
signing (`-allowProvisioningUpdates` + App Store Connect API key). With no
signing identity in the runner keychain, every run mints a new DEVELOPMENT
certificate until the Apple account's certificate cap trips ("Your account has
reached the maximum number of certificates", then "No profiles ... were
found"). It happened to cardplay (2026-08-03, 14 junk certs) and backgammon
(2026-09-03, 10). The cap is per Apple account, so a misconfigured
kitchen_buddy breaks the other apps too.

## Decision

- One dedicated CI DEVELOPMENT certificate lives in repo secrets
  `CI_CERT_P12` / `CI_CERT_PASSWORD`. The "Import CI signing certificate"
  step imports it into a temporary keychain before archiving so automatic
  signing reuses it and mints nothing. Absent secrets degrade to a warning.
- The certificate is **account-wide**: create it once with its private key
  kept at `~/.appstoreconnect/ci-cert/` on Andrew's Mac, and reuse the same
  p12 in every repo on the team as their certificates expire.
- Set `CI_CERT_*` before `ASC_*` on a new repo: the job skips entirely while
  `ASC_KEY_ID` is absent, so this order prevents cap damage.
- Never use Andrew's personal development certificate as the CI identity.

## Procedure (once a year)

```sh
CERTDIR=~/.appstoreconnect/ci-cert && mkdir -p "$CERTDIR" && chmod 700 "$CERTDIR" && cd "$CERTDIR"
openssl genrsa -out ci.key 2048
openssl req -new -key ci.key -out ci.csr -subj "/CN=Kitchen Buddy CI/O=ANDREW CHRISTOPHER EVANS/C=US"
# Upload ci.csr in the developer portal (Certificates → + → Apple Development)
# or POST it to /v1/certificates with an ES256 JWT minted from the Admin key
# (backgammon/scripts/asc.py has the JWT code). Download ci.cer, then:
openssl x509 -inform DER -in ci.cer -out ci.pem
# Legacy PBE so macOS `security import` can read it:
openssl pkcs12 -export -inkey ci.key -in ci.pem -out ci.p12 -name "Kitchen Buddy CI" \
  -certpbe PBE-SHA1-3DES -keypbe PBE-SHA1-3DES -macalg sha1 -passout pass:"$P12_PASS"
# Prove it imports before trusting it to CI:
security create-keychain -p x /tmp/t.keychain-db && \
  security import ci.p12 -k /tmp/t.keychain-db -P "$P12_PASS" -T /usr/bin/codesign && \
  security find-identity -v -p codesigning /tmp/t.keychain-db && security delete-keychain /tmp/t.keychain-db
gh secret set CI_CERT_P12 --body "$(base64 -i ci.p12)"
gh secret set CI_CERT_PASSWORD --body "$P12_PASS"
```

Check the account first (`backgammon/scripts/asc.py certs`); if no
DEVELOPMENT slot is free, revoke the stale "Created via API" ones.

## Current certificate

Created 2026-09-07 through the API: certificate ID **NQKL4TJQ4B**, expires
2027-09-08, key and p12 at `~/.appstoreconnect/ci-cert/` (see its README).
Apple names every API-created certificate "Apple Development: Created via
API", so a stale-cert cleanup must keep NQKL4TJQ4B — pass `--keep` / check the
ID, never revoke by name alone. The Issuer ID is now stored at
`~/.appstoreconnect/issuer_id` (owner-only) for local tooling.

## Portal capabilities (learned 2026-09-08)

For iCloud Documents the App ID's iCloud capability must be in **Xcode 6
mode** — in the portal that is the checkbox labelled "Include CloudKit
support", which really means "modern iCloud entitlements", not "use
CloudKit". Unticked (Xcode 5 mode) Apple issues profiles with legacy
`ubiquity-*` wildcard entitlements and the archive fails with "doesn't
include icloud-container-identifiers / icloud-services". Fix via the API:
`PATCH /v1/bundleIdCapabilities/<id>` with `ICLOUD_VERSION = XCODE_6`
(App Groups and container assignment were fine). App Groups and iCloud
containers themselves must be created and assigned in the portal by hand;
`-allowProvisioningUpdates` registers bundle IDs and profiles only.

## Consequences

- Certificate count stays flat run over run; verify after the first green run.
- Renewal is one event for all repos.
- The Admin key (`656K26NVTL`, `~/.appstoreconnect/private_keys/`) is what
  makes cloud signing and certificate management scriptable; App Manager keys
  fail with "Cloud signing permission error".
