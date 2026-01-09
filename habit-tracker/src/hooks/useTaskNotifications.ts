'use client';

/**
 * useTaskNotifications Hook
 * 
 * Implements frontend polling for task due push notifications.
 * - Runs every 5 minutes when enabled
 * - Sends only High/Critical priority tasks due within 30 minutes
 * - Pauses when tab is inactive (Page Visibility API)
 * - Respects notification settings
 * - Errors are silently ignored (backend handles deduplication)
 */

import { useEffect, useRef, useCallback } from 'react';
import { Task } from '@/types';
import { loadTasks, loadNotificationSettings } from '@/services/storageService';
import { isPushSupported, getPermissionState, getCurrentSubscription } from '@/services/pushService';

const PUSH_SERVER_URL = process.env.NEXT_PUBLIC_PUSH_SERVER_URL || 'http://localhost:3001';

// Polling interval: 5 minutes
const POLL_INTERVAL_MS = 5 * 60 * 1000;

// Initial delay before first check: 1 minute after page load
const INITIAL_DELAY_MS = 60 * 1000;

// Tasks due within this window will trigger notifications
const DUE_WINDOW_MINUTES = 30;

interface TaskPayload {
    id: string;
    title: string;
    priority: string;
    status: string;
    dueDate: string;
}

/**
 * Check if a task is due soon (within 30 minutes)
 */
function isDueSoon(dueDate: string): boolean {
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    // Due within 30 minutes AND not already past
    return diffMinutes > 0 && diffMinutes <= DUE_WINDOW_MINUTES;
}

/**
 * Filter tasks that should trigger notifications
 * - High or Critical priority
 * - Not completed
 * - Has a due date
 * - Due within 30 minutes
 */
function filterNotifiableTasks(tasks: Task[]): TaskPayload[] {
    return tasks
        .filter(task =>
            // High or Critical priority only
            (task.priority === 'High' || task.priority === 'Critical') &&
            // Not completed
            task.status !== 'Completed' &&
            // Has a valid due date
            task.dueDate &&
            // Due within 30 minutes
            isDueSoon(task.dueDate)
        )
        .map(task => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate!
        }));
}

/**
 * Send tasks to backend for notification processing
 */
async function sendTasksToBackend(tasks: TaskPayload[]): Promise<void> {
    if (tasks.length === 0) return;

    try {
        await fetch(`${PUSH_SERVER_URL}/check-tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks })
        });
        // Silently succeed - backend handles deduplication
    } catch {
        // Silently fail - don't break UI for notification failures
    }
}

/**
 * Hook to manage task notification polling
 * 
 * Automatically starts/stops based on:
 * - Notification settings (enabled + taskReminders)
 * - Browser permission status
 * - Tab visibility (pauses when hidden)
 */
export function useTaskNotifications() {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isActiveRef = useRef(false);

    /**
     * Check tasks and send to backend if any are due soon
     */
    const checkTasks = useCallback(async () => {
        // Early exit if notifications not supported or permitted
        if (!isPushSupported()) return;
        if (getPermissionState() !== 'granted') return;

        // Check if subscribed
        const subscription = await getCurrentSubscription();
        if (!subscription) return;

        // Check notification settings
        const settings = loadNotificationSettings();
        if (!settings.enabled || !settings.taskReminders) return;

        // Load and filter tasks
        const tasks = loadTasks();
        const notifiableTasks = filterNotifiableTasks(tasks);

        // Send to backend (backend handles deduplication)
        await sendTasksToBackend(notifiableTasks);
    }, []);

    /**
     * Start the polling interval
     */
    const startPolling = useCallback(() => {
        if (isActiveRef.current) return;

        isActiveRef.current = true;

        // Initial check after delay
        setTimeout(() => {
            if (isActiveRef.current) {
                checkTasks();
            }
        }, INITIAL_DELAY_MS);

        // Regular interval
        intervalRef.current = setInterval(() => {
            if (isActiveRef.current && document.visibilityState === 'visible') {
                checkTasks();
            }
        }, POLL_INTERVAL_MS);
    }, [checkTasks]);

    /**
     * Stop the polling interval
     */
    const stopPolling = useCallback(() => {
        isActiveRef.current = false;
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    /**
     * Handle visibility change - run check when tab becomes visible
     */
    const handleVisibilityChange = useCallback(() => {
        if (document.visibilityState === 'visible' && isActiveRef.current) {
            // Trigger a check when tab becomes visible again
            checkTasks();
        }
    }, [checkTasks]);

    /**
     * Initialize polling based on settings
     */
    useEffect(() => {
        // Initial setup
        const initPolling = async () => {
            if (!isPushSupported()) return;
            if (getPermissionState() !== 'granted') return;

            const subscription = await getCurrentSubscription();
            if (!subscription) return;

            const settings = loadNotificationSettings();
            if (settings.enabled && settings.taskReminders) {
                startPolling();
            }
        };

        initPolling();

        // Listen for visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup on unmount
        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [startPolling, stopPolling, handleVisibilityChange]);

    return {
        checkTasks, // Manual trigger if needed
        startPolling,
        stopPolling,
    };
}
