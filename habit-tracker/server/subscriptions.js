/**
 * Persistent Subscription Storage
 * File-based storage with atomic writes for reliability across server restarts
 */

const fs = require('fs');
const path = require('path');

const SUBS_FILE = path.join(__dirname, 'subscriptions.json');
const STATE_FILE = path.join(__dirname, 'notificationState.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

// Default settings
const DEFAULT_SETTINGS = {
    reminderTime: '20:00',  // 8:00 PM in 24-hour format
    habitRemindersEnabled: true,
    taskRemindersEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00'
};

// ============================================================================
// Settings Management
// ============================================================================

/**
 * Load settings from file
 * @returns {Object} Settings
 */
function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
        }
    } catch (error) {
        console.error('Error loading settings:', error.message);
    }
    return { ...DEFAULT_SETTINGS };
}

/**
 * Save settings to file
 * @param {Object} settings - Settings object
 */
function saveSettings(settings) {
    try {
        // Direct write (Windows-compatible - atomic rename can fail due to permissions)
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('Error saving settings:', error.message);
        throw error;
    }
}

/**
 * Update specific settings
 * @param {Object} updates - Partial settings to update
 * @returns {Object} Updated settings
 */
function updateSettings(updates) {
    const current = loadSettings();

    // Optional improvement: Reset daily reminder state if reminder time changed
    // This allows the reminder to fire again at the new time
    if (updates.reminderTime && updates.reminderTime !== current.reminderTime) {
        const state = loadNotificationState();
        state.habitReminderLastSent = null;
        saveNotificationState(state);
        console.log('ℹ️  Reminder time changed - reset daily reminder state');
    }

    const updated = { ...current, ...updates };
    saveSettings(updated);
    return updated;
}

/**
 * Get the configured reminder time
 * @returns {string} Time in HH:MM format
 */
function getReminderTime() {
    const settings = loadSettings();
    return settings.reminderTime;
}

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Load all subscriptions from file
 * @returns {Array} Array of push subscriptions
 */
function loadSubscriptions() {
    try {
        if (fs.existsSync(SUBS_FILE)) {
            const data = fs.readFileSync(SUBS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading subscriptions:', error.message);
    }
    return [];
}

/**
 * Save subscriptions to file with atomic write
 * @param {Array} subscriptions - Array of push subscriptions
 */
function saveSubscriptions(subscriptions) {
    try {
        const tempFile = SUBS_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(subscriptions, null, 2));
        fs.renameSync(tempFile, SUBS_FILE);
    } catch (error) {
        console.error('Error saving subscriptions:', error.message);
        throw error;
    }
}

/**
 * Add a new subscription
 * @param {Object} subscription - Push subscription object
 * @returns {boolean} True if added, false if already exists
 */
function addSubscription(subscription) {
    const subs = loadSubscriptions();

    // Check for duplicate by endpoint
    const exists = subs.some(s => s.endpoint === subscription.endpoint);
    if (exists) {
        return false;
    }

    subs.push({
        ...subscription,
        createdAt: new Date().toISOString()
    });

    saveSubscriptions(subs);
    return true;
}

/**
 * Remove a subscription by endpoint
 * @param {string} endpoint - Subscription endpoint URL
 * @returns {boolean} True if removed, false if not found
 */
function removeSubscription(endpoint) {
    const subs = loadSubscriptions();
    const initialLength = subs.length;

    const filtered = subs.filter(s => s.endpoint !== endpoint);

    if (filtered.length < initialLength) {
        saveSubscriptions(filtered);
        return true;
    }

    return false;
}

/**
 * Get all active subscriptions
 * @returns {Array} Array of subscriptions
 */
function getAllSubscriptions() {
    return loadSubscriptions();
}

// ============================================================================
// Notification State (for deduplication)
// ============================================================================

/**
 * Default notification state
 */
const DEFAULT_STATE = {
    habitReminderLastSent: null,
    taskNotifications: {}
};

/**
 * Load notification state from file
 * @returns {Object} Notification state
 */
function loadNotificationState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const data = fs.readFileSync(STATE_FILE, 'utf8');
            return { ...DEFAULT_STATE, ...JSON.parse(data) };
        }
    } catch (error) {
        console.error('Error loading notification state:', error.message);
    }
    return { ...DEFAULT_STATE };
}

/**
 * Save notification state to file
 * @param {Object} state - Notification state
 */
function saveNotificationState(state) {
    try {
        const tempFile = STATE_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(state, null, 2));
        fs.renameSync(tempFile, STATE_FILE);
    } catch (error) {
        console.error('Error saving notification state:', error.message);
    }
}

/**
 * Check if habit reminder was already sent today
 * @returns {boolean}
 */
function wasHabitReminderSentToday() {
    const state = loadNotificationState();
    const today = new Date().toISOString().split('T')[0];
    return state.habitReminderLastSent === today;
}

/**
 * Mark habit reminder as sent today
 */
function markHabitReminderSent() {
    const state = loadNotificationState();
    state.habitReminderLastSent = new Date().toISOString().split('T')[0];
    saveNotificationState(state);
}

/**
 * Check if task notification was already sent
 * @param {string} taskId - Task ID
 * @returns {boolean}
 */
function wasTaskNotificationSent(taskId) {
    const state = loadNotificationState();
    return !!state.taskNotifications[taskId];
}

/**
 * Mark task notification as sent
 * @param {string} taskId - Task ID
 */
function markTaskNotificationSent(taskId) {
    const state = loadNotificationState();
    state.taskNotifications[taskId] = Date.now();
    saveNotificationState(state);
}

/**
 * Clean up old task notification records (older than 7 days)
 */
function cleanupOldTaskNotifications() {
    const state = loadNotificationState();
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const cleaned = {};
    for (const [taskId, timestamp] of Object.entries(state.taskNotifications)) {
        if (timestamp > weekAgo) {
            cleaned[taskId] = timestamp;
        }
    }

    state.taskNotifications = cleaned;
    saveNotificationState(state);
}

module.exports = {
    // Subscriptions
    loadSubscriptions,
    saveSubscriptions,
    addSubscription,
    removeSubscription,
    getAllSubscriptions,

    // Notification State
    loadNotificationState,
    saveNotificationState,
    wasHabitReminderSentToday,
    markHabitReminderSent,
    wasTaskNotificationSent,
    markTaskNotificationSent,
    cleanupOldTaskNotifications,

    // Settings
    loadSettings,
    saveSettings,
    updateSettings,
    getReminderTime
};
