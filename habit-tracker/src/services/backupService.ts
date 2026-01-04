// Backup Service
// Handles export and import of app data as JSON files

import {
    AppData,
    loadAppData,
    saveAppData,
    SCHEMA_VERSION,
    StorageError
} from './storageService';
import { Habit, Task } from '@/types';

// Validation result type
export interface BackupValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    data?: AppData;
}

/**
 * Export all app data as a downloadable JSON file
 */
export function exportToJson(): void {
    const data = loadAppData();

    // Add export metadata
    const exportData: AppData = {
        ...data,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
    };

    // Create JSON blob
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `habit-tracker-backup-${date}.json`;

    // Trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Validate a backup file structure
 */
export function validateBackupFile(data: unknown): BackupValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if data is an object
    if (!data || typeof data !== 'object') {
        return { isValid: false, errors: ['Invalid file format: expected JSON object'], warnings: [] };
    }

    const obj = data as Record<string, unknown>;

    // Check schema version
    if (typeof obj.schemaVersion !== 'number') {
        errors.push('Missing or invalid schema version');
    } else if (obj.schemaVersion > SCHEMA_VERSION) {
        errors.push(`Backup is from a newer version (v${obj.schemaVersion}). Please update the app first.`);
    } else if (obj.schemaVersion < SCHEMA_VERSION) {
        warnings.push(`Backup is from an older version (v${obj.schemaVersion}). Data will be migrated.`);
    }

    // Validate habits array
    if (!Array.isArray(obj.habits)) {
        errors.push('Missing or invalid habits data');
    } else {
        const habitErrors = validateHabitsArray(obj.habits);
        errors.push(...habitErrors);
    }

    // Validate tasks array
    if (!Array.isArray(obj.tasks)) {
        errors.push('Missing or invalid tasks data');
    } else {
        const taskErrors = validateTasksArray(obj.tasks);
        errors.push(...taskErrors);
    }

    // Settings are optional - use defaults if missing
    if (obj.settings && typeof obj.settings !== 'object') {
        warnings.push('Invalid settings format, defaults will be used');
    }

    if (errors.length > 0) {
        return { isValid: false, errors, warnings };
    }

    // Build validated data object
    const validatedData: AppData = {
        schemaVersion: obj.schemaVersion as number,
        habits: obj.habits as Habit[],
        tasks: obj.tasks as Task[],
        settings: obj.settings as AppData['settings'] || {
            sidebarCollapsed: false,
            viewingMonth: new Date().getMonth(),
            viewingYear: new Date().getFullYear(),
        },
        exportedAt: obj.exportedAt as string | undefined,
    };

    return { isValid: true, errors: [], warnings, data: validatedData };
}

/**
 * Validate habits array structure
 */
function validateHabitsArray(habits: unknown[]): string[] {
    const errors: string[] = [];

    for (let i = 0; i < habits.length; i++) {
        const habit = habits[i] as Record<string, unknown>;

        if (!habit || typeof habit !== 'object') {
            errors.push(`Habit at index ${i} is invalid`);
            continue;
        }

        if (typeof habit.id !== 'string' || !habit.id) {
            errors.push(`Habit at index ${i}: missing or invalid id`);
        }
        if (typeof habit.name !== 'string' || !habit.name) {
            errors.push(`Habit at index ${i}: missing or invalid name`);
        }
        if (!Array.isArray(habit.completedDates)) {
            errors.push(`Habit at index ${i}: missing or invalid completedDates`);
        }
    }

    return errors;
}

/**
 * Validate tasks array structure
 */
function validateTasksArray(tasks: unknown[]): string[] {
    const errors: string[] = [];

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i] as Record<string, unknown>;

        if (!task || typeof task !== 'object') {
            errors.push(`Task at index ${i} is invalid`);
            continue;
        }

        if (typeof task.id !== 'string' || !task.id) {
            errors.push(`Task at index ${i}: missing or invalid id`);
        }
        if (typeof task.title !== 'string' || !task.title) {
            errors.push(`Task at index ${i}: missing or invalid title`);
        }
    }

    return errors;
}

/**
 * Import data from a JSON file
 * Returns a promise that resolves when import is complete
 */
export async function importFromJson(file: File): Promise<BackupValidationResult> {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const data = JSON.parse(content);

                const validation = validateBackupFile(data);

                if (!validation.isValid) {
                    resolve(validation);
                    return;
                }

                // Perform atomic save
                try {
                    saveAppData(validation.data!);
                    resolve(validation);
                } catch (error) {
                    if (error instanceof StorageError) {
                        resolve({
                            isValid: false,
                            errors: [error.message],
                            warnings: validation.warnings,
                        });
                    } else {
                        resolve({
                            isValid: false,
                            errors: ['Failed to save imported data'],
                            warnings: validation.warnings,
                        });
                    }
                }
            } catch {
                resolve({
                    isValid: false,
                    errors: ['Invalid JSON file format'],
                    warnings: [],
                });
            }
        };

        reader.onerror = () => {
            resolve({
                isValid: false,
                errors: ['Failed to read file'],
                warnings: [],
            });
        };

        reader.readAsText(file);
    });
}

/**
 * Parse a JSON file and return validation result without importing
 * Useful for preview before import
 */
export async function previewImport(file: File): Promise<BackupValidationResult> {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const data = JSON.parse(content);
                resolve(validateBackupFile(data));
            } catch {
                resolve({
                    isValid: false,
                    errors: ['Invalid JSON file format'],
                    warnings: [],
                });
            }
        };

        reader.onerror = () => {
            resolve({
                isValid: false,
                errors: ['Failed to read file'],
                warnings: [],
            });
        };

        reader.readAsText(file);
    });
}
