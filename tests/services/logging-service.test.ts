import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoggingService } from '../../src/services/logging-service.js';

describe('LoggingService', () => {
  let service: LoggingService;

  beforeEach(() => {
    service = new LoggingService({ minLevel: 'DEBUG', enableConsole: false });
  });

  it('should log messages at various levels', () => {
    service.info('info msg', 'comp1');
    service.error('error msg', 'comp2');
    service.debug('debug msg', 'comp3');
    service.warn('warn msg', 'comp4');

    expect(service.getBufferSize()).toBe(4);
    const logs = service.getRecentLogs();
    expect(logs[0].level).toBe('INFO');
    expect(logs[1].level).toBe('ERROR');
    expect(logs[2].level).toBe('DEBUG');
    expect(logs[3].level).toBe('WARN');
  });

  it('should filter messages based on minLevel', () => {
    service.configure({ minLevel: 'WARN' });
    service.debug('should not log', 'comp');
    service.info('should not log', 'comp');
    service.warn('should log', 'comp');
    service.error('should log', 'comp');

    expect(service.getBufferSize()).toBe(2);
    expect(service.getRecentLogs()[0].level).toBe('WARN');
    expect(service.getRecentLogs()[1].level).toBe('ERROR');
  });

  it('should capture errors', () => {
    const error = new Error('boom');
    (error as any).code = 'ERR_BOOM';
    service.error('failed', 'comp', { userId: 1 }, error);

    const logs = service.getErrorLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('failed');
    expect(logs[0].error?.message).toBe('boom');
    expect(logs[0].error?.code).toBe('ERR_BOOM');
    expect(logs[0].context).toEqual({ userId: 1 });
  });

  it('should clear logs', () => {
    service.info('msg', 'comp');
    service.clearLogs();
    expect(service.getBufferSize()).toBe(0);
  });
});
