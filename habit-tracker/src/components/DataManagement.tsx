'use client';

import React, { useState, useRef } from 'react';
import { useBackup } from '@/hooks';
import { Button, Modal } from '@/components/ui';

interface DataManagementProps {
    onImportSuccess?: () => void;
}

export function DataManagement({ onImportSuccess }: DataManagementProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [previewStats, setPreviewStats] = useState<{ habits: number; tasks: number } | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const {
        exportData,
        importData,
        previewData,
        isImporting,
        importError,
        importWarnings,
        clearError,
    } = useBackup(onImportSuccess);

    const handleExport = () => {
        exportData();
        setSuccessMessage('Data exported successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        clearError();

        // Preview the file first
        const preview = await previewData(file);

        if (!preview.isValid) {
            // Error will be set by the hook
            return;
        }

        // Show confirmation modal with stats
        setPendingFile(file);
        setPreviewStats({
            habits: preview.data?.habits.length || 0,
            tasks: preview.data?.tasks.length || 0,
        });
        setShowConfirmModal(true);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleConfirmImport = async () => {
        if (!pendingFile) return;

        const result = await importData(pendingFile);

        setShowConfirmModal(false);
        setPendingFile(null);
        setPreviewStats(null);

        if (result.isValid) {
            setSuccessMessage('Data imported successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    };

    const handleCancelImport = () => {
        setShowConfirmModal(false);
        setPendingFile(null);
        setPreviewStats(null);
        clearError();
    };

    return (
        <div className="space-y-6">
            {/* Export Section */}
            <div>
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Export Data</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Download all your habits, tasks, and settings as a JSON file.
                </p>
                <Button variant="secondary" onClick={handleExport}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="mr-2">
                        <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 14h10" />
                    </svg>
                    Export Data
                </Button>
            </div>

            {/* Divider */}
            <hr className="border-[var(--border)]" />

            {/* Import Section */}
            <div>
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Import Data</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Restore from a previously exported backup file. This will replace all current data.
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="import-file"
                />
                <Button
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="mr-2">
                        <path d="M8 10V2m0 0l-3 3m3-3l3 3M3 14h10" />
                    </svg>
                    {isImporting ? 'Importing...' : 'Import Data'}
                </Button>
            </div>

            {/* Error Message */}
            {importError && (
                <div className="p-3 bg-[var(--error-light)] border border-[var(--error)] rounded-lg">
                    <p className="text-sm text-[var(--error)]">{importError}</p>
                </div>
            )}

            {/* Warning Messages */}
            {importWarnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    {importWarnings.map((warning, i) => (
                        <p key={i} className="text-sm text-amber-700">{warning}</p>
                    ))}
                </div>
            )}

            {/* Success Message */}
            {successMessage && (
                <div className="p-3 bg-[var(--success-light)] border border-[var(--success)] rounded-lg">
                    <p className="text-sm text-[var(--success)]">{successMessage}</p>
                </div>
            )}

            {/* Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={handleCancelImport}
                title="Confirm Import"
                footer={
                    <>
                        <Button variant="secondary" onClick={handleCancelImport}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmImport} disabled={isImporting}>
                            {isImporting ? 'Importing...' : 'Import & Replace'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-[var(--text-secondary)]">
                        This will replace all your current data with the backup file contents.
                    </p>

                    {previewStats && (
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                            <p className="text-sm font-medium mb-2">Backup contains:</p>
                            <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                                <li>• {previewStats.habits} habit{previewStats.habits !== 1 ? 's' : ''}</li>
                                <li>• {previewStats.tasks} task{previewStats.tasks !== 1 ? 's' : ''}</li>
                            </ul>
                        </div>
                    )}

                    <p className="text-sm text-[var(--text-tertiary)]">
                        <strong>⚠️ This action cannot be undone.</strong> Export your current data first if you want to keep a backup.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
