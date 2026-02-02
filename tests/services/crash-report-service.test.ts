import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CrashReportService, StateProvider } from '../../src/services/crash-report-service.js';
import { ActionLogger } from '../../src/services/action-logger.js';
import { LoggingService } from '../../src/services/logging-service.js';

describe('CrashReportService', () => {
  let service: CrashReportService;
  let mockStateProvider: StateProvider;
  let actionLogger: ActionLogger;
  let logger: LoggingService;

  beforeEach(() => {
    mockStateProvider = {
      getCurrentView: () => 'test-view',
      getActiveRecipeId: () => 'recipe-1',
      getActiveMenuId: () => undefined,
      getPendingOperations: () => [],
      getPreferences: () => ({ theme: 'dark' }),
    };
    actionLogger = new ActionLogger();
    logger = new LoggingService({ enableConsole: false });
    service = new CrashReportService(mockStateProvider, actionLogger, logger, 5);
  });

  it('should capture application state on error', () => {
    actionLogger.logAction('user-clicked', null, 'success');
    const error = new Error('test error');
    const report = service.captureState(error);

    expect(report.error.message).toBe('test error');
    expect(report.state.currentView).toBe('test-view');
    expect(report.state.activeRecipeId).toBe('recipe-1');
    expect(report.state.preferences).toEqual({ theme: 'dark' });
    expect(report.actionLog).toHaveLength(1);
    expect(report.actionLog[0].action).toBe('user-clicked');
    expect(service.getReportCount()).toBe(1);
  });

  it('should respect maximum reports limit', () => {
    for (let i = 0; i < 10; i++) {
      service.captureState(new Error(`error ${i}`));
    }
    expect(service.getReportCount()).toBe(5);
    expect(service.getRecentCrashes()[0].error.message).toBe('error 9');
  });

  it('should get report by ID', () => {
    const report = service.captureState(new Error('err'));
    const fetched = service.getReport(report.id);
    expect(fetched).toEqual(report);
  });

  it('should delete report', () => {
    const report = service.captureState(new Error('err'));
    const result = service.deleteReport(report.id);
    expect(result).toBe(true);
    expect(service.getReportCount()).toBe(0);
  });

  it('should clear reports', () => {
    service.captureState(new Error('err'));
    service.clearReports();
    expect(service.getReportCount()).toBe(0);
  });
});
