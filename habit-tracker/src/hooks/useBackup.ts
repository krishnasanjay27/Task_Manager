'use client';

import { useState, useCallback } from 'react';
import { exportToJson, importFromJson, previewImport, BackupValidationResult } from '@/services/backupService';

export interface UseBackupReturn {
    // Export
    exportData: () => void;

    // Import
    importData: (file: File) => Promise<BackupValidationResult>;
    previewData: (file: File) => Promise<BackupValidationResult>;

    // State
    isImporting: boolean;
    importError: string | null;
    importWarnings: string[];
    clearError: () => void;
}

export function useBackup(onImportSuccess?: () => void): UseBackupReturn {
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importWarnings, setImportWarnings] = useState<string[]>([]);

    const exportData = useCallback(() => {
        try {
            exportToJson();
        } catch (error) {
            console.error('Export failed:', error);
        }
    }, []);

    const previewData = useCallback(async (file: File): Promise<BackupValidationResult> => {
        return previewImport(file);
    }, []);

    const importData = useCallback(async (file: File): Promise<BackupValidationResult> => {
        setIsImporting(true);
        setImportError(null);
        setImportWarnings([]);

        try {
            const result = await importFromJson(file);

            if (!result.isValid) {
                setImportError(result.errors.join('. '));
            } else {
                setImportWarnings(result.warnings);
                // Notify parent to refresh data
                onImportSuccess?.();
            }

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Import failed';
            setImportError(errorMessage);
            return {
                isValid: false,
                errors: [errorMessage],
                warnings: [],
            };
        } finally {
            setIsImporting(false);
        }
    }, [onImportSuccess]);

    const clearError = useCallback(() => {
        setImportError(null);
        setImportWarnings([]);
    }, []);

    return {
        exportData,
        importData,
        previewData,
        isImporting,
        importError,
        importWarnings,
        clearError,
    };
}
