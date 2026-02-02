import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionLogger } from '../../src/services/action-logger.js';

describe('ActionLogger', () => {
  let logger: ActionLogger;

  beforeEach(() => {
    logger = new ActionLogger(5); // Small limit for testing
  });

  it('should log an action', () => {
    logger.logAction('test-action', { foo: 'bar' }, 'success', 100);
    const log = logger.getActionLog();
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe('test-action');
    expect(log[0].payload).toEqual({ foo: 'bar' });
    expect(log[0].result).toBe('success');
    expect(log[0].duration).toBe(100);
  });

  it('should track start and complete action', () => {
    const actionId = logger.startAction('async-action', { id: 1 });
    expect(logger.getPendingActions()).toHaveLength(1);
    expect(logger.getPendingActions()[0].action).toBe('async-action');

    logger.completeAction(actionId, 'success');
    expect(logger.getPendingActions()).toHaveLength(0);
    expect(logger.getActionLog()).toHaveLength(1);
    expect(logger.getActionLog()[0].action).toBe('async-action');
  });

  it('should respect maximum log size', () => {
    for (let i = 0; i < 10; i++) {
      logger.logAction(`action-${i}`, null, 'success');
    }
    expect(logger.getActionLog()).toHaveLength(5);
    expect(logger.getActionLog()[0].action).toBe('action-5');
    expect(logger.getActionLog()[4].action).toBe('action-9');
  });

  it('should sanitize sensitive data in payload', () => {
    const payload = {
      username: 'user1',
      password: 'secret-password',
      apiKey: 'secret-api-key',
      token: 'secret-token',
      nested: {
        secret: 'nested-secret'
      }
    };
    logger.logAction('login', payload, 'success');
    const log = logger.getActionLog();
    const sanitized = log[0].payload as any;
    expect(sanitized.username).toBe('user1');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.apiKey).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.nested.secret).toBe('[REDACTED]');
  });

  it('should filter failed actions', () => {
    logger.logAction('a1', null, 'success');
    logger.logAction('a2', null, 'error');
    logger.logAction('a3', null, 'success');

    const failed = logger.getFailedActions();
    expect(failed).toHaveLength(1);
    expect(failed[0].action).toBe('a2');
  });

  it('should clear log', () => {
    logger.logAction('a1', null, 'success');
    logger.clearLog();
    expect(logger.getActionLog()).toHaveLength(0);
  });
});
