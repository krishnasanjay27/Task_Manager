'use client';

import React from 'react';
import { useNotifications } from '@/hooks';

export function NotificationSettings() {
    const {
        settings,
        permissionState,
        isSubscribed,
        isLoading,
        error,
        isSupported,
        canEnable,
        updateSettings,
        enableNotifications,
        disableNotifications,
        clearError,
    } = useNotifications();

    // Format time for display
    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    // Not supported message
    if (!isSupported) {
        return (
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">Push Notifications</h3>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700">
                        Push notifications are not supported in this browser.
                    </p>
                </div>
            </div>
        );
    }

    // Permission denied message
    if (permissionState === 'denied') {
        return (
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">Push Notifications</h3>
                <div className="p-3 bg-[var(--error-light)] border border-[var(--error)] rounded-lg">
                    <p className="text-sm text-[var(--error)]">
                        Notification permission was denied. Please enable notifications in your browser settings.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Push Notifications</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                    Receive gentle reminders even when the browser is closed.
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-[var(--error-light)] border border-[var(--error)] rounded-lg flex items-center justify-between">
                    <p className="text-sm text-[var(--error)]">{error}</p>
                    <button
                        onClick={clearError}
                        className="text-[var(--error)] hover:text-[var(--error)]/80"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 4L4 12M4 4l8 8" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                        {isSubscribed ? 'Notifications Enabled' : 'Enable Notifications'}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                        {isSubscribed ? 'You will receive push notifications' : 'Click to enable push notifications'}
                    </p>
                </div>
                <button
                    onClick={isSubscribed ? disableNotifications : enableNotifications}
                    disabled={isLoading || (!canEnable && !isSubscribed)}
                    className={`
                        relative w-12 h-6 rounded-full transition-colors
                        ${isSubscribed ? 'bg-[var(--success)]' : 'bg-[var(--bg-secondary)]'}
                        ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                    `}
                    aria-label={isSubscribed ? 'Disable notifications' : 'Enable notifications'}
                >
                    <span
                        className={`
                            absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm
                            ${isSubscribed ? 'left-7' : 'left-1'}
                        `}
                    />
                </button>
            </div>

            {/* Settings (only shown when enabled) */}
            {isSubscribed && (
                <>
                    <hr className="border-[var(--border)]" />

                    {/* Habit Reminders */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">Habit Reminders</p>
                            <p className="text-xs text-[var(--text-tertiary)]">Daily check-in for incomplete habits</p>
                        </div>
                        <button
                            onClick={() => updateSettings({ habitReminders: !settings.habitReminders })}
                            className={`
                                relative w-12 h-6 rounded-full transition-colors
                                ${settings.habitReminders ? 'bg-[var(--accent)]' : 'bg-[var(--bg-secondary)]'}
                            `}
                        >
                            <span
                                className={`
                                    absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm
                                    ${settings.habitReminders ? 'left-7' : 'left-1'}
                                `}
                            />
                        </button>
                    </div>

                    {/* Task Reminders */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">Task Reminders</p>
                            <p className="text-xs text-[var(--text-tertiary)]">Alerts for High/Critical tasks due soon</p>
                        </div>
                        <button
                            onClick={() => updateSettings({ taskReminders: !settings.taskReminders })}
                            className={`
                                relative w-12 h-6 rounded-full transition-colors
                                ${settings.taskReminders ? 'bg-[var(--accent)]' : 'bg-[var(--bg-secondary)]'}
                            `}
                        >
                            <span
                                className={`
                                    absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm
                                    ${settings.taskReminders ? 'left-7' : 'left-1'}
                                `}
                            />
                        </button>
                    </div>

                    <hr className="border-[var(--border)]" />

                    {/* Reminder Time */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Daily Reminder Time
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="time"
                                value={settings.reminderTime}
                                onChange={(e) => updateSettings({ reminderTime: e.target.value })}
                                className="input text-sm"
                            />
                            <span className="text-xs text-[var(--text-tertiary)]">
                                ({formatTime(settings.reminderTime)})
                            </span>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">
                            When to send the daily habit reminder
                        </p>
                    </div>

                    {/* Quiet Hours */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">Quiet Hours</p>
                                <p className="text-xs text-[var(--text-tertiary)]">No notifications during this time</p>
                            </div>
                            <button
                                onClick={() => updateSettings({ quietHoursEnabled: !settings.quietHoursEnabled })}
                                className={`
                                    relative w-12 h-6 rounded-full transition-colors
                                    ${settings.quietHoursEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg-secondary)]'}
                                `}
                            >
                                <span
                                    className={`
                                        absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm
                                        ${settings.quietHoursEnabled ? 'left-7' : 'left-1'}
                                    `}
                                />
                            </button>
                        </div>

                        {settings.quietHoursEnabled && (
                            <div className="flex items-center gap-2 ml-4">
                                <input
                                    type="time"
                                    value={settings.quietHoursStart}
                                    onChange={(e) => updateSettings({ quietHoursStart: e.target.value })}
                                    className="input text-sm w-28"
                                />
                                <span className="text-xs text-[var(--text-secondary)]">to</span>
                                <input
                                    type="time"
                                    value={settings.quietHoursEnd}
                                    onChange={(e) => updateSettings({ quietHoursEnd: e.target.value })}
                                    className="input text-sm w-28"
                                />
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
