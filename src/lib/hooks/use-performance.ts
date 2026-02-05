/**
 * Performance optimization hooks for zerodraft.so
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Debounce hook for performance optimization
 * Delays function execution until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked
 */
export function useDebounce<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): (...args: Parameters<T>) => void {
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                callback(...args);
            }, delay);
        },
        [callback, delay]
    );
}

/**
 * Throttle hook for performance optimization
 * Ensures function is not called more than once every wait milliseconds
 */
export function useThrottle<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): (...args: Parameters<T>) => void {
    const lastRunRef = useRef(0);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return useCallback(
        (...args: Parameters<T>) => {
            const now = Date.now();
            const timeSinceLastRun = now - lastRunRef.current;

            if (timeSinceLastRun >= delay) {
                callback(...args);
                lastRunRef.current = now;
            } else {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                timeoutRef.current = setTimeout(() => {
                    callback(...args);
                    lastRunRef.current = Date.now();
                }, delay - timeSinceLastRun);
            }
        },
        [callback, delay]
    );
}

/**
 * Intersection Observer hook for lazy loading
 * Detects when element enters viewport
 */
export function useIntersectionObserver(
    callback: (entry: IntersectionObserverEntry) => void,
    options?: IntersectionObserverInit
) {
    const targetRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const target = targetRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(([entry]) => {
            callback(entry);
        }, options);

        observer.observe(target);

        return () => {
            observer.disconnect();
        };
    }, [callback, options]);

    return targetRef;
}

/**
 * Virtual scroll hook for large lists
 * Only renders visible items for performance
 */
export function useVirtualScroll<T>(
    items: T[],
    itemHeight: number,
    containerHeight: number,
    overscan: number = 3
) {
    const scrollTop = useRef(0);

    const visibleRange = useCallback(() => {
        const start = Math.max(0, Math.floor(scrollTop.current / itemHeight) - overscan);
        const end = Math.min(
            items.length,
            Math.ceil((scrollTop.current + containerHeight) / itemHeight) + overscan
        );

        return { start, end };
    }, [items.length, itemHeight, containerHeight, overscan]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
        scrollTop.current = e.currentTarget.scrollTop;
    }, []);

    const { start, end } = visibleRange();

    return {
        visibleItems: items.slice(start, end),
        totalHeight: items.length * itemHeight,
        offsetY: start * itemHeight,
        handleScroll,
    };
}

/**
 * Idle callback hook
 * Executes callback during browser idle time
 */
export function useIdleCallback(callback: () => void, deps: any[] = []) {
    useEffect(() => {
        if ('requestIdleCallback' in window) {
            const handle = requestIdleCallback(callback);
            return () => cancelIdleCallback(handle);
        } else {
            // Fallback for browsers without requestIdleCallback
            const timeout = setTimeout(callback, 1);
            return () => clearTimeout(timeout);
        }
    }, deps);
}

/**
 * Media query hook for responsive design
 */
export function useMediaQuery(query: string): boolean {
    const getMatches = (query: string): boolean => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    };

    const [matches, setMatches] = useState(() => getMatches(query));

    useEffect(() => {
        const matchMedia = window.matchMedia(query);
        const handleChange = () => setMatches(getMatches(query));

        // Trigger initially
        handleChange();

        // Listen for changes
        matchMedia.addEventListener('change', handleChange);

        return () => {
            matchMedia.removeEventListener('change', handleChange);
        };
    }, [query]);

    return matches;
}

/**
 * Network status hook
 * Detects online/offline status
 */
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

/**
 * Local storage hook with sync across tabs
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = useCallback(
        (value: T | ((val: T) => T)) => {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                }
            } catch (error) {
                console.error(error);
            }
        },
        [key, storedValue]
    );

    // Sync across tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue) {
                setStoredValue(JSON.parse(e.newValue));
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key]);

    return [storedValue, setValue] as const;
}

// Fix missing import
import { useState } from 'react';
