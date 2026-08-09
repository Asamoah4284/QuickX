import axios from 'axios';
import { API_URL } from '../config/api';

const DISMISS_INSTALL_KEY = 'qx_install_banner_dismissed';
const PUSH_PROMPTED_KEY = 'qx_push_prompted';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission() {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function fetchVapidPublicKey() {
  const fromEnv = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (fromEnv) return fromEnv;
  const { data } = await axios.get(`${API_URL}/api/notifications/vapid-public-key`);
  return data?.publicKey || '';
}

export async function getSwRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  const ready = await navigator.serviceWorker.ready;
  // Prefer the controlling SW; fall back to ready registration
  if (navigator.serviceWorker.controller) {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.find((r) => r.active) || ready;
  }
  return ready;
}

async function saveSubscriptionToServer(subscription) {
  const token = localStorage.getItem('authToken');
  if (!token || !subscription) return;
  await axios.post(
    `${API_URL}/api/notifications/push-subscribe`,
    {
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

/**
 * Request permission (if needed), create a PushSubscription, and register it
 * with the backend so the phone can receive OS notifications while closed.
 */
export async function subscribeUserToPush() {
  if (!pushSupported()) {
    throw new Error('Push notifications are not supported on this device');
  }

  // iOS only delivers Web Push from the installed Home Screen app
  if (isIosDevice() && !isStandaloneDisplay()) {
    throw new Error(
      'On iPhone, open Quick-X from your Home Screen icon, then turn on notifications'
    );
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted');
  }

  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('You must be signed in to enable notifications');

  const vapidKey = await fetchVapidPublicKey();
  if (!vapidKey) throw new Error('Push is not configured on the server');

  const registration = await getSwRegistration();
  if (!registration?.pushManager) {
    throw new Error('Service worker is not ready — refresh and try again');
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  await saveSubscriptionToServer(subscription);
  localStorage.setItem(PUSH_PROMPTED_KEY, '1');
  return subscription;
}

/**
 * If the user already granted permission, re-sync the subscription to the
 * server (e.g. after login). Does not show a permission prompt.
 */
export async function ensurePushSubscription() {
  try {
    if (!pushSupported()) return false;
    if (!localStorage.getItem('authToken')) return false;
    if (Notification.permission !== 'granted') return false;
    if (isIosDevice() && !isStandaloneDisplay()) return false;

    const registration = await getSwRegistration();
    if (!registration?.pushManager) return false;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const vapidKey = await fetchVapidPublicKey();
      if (!vapidKey) return false;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    await saveSubscriptionToServer(subscription);
    return true;
  } catch (err) {
    console.warn('ensurePushSubscription:', err?.message || err);
    return false;
  }
}

/**
 * On logout: remove this device from the server only.
 * Keep the browser PushSubscription so re-login can restore OS push quickly.
 */
export async function clearServerPushSubscription() {
  if (!pushSupported()) return;
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    const registration = await getSwRegistration();
    const subscription = registration
      ? await registration.pushManager.getSubscription()
      : null;
    const endpoint = subscription?.endpoint;

    await axios.delete(`${API_URL}/api/notifications/push-subscribe`, {
      headers: { Authorization: `Bearer ${token}` },
      data: endpoint ? { endpoint } : {},
    });
  } catch {
    /* ignore when already logged out / offline */
  }
}

/** @deprecated use clearServerPushSubscription — kept for call sites */
export async function unsubscribeUserFromPush() {
  return clearServerPushSubscription();
}

export function wasInstallBannerDismissed() {
  return localStorage.getItem(DISMISS_INSTALL_KEY) === '1';
}

export function dismissInstallBanner() {
  localStorage.setItem(DISMISS_INSTALL_KEY, '1');
}

export function wasPushPrompted() {
  return localStorage.getItem(PUSH_PROMPTED_KEY) === '1';
}
