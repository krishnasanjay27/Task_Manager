// Storage Abstraction Layer
// Centralized storage service for all app data persistence

import { Habit, Task } from '@/types';

// Schema version for data migration support
export const SCHEMA_VERSION = 1;

// Storage keys - centralized to prevent key collisions
export const STORAGE_KEYS = {
    HABITS: 'habits',
    TASKS: 'tasks',
    SETTINGS: 'app_settings',
    SCHEMA_VERSION: 'schema_version',
} as const;

// App settings interface
export interface AppSettings {
    sidebarCollapsed: boolean;
    viewingMonth: number;
    viewingYear: number;
}

// Complete app data structure for backup/restore
export interface AppData {
    schemaVersion: number;
    habits: Habit[];
    tasks: Task[];
    settings: AppSettings;
    exportedAt?: string;
}

// Default values
const DEFAULT_SETTINGS: AppSettings = {
    sidebarCollapsed: false,
    viewingMonth: new Date().getMonth(),
    viewingYear: new Date().getFullYear(),
};

// Storage error types
export class StorageError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'StorageError';
    }
}

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
    try {
        const test = '__storage_test__';
        window.localStorage.setItem(test, test);
        window.localStorage.removeItem(test);
        return true;
    } catch {
        return false;
    }
}

/**
 * Safely get an item from localStorage with JSON parsing
 */
function getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;

    try {
        const item = window.localStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item) as T;
    } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Safely set an item in localStorage with JSON serialization
 */
function setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
            throw new StorageError('Storage quota exceeded. Please export and clear some data.', 'QUOTA_EXCEEDED');
        }
        throw new StorageError(`Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`, 'WRITE_ERROR');
    }
}

/**
 * Remove an item from localStorage
 */
function removeItem(key: string): void {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.removeItem(key);
    } catch (error) {
        console.error(`Error removing localStorage key "${key}":`, error);
    }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load all app data from storage
 */
export function loadAppData(): AppData {
    return {
        schemaVersion: getItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION),
        habits: getItem<Habit[]>(STORAGE_KEYS.HABITS, []),
        tasks: getItem<Task[]>(STORAGE_KEYS.TASKS, []),
        settings: getItem<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
    };
}

/**
 * Save all app data to storage atomically
 * Uses a transaction-like pattern to prevent partial writes
 */
export function saveAppData(data: Partial<AppData>): void {
    if (!isStorageAvailable()) {
        throw new StorageError('localStorage is not available', 'STORAGE_UNAVAILABLE');
    }

    // Create backup of current data in case we need to rollback
    const backup = loadAppData();

    try {
        if (data.habits !== undefined) {
            setItem(STORAGE_KEYS.HABITS, data.habits);
        }
        if (data.tasks !== undefined) {
            setItem(STORAGE_KEYS.TASKS, data.tasks);
        }
        if (data.settings !== undefined) {
            setItem(STORAGE_KEYS.SETTINGS, data.settings);
        }
        if (data.schemaVersion !== undefined) {
            setItem(STORAGE_KEYS.SCHEMA_VERSION, data.schemaVersion);
        }
    } catch (error) {
        // Rollback on failure
        console.error('Save failed, rolling back:', error);
        try {
            setItem(STORAGE_KEYS.HABITS, backup.habits);
            setItem(STORAGE_KEYS.TASKS, backup.tasks);
            setItem(STORAGE_KEYS.SETTINGS, backup.settings);
            setItem(STORAGE_KEYS.SCHEMA_VERSION, backup.schemaVersion);
        } catch (rollbackError) {
            console.error('Rollback also failed:', rollbackError);
        }
        throw error;
    }
}

/**
 * Reset all app data to defaults
 */
export function resetAppData(): void {
    if (!isStorageAvailable()) {
        throw new StorageError('localStorage is not available', 'STORAGE_UNAVAILABLE');
    }

    removeItem(STORAGE_KEYS.HABITS);
    removeItem(STORAGE_KEYS.TASKS);
    removeItem(STORAGE_KEYS.SETTINGS);
    setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION);
}

/**
 * Load a specific data type from storage
 */
export function loadHabits(): Habit[] {
    return getItem<Habit[]>(STORAGE_KEYS.HABITS, []);
}

export function saveHabits(habits: Habit[]): void {
    setItem(STORAGE_KEYS.HABITS, habits);
}

export function loadTasks(): Task[] {
    return getItem<Task[]>(STORAGE_KEYS.TASKS, []);
}

export function saveTasks(tasks: Task[]): void {
    setItem(STORAGE_KEYS.TASKS, tasks);
}

export function loadSettings(): AppSettings {
    return getItem<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
    setItem(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * Get the current schema version from storage
 */
export function getStoredSchemaVersion(): number {
    return getItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION);
}
