# URL parser fixtures

Hand-written HTML fixtures for the schema.org recipe extractor (M6):
one JSON-LD page, one `@graph` page, one microdata page — committed here.

Real-site captures go under `live/` (git-ignored) via
`scripts/fetch-url-fixtures.sh`, which pulls the URLs the old PWA test
suite used:

- https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/
- https://www.foodnetwork.com/recipes/alton-brown/the-chewy-recipe-1914700
- https://www.bonappetit.com/recipe/bas-best-chocolate-chip-cookies
- https://sallysbakingaddiction.com/chewy-chocolate-chip-cookies/
- https://www.simplyrecipes.com/recipes/homemade_granola/
- https://cookieandkate.com/best-granola-recipe/
- https://www.food.com/recipe/best-chocolate-chip-cookies-6344
- https://www.epicurious.com/recipes/food/views/best-chocolate-chip-cookies-51234640
- https://www.kingarthurbaking.com/recipes/classic-chocolate-chip-cookies-recipe
- https://www.seriouseats.com/the-best-chocolate-chip-cookies-recipe-the-food-lab
