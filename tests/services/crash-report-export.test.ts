import { describe, it, expect, beforeEach } from 'vitest';
import { CrashReportService } from '../../src/services/crash-report-service.js';
import { CrashReportExportService } from '../../src/services/crash-report-export.js';
import { ActionLogger } from '../../src/services/action-logger.js';
import { LoggingService } from '../../src/services/logging-service.js';

describe('CrashReportExportService', () => {
  let crashService: CrashReportService;
  let exportService: CrashReportExportService;

  beforeEach(() => {
    const mockStateProvider = {
      getCurrentView: () => 'test-view',
      getActiveRecipeId: () => 'recipe-1',
      getActiveMenuId: () => undefined,
      getPendingOperations: () => [],
      getPreferences: () => ({ theme: 'dark' }),
    };
    crashService = new CrashReportService(mockStateProvider, new ActionLogger(), new LoggingService({enableConsole: false}));
    exportService = new CrashReportExportService(crashService);
  });

  it('should export and anonymize a crash report', () => {
    const report = crashService.captureState(new Error('test error'));
    const exported = exportService.exportReport(report.id);

    expect(exported).not.toBeNull();
    expect(exported?.report.id).toBe(report.id);
    expect(exported?.report.error.message).toBe('test error');
    expect(exported?.report.state.currentView).toBe('test-view');
    expect(exported?.report.state.hasActiveRecipe).toBe(true);
    // Preferences should be anonymized to keys only
    expect(exported?.report.state.preferenceKeys).toContain('theme');
    expect((exported?.report.state as any).preferences).toBeUndefined();
  });

  it('should import an exported crash report', () => {
    const report = crashService.captureState(new Error('test error'));
    const exportedString = exportService.exportReportAsString(report.id)!;

    crashService.clearReports();
    const imported = exportService.importReport(exportedString);

    expect(imported).not.toBeNull();
    expect(imported?.error.message).toBe('test error');
    expect(imported?.state.currentView).toBe('test-view');
    expect(crashService.getReportCount()).toBe(1);
  });
});
