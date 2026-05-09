import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

// --- OFFLINE RESILIENCE ---
// Swallow unhandled Firebase / network rejections that occur when the user is
// offline so they don't crash the app or trigger the ErrorBoundary. Cached
// Firestore data continues to work via IndexedDB persistence.
const isNetworkLikeError = (reason: any): boolean => {
  if (!reason) return false;
  const code = reason.code || reason.name || '';
  const msg = (reason.message || String(reason)).toLowerCase();
  return (
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    code === 'deadline-exceeded' ||
    code === 'cancelled' ||
    code === 'AbortError' ||
    code === 'NetworkError' ||
    msg.includes('network') ||
    msg.includes('offline') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('client is offline')
  );
};

window.addEventListener('unhandledrejection', (event) => {
  if (isNetworkLikeError(event.reason)) {
    console.warn('[offline] suppressed network rejection:', event.reason);
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  if (isNetworkLikeError(event.error || event.message)) {
    console.warn('[offline] suppressed network error:', event.error || event.message);
    event.preventDefault();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
  </React.StrictMode>
);
