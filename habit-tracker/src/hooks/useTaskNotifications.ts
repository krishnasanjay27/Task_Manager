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

// Initial delay before first check: 10 seconds after page load (reduced for faster first check)
const INITIAL_DELAY_MS = 10 * 1000;

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

    const result = diffMinutes > 0 && diffMinutes <= DUE_WINDOW_MINUTES;
    console.log(`[TaskNotif] isDueSoon check: due=${dueDate}, diffMinutes=${diffMinutes.toFixed(1)}, isDueSoon=${result}`);

    return result;
}

/**
 * Filter tasks that should trigger notifications
 * - High or Critical priority
 * - Not completed
 * - Has a due date
 * - Due within 30 minutes
 */
function filterNotifiableTasks(tasks: Task[]): TaskPayload[] {
    console.log(`[TaskNotif] Filtering ${tasks.length} total tasks`);

    const filtered = tasks
        .filter(task => {
            const isHighPriority = task.priority === 'High' || task.priority === 'Critical';
            const isNotCompleted = task.status !== 'Completed';
            const hasDueDate = !!task.dueDate;
            const dueSoon = hasDueDate ? isDueSoon(task.dueDate!) : false;

            const shouldNotify = isHighPriority && isNotCompleted && hasDueDate && dueSoon;

            if (isHighPriority && hasDueDate) {
                console.log(`[TaskNotif] Task "${task.title}": priority=${task.priority}, status=${task.status}, dueDate=${task.dueDate}, dueSoon=${dueSoon}, shouldNotify=${shouldNotify}`);
            }

            return shouldNotify;
        })
        .map(task => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate!
        }));

    console.log(`[TaskNotif] Filtered to ${filtered.length} notifiable tasks`);
    return filtered;
}

/**
 * Send tasks to backend for notification processing
 */
async function sendTasksToBackend(tasks: TaskPayload[]): Promise<void> {
    if (tasks.length === 0) {
        console.log('[TaskNotif] No tasks to send');
        return;
    }

    console.log(`[TaskNotif] Sending ${tasks.length} tasks to backend:`, tasks);

    try {
        const response = await fetch(`${PUSH_SERVER_URL}/check-tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks })
        });
        const result = await response.json();
        console.log('[TaskNotif] Backend response:', result);
    } catch (error) {
        console.error('[TaskNotif] Failed to send tasks:', error);
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
        console.log('[TaskNotif] Running task check...');

        // Early exit if notifications not supported or permitted
        if (!isPushSupported()) {
            console.log('[TaskNotif] Push not supported');
            return;
        }
        if (getPermissionState() !== 'granted') {
            console.log('[TaskNotif] Permission not granted:', getPermissionState());
            return;
        }

        // Check if subscribed
        const subscription = await getCurrentSubscription();
        if (!subscription) {
            console.log('[TaskNotif] No subscription found');
            return;
        }

        // Check notification settings
        const settings = loadNotificationSettings();
        console.log('[TaskNotif] Settings:', { enabled: settings.enabled, taskReminders: settings.taskReminders });
        if (!settings.enabled || !settings.taskReminders) {
            console.log('[TaskNotif] Task notifications disabled in settings');
            return;
        }

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
        if (isActiveRef.current) {
            console.log('[TaskNotif] Polling already active');
            return;
        }

        console.log('[TaskNotif] Starting polling...');
        isActiveRef.current = true;

        // Initial check after short delay
        setTimeout(() => {
            if (isActiveRef.current) {
                console.log('[TaskNotif] Running initial check');
                checkTasks();
            }
        }, INITIAL_DELAY_MS);

        // Regular interval
        intervalRef.current = setInterval(() => {
            if (isActiveRef.current && document.visibilityState === 'visible') {
                console.log('[TaskNotif] Running scheduled check');
                checkTasks();
            }
        }, POLL_INTERVAL_MS);
    }, [checkTasks]);

    /**
     * Stop the polling interval
     */
    const stopPolling = useCallback(() => {
        console.log('[TaskNotif] Stopping polling');
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
            console.log('[TaskNotif] Tab became visible, running check');
            checkTasks();
        }
    }, [checkTasks]);

    /**
     * Initialize polling based on settings
     */
    useEffect(() => {
        // Initial setup
        const initPolling = async () => {
            console.log('[TaskNotif] Initializing...');

            if (!isPushSupported()) {
                console.log('[TaskNotif] Push not supported, skipping');
                return;
            }
            if (getPermissionState() !== 'granted') {
                console.log('[TaskNotif] Permission not granted, skipping');
                return;
            }

            const subscription = await getCurrentSubscription();
            if (!subscription) {
                console.log('[TaskNotif] No subscription, skipping');
                return;
            }

            const settings = loadNotificationSettings();
            if (settings.enabled && settings.taskReminders) {
                console.log('[TaskNotif] Conditions met, starting polling');
                startPolling();
            } else {
                console.log('[TaskNotif] Notifications disabled in settings');
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
