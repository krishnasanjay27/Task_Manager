'use client';

import { useState, useEffect, useCallback } from 'react';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '@/types';
import {
    loadNotificationSettings,
    saveNotificationSettings as saveToStorage
} from '@/services/storageService';
import {
    isPushSupported,
    getPermissionState,
    registerServiceWorker,
    subscribeToPush,
    unsubscribeFromPush,
    getCurrentSubscription
} from '@/services/pushService';

const PUSH_SERVER_URL = process.env.NEXT_PUBLIC_PUSH_SERVER_URL || 'http://localhost:3001';

export function useNotifications() {
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
    const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load settings and check subscription status on mount
    useEffect(() => {
        async function init() {
            // Load settings from storage
            const savedSettings = loadNotificationSettings();
            setSettings(savedSettings);

            // Check push support and permission
            if (!isPushSupported()) {
                setPermissionState('unsupported');
                setIsLoading(false);
                return;
            }

            setPermissionState(getPermissionState());

            // Register service worker
            await registerServiceWorker();

            // Check if already subscribed
            const subscription = await getCurrentSubscription();
            const hasSubscription = !!subscription;
            setIsSubscribed(hasSubscription);

            // CRITICAL FIX: Sync settings.enabled with actual subscription state
            // This ensures useTaskNotifications starts polling correctly on page load
            if (hasSubscription && !savedSettings.enabled) {
                const syncedSettings = { ...savedSettings, enabled: true };
                saveToStorage(syncedSettings);
                setSettings(syncedSettings);
            }

            setIsLoading(false);
        }

        init();
    }, []);

    // Sync settings with backend
    const syncWithBackend = useCallback(async (updates: Partial<NotificationSettings>) => {
        try {
            await fetch(`${PUSH_SERVER_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reminderTime: updates.reminderTime,
                    habitRemindersEnabled: updates.habitReminders,
                    taskRemindersEnabled: updates.taskReminders,
                    quietHoursEnabled: updates.quietHoursEnabled,
                    quietHoursStart: updates.quietHoursStart,
                    quietHoursEnd: updates.quietHoursEnd
                })
            });
        } catch (err) {
            console.error('Failed to sync settings with backend:', err);
        }
    }, []);

    // Save settings to storage and sync with backend
    const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
        setSettings(prev => {
            const newSettings = { ...prev, ...updates };
            saveToStorage(newSettings);

            // Sync relevant settings with backend
            if (updates.reminderTime || updates.habitReminders !== undefined ||
                updates.taskReminders !== undefined || updates.quietHoursEnabled !== undefined ||
                updates.quietHoursStart || updates.quietHoursEnd) {
                syncWithBackend(newSettings);
            }

            return newSettings;
        });
    }, [syncWithBackend]);

    // Request permission and subscribe to push notifications
    // MUST be called from a user interaction (click event)
    const enableNotifications = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            if (!isPushSupported()) {
                throw new Error('Push notifications are not supported in this browser');
            }

            // Request permission
            const permission = await Notification.requestPermission();
            setPermissionState(permission);

            if (permission !== 'granted') {
                throw new Error('Notification permission was denied');
            }

            // Subscribe to push
            await subscribeToPush();
            setIsSubscribed(true);

            // Update settings
            updateSettings({ enabled: true });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to enable notifications');
            console.error('Enable notifications error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [updateSettings]);

    // Disable notifications and unsubscribe
    const disableNotifications = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            await unsubscribeFromPush();
            setIsSubscribed(false);
            updateSettings({ enabled: false });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to disable notifications');
            console.error('Disable notifications error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [updateSettings]);

    // Toggle notifications on/off
    const toggleNotifications = useCallback(async () => {
        if (settings.enabled && isSubscribed) {
            await disableNotifications();
        } else {
            await enableNotifications();
        }
    }, [settings.enabled, isSubscribed, enableNotifications, disableNotifications]);

    return {
        // State
        settings,
        permissionState,
        isSubscribed,
        isLoading,
        error,

        // Computed
        isSupported: isPushSupported(),
        canEnable: isPushSupported() && permissionState !== 'denied',

        // Actions
        updateSettings,
        enableNotifications,
        disableNotifications,
        toggleNotifications,
        clearError: () => setError(null),
    };
}
