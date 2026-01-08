/**
 * Dayplain Push Notification Server
 * Express backend for Web Push notifications with cron scheduling
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const cron = require('node-cron');

const {
    addSubscription,
    removeSubscription,
    getAllSubscriptions,
    wasHabitReminderSentToday,
    markHabitReminderSent,
    wasTaskNotificationSent,
    markTaskNotificationSent,
    cleanupOldTaskNotifications,
    loadSettings,
    updateSettings,
    getReminderTime
} = require('./subscriptions');

// ============================================================================
// Configuration
// ============================================================================

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// VAPID keys for Web Push
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@dayplain.local';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('⚠️  VAPID keys not configured!');
    console.error('Run: npm run generate-vapid');
    console.error('Then copy the output to your .env file');
    process.exit(1);
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ============================================================================
// Express App
// ============================================================================

const app = express();

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get VAPID public key (needed by frontend for subscription)
app.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// ============================================================================
// Subscription Endpoints
// ============================================================================

/**
 * POST /subscribe
 * Store a push subscription
 */
app.post('/subscribe', (req, res) => {
    const subscription = req.body;

    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid subscription' });
    }

    const added = addSubscription(subscription);

    if (added) {
        console.log('✅ New subscription added');
        res.status(201).json({ message: 'Subscription added' });
    } else {
        console.log('ℹ️  Subscription already exists');
        res.status(200).json({ message: 'Subscription already exists' });
    }
});

/**
 * POST /unsubscribe
 * Remove a push subscription
 */
app.post('/unsubscribe', (req, res) => {
    const { endpoint } = req.body;

    if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint required' });
    }

    const removed = removeSubscription(endpoint);

    if (removed) {
        console.log('✅ Subscription removed');
        res.status(200).json({ message: 'Subscription removed' });
    } else {
        console.log('ℹ️  Subscription not found');
        res.status(404).json({ message: 'Subscription not found' });
    }
});

/**
 * POST /send-notification
 * Test endpoint to send a notification to all subscribers
 */
app.post('/send-notification', async (req, res) => {
    const { title, body, data } = req.body;

    if (!title || !body) {
        return res.status(400).json({ error: 'Title and body required' });
    }

    const payload = JSON.stringify({
        title,
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: data || {}
    });

    const results = await sendToAllSubscribers(payload);
    res.json(results);
});

// ============================================================================
// Settings Endpoints
// ============================================================================

/**
 * GET /settings
 * Get current notification settings
 */
app.get('/settings', (req, res) => {
    const settings = loadSettings();
    res.json(settings);
});

/**
 * PUT /settings
 * Update notification settings
 */
app.put('/settings', (req, res) => {
    const updates = req.body;

    // Validate reminder time format (HH:MM)
    if (updates.reminderTime && !/^\d{2}:\d{2}$/.test(updates.reminderTime)) {
        return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
    }

    const updated = updateSettings(updates);
    console.log('✅ Settings updated:', updates);
    res.json(updated);
});

// ============================================================================
// Push Notification Helpers
// ============================================================================

/**
 * Send a notification to all subscribers
 * @param {string} payload - JSON stringified notification payload
 * @returns {Object} Results with success/failure counts
 */
async function sendToAllSubscribers(payload) {
    const subscriptions = getAllSubscriptions();
    let success = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
        try {
            await webpush.sendNotification(subscription, payload);
            success++;
        } catch (error) {
            console.error('Push failed:', error.message);
            failed++;

            // Remove invalid subscriptions (410 Gone or 404 Not Found)
            if (error.statusCode === 410 || error.statusCode === 404) {
                console.log('Removing invalid subscription');
                removeSubscription(subscription.endpoint);
            }
        }
    }

    console.log(`📤 Sent: ${success} success, ${failed} failed`);
    return { success, failed, total: subscriptions.length };
}

/**
 * Send habit reminder notification
 */
async function sendHabitReminder() {
    if (wasHabitReminderSentToday()) {
        console.log('ℹ️  Habit reminder already sent today');
        return;
    }

    const subscriptions = getAllSubscriptions();
    if (subscriptions.length === 0) {
        console.log('ℹ️  No subscribers for habit reminder');
        return;
    }

    const payload = JSON.stringify({
        title: 'Daily Check-in',
        body: 'A quick check-in: you still have habits left today.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'habit-reminder',
        data: { type: 'habit-reminder' }
    });

    await sendToAllSubscribers(payload);
    markHabitReminderSent();
    console.log('✅ Habit reminder sent');
}

