/**
 * Push Notification Service
 * Handles service worker registration, push subscription, and backend communication
 */

// Backend URL - should match server configuration
const PUSH_SERVER_URL = process.env.NEXT_PUBLIC_PUSH_SERVER_URL || 'http://localhost:3001';

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get the current notification permission state
 */
export function getPermissionState(): NotificationPermission | 'unsupported' {
    if (!isPushSupported()) {
        return 'unsupported';
    }
    return Notification.permission;
}

/**
 * Register the service worker
 * @returns ServiceWorkerRegistration or null if failed
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service workers not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });
        console.log('Service worker registered:', registration.scope);
        return registration;
    } catch (error) {
        console.error('Service worker registration failed:', error);
        return null;
    }
}

/**
 * Get the active service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        return registration;
    } catch (error) {
        console.error('Error getting service worker registration:', error);
        return null;
    }
}

/**
 * Request notification permission from user
 * MUST be called from a user interaction (click, etc.)
 */
export async function requestPermission(): Promise<NotificationPermission> {
    if (!isPushSupported()) {
        throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();
    return permission;
}

/**
 * Get VAPID public key from backend
 */
async function getVapidPublicKey(): Promise<string> {
    const response = await fetch(`${PUSH_SERVER_URL}/vapid-public-key`);
    if (!response.ok) {
        throw new Error('Failed to get VAPID public key');
    }
    const data = await response.json();
    return data.publicKey;
}

/**
 * Convert VAPID key to Uint8Array for subscription
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Subscribe to push notifications
 * @returns PushSubscription or null if failed
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
        throw new Error('Service worker not registered');
    }

    // Check permission
    if (Notification.permission !== 'granted') {
        throw new Error('Notification permission not granted');
    }

    try {
        // Get VAPID key from backend
        const vapidPublicKey = await getVapidPublicKey();
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey.buffer as ArrayBuffer
        });

        // Send subscription to backend
        const response = await fetch(`${PUSH_SERVER_URL}/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscription.toJSON())
        });

        if (!response.ok) {
            throw new Error('Failed to save subscription on server');
        }

        console.log('Push subscription successful');
        return subscription;
    } catch (error) {
        console.error('Push subscription failed:', error);
        throw error;
    }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
        return null;
    }

    try {
        return await registration.pushManager.getSubscription();
    } catch (error) {
        console.error('Error getting subscription:', error);
        return null;
    }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    const subscription = await getCurrentSubscription();
    if (!subscription) {
        return true; // Already unsubscribed
    }

    try {
        // Notify backend
        await fetch(`${PUSH_SERVER_URL}/unsubscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ endpoint: subscription.endpoint })
        });

        // Unsubscribe locally
        await subscription.unsubscribe();
        console.log('Push unsubscription successful');
        return true;
    } catch (error) {
        console.error('Push unsubscription failed:', error);
        return false;
    }
}

/**
 * Send task data to backend for due-soon checks
 */
export async function sendTasksForCheck(tasks: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    dueDate?: string;
}>): Promise<{ sent: number }> {
    try {
        const response = await fetch(`${PUSH_SERVER_URL}/check-tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tasks })
        });

        if (!response.ok) {
            throw new Error('Failed to check tasks');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending tasks for check:', error);
        return { sent: 0 };
    }
}
