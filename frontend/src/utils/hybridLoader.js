import { BACKEND_URL } from "@/config/api";
/**
 * Hybrid App Loader for HeartLink
 * - First loads from local cache (instant)
 * - Background checks server for updates
 * - Auto-refreshes if new version found
 */

const APP_VERSION_KEY = 'heartlink_app_version';
const LAST_CHECK_KEY = 'heartlink_last_update_check';
const CHECK_INTERVAL = 30 * 60 * 1000; // Check every 30 minutes

export async function checkForAppUpdate() {
  try {
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const now = Date.now();
    
    // Don't check too frequently
    if (lastCheck && (now - parseInt(lastCheck)) < CHECK_INTERVAL) {
      return;
    }
    
    localStorage.setItem(LAST_CHECK_KEY, now.toString());
    
    // Fetch version from server
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      cache: 'no-store'
    });
    
    if (!response.ok) return;
    
    const data = await response.json();
    const serverVersion = data.version || data.timestamp || '';
    const localVersion = localStorage.getItem(APP_VERSION_KEY);
    
    if (localVersion && serverVersion && localVersion !== serverVersion) {
      // New version available - clear caches and reload
      console.log('[HeartLink] New version detected, updating...');
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      localStorage.setItem(APP_VERSION_KEY, serverVersion);
      
      // Soft reload - don't disrupt user if they're in a chat
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '/discover') {
        window.location.reload();
      }
    } else if (serverVersion) {
      localStorage.setItem(APP_VERSION_KEY, serverVersion);
    }
  } catch (error) {
    // Silently fail - offline or server down
    console.log('[HeartLink] Update check failed, using cached version');
  }
}

// Register Service Worker for caching
export function registerServiceWorker() {
  // Native APK ships its own bundle: a SW there serves stale index/chunks after rebuilds -> blank screen
  if (window.Capacitor?.isNativePlatform?.()) {
    try {
      navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
      window.caches?.keys?.().then(ks => ks.forEach(k => window.caches.delete(k))).catch(() => {});
    } catch (_) {}
    return;
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('[HeartLink] Service Worker registered');
        
        // Check for SW updates periodically
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('[HeartLink] New Service Worker activated');
            }
          });
        });
      })
      .catch(err => console.log('[HeartLink] SW registration failed:', err));
  }
}