/**
 * Check for tasks due soon and send reminders
 * Note: In a real implementation, this would query the frontend's task data
 * For now, this is a placeholder that the frontend can trigger
 */
async function checkTasksDueSoon() {
    // This function would need task data from the frontend
    // For v1, task reminders are triggered when the frontend sends task data
    console.log('🔍 Task due check running...');
}

// ============================================================================
// Endpoint to receive task data and send reminders
// ============================================================================

/**
 * POST /check-tasks
 * Receive task data from frontend and send reminders for due tasks
 */
app.post('/check-tasks', async (req, res) => {
    const { tasks } = req.body;

    if (!Array.isArray(tasks)) {
        return res.status(400).json({ error: 'Tasks array required' });
    }

    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    let sent = 0;

    for (const task of tasks) {
        // Only High or Critical priority
        if (task.priority !== 'High' && task.priority !== 'Critical') {
            continue;
        }

        // Skip completed tasks
        if (task.status === 'Completed') {
            continue;
        }

        // Skip if no due date
        if (!task.dueDate) {
            continue;
        }

        // Check if due within 30 minutes
        const dueTime = new Date(task.dueDate).getTime();
        const timeUntilDue = dueTime - now;

        if (timeUntilDue > 0 && timeUntilDue <= thirtyMinutes) {
            // Skip if already notified
            if (wasTaskNotificationSent(task.id)) {
                continue;
            }

            const payload = JSON.stringify({
                title: 'Task Due Soon',
                body: `Task "${task.title}" is due in ${Math.round(timeUntilDue / 60000)} minutes.`,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: `task-${task.id}`,
                data: { type: 'task-reminder', taskId: task.id }
            });

            await sendToAllSubscribers(payload);
            markTaskNotificationSent(task.id);
            sent++;
        }
    }

    res.json({ sent });
});

// ============================================================================
// Cron Jobs
// ============================================================================

// Daily habit reminder - runs every minute and checks if it's within the configured time window
cron.schedule('* * * * *', async () => {
    const settings = loadSettings();

    // Skip if habit reminders are disabled
    if (!settings.habitRemindersEnabled) return;

    // Get current time in HH:MM format
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
    const reminderTime = settings.reminderTime || '20:00';

    // Only trigger if within ±1 minute of configured time (prevents race condition misses)
    if (!isWithinReminderWindow(currentTime, reminderTime)) return;

    // Check quiet hours
    if (settings.quietHoursEnabled) {
        const start = settings.quietHoursStart || '22:00';
        const end = settings.quietHoursEnd || '08:00';
        if (isInQuietHours(currentTime, start, end)) {
            console.log('🤫 Quiet hours - skipping notification');
            return;
        }
    }

    console.log('⏰ Running daily habit reminder...');
    await sendHabitReminder();
}, {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
});

/**
 * Check if current time is within reminder window (±1 minute tolerance)
 * Prevents missed reminders due to cron timing or server startup delays
 */
function isWithinReminderWindow(currentTime, targetTime) {
    const [ch, cm] = currentTime.split(':').map(Number);
    const [th, tm] = targetTime.split(':').map(Number);

    const currentMinutes = ch * 60 + cm;
    const targetMinutes = th * 60 + tm;

    return Math.abs(currentMinutes - targetMinutes) <= 1;
}

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(current, start, end) {
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
        return current >= start || current < end;
    }
    return current >= start && current < end;
}

// Task notification cleanup every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ Running task notification cleanup...');
    // Note: For v1, task reminders are triggered via POST /check-tasks from frontend
    // This cron only cleans up old deduplication records
    cleanupOldTaskNotifications();
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
    console.log('');
    console.log('🔔 Dayplain Push Notification Server');
    console.log('====================================');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌐 CORS enabled for: ${FRONTEND_URL}`);
    console.log(`📋 Loaded ${getAllSubscriptions().length} subscription(s)`);
    console.log('');
    console.log('Endpoints:');
    console.log('  GET  /health           - Health check');
    console.log('  GET  /vapid-public-key - Get VAPID public key');
    console.log('  POST /subscribe        - Add subscription');
    console.log('  POST /unsubscribe      - Remove subscription');
    console.log('  POST /send-notification - Send test notification');
    console.log('  POST /check-tasks      - Check tasks and send reminders');
    console.log('');
    console.log('Cron jobs:');
    console.log('  🕗 Daily habit reminder at 8:00 PM');
    console.log('  🔄 Task cleanup every 5 minutes');
    console.log('');
});
