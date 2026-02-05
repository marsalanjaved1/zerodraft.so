'use client';

import { useEffect } from 'react';
import { useNetworkStatus } from '@/lib/hooks/use-performance';

/**
 * Service Worker registration and offline support
 */
export function OfflineProvider({ children }: { children: React.ReactNode }) {
    const isOnline = useNetworkStatus();

    useEffect(() => {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/service-worker.js')
                .then((registration) => {
                    console.log('Service Worker registered:', registration.scope);

                    // Check for updates
                    registration.update();
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });
        }

        // Request persistent storage
        if ('storage' in navigator && 'persist' in navigator.storage) {
            navigator.storage.persist().then((persistent) => {
                if (persistent) {
                    console.log('Storage will persist');
                } else {
                    console.log('Storage may be cleared by the browser');
                }
            });
        }
    }, []);

    return (
        <>
            {children}

            {/* Offline indicator */}
            {!isOnline && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-yellow-900/90 text-yellow-100 rounded-lg shadow-lg backdrop-blur-sm border border-yellow-700/50">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">You're offline</span>
                    <span className="text-xs opacity-75">Changes will sync when you're back online</span>
                </div>
            )}
        </>
    );
}

/**
 * Hook to queue offline requests
 */
export function useOfflineQueue() {
    const isOnline = useNetworkStatus();

    const queueRequest = async (request: Request) => {
        if (isOnline) {
            // Online - execute immediately
            return fetch(request);
        }

        // Offline - queue for background sync
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            // @ts-ignore - Background Sync API types not fully supported
            if ('sync' in registration) {
                // @ts-ignore
                await registration.sync.register('sync-documents');
            }

            // Store request in IndexedDB
            // Implementation depends on your data storage
            console.log('Request queued for sync');
        }
    };

    return { queueRequest, isOnline };
}
