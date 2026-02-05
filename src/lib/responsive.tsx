'use client';

/**
 * Mobile-responsive utilities and components
 */

import { useMediaQuery } from '@/lib/hooks/use-performance';

// Breakpoints matching Tailwind defaults
export const BREAKPOINTS = {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
    lg: '(min-width: 1024px)',
    xl: '(min-width: 1280px)',
    '2xl': '(min-width: 1536px)',
} as const;

/**
 * Hook to detect device type
 */
export function useDeviceType() {
    const isMobile = !useMediaQuery(BREAKPOINTS.md);
    const isTablet = useMediaQuery(BREAKPOINTS.md) && !useMediaQuery(BREAKPOINTS.lg);
    const isDesktop = useMediaQuery(BREAKPOINTS.lg);

    return {
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice: typeof window !== 'undefined' && 'ontouchstart' in window
    };
}

/**
 * Responsive sidebar that collapses on mobile
 */
export function ResponsiveSidebar({
    children,
    isOpen,
    onClose,
}: {
    children: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
}) {
    const { isMobile } = useDeviceType();

    if (!isMobile) {
        // Desktop: always visible sidebar
        return <aside className="w-64 flex-none">{children}</aside>;
    }

    // Mobile: overlay drawer
    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <aside
                className={`fixed inset-y-0 left-0 w-64 bg-[#252526] transform transition-transform duration-300 z-50 lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {children}
            </aside>
        </>
    );
}

/**
 * Responsive container with proper padding
 */
export function ResponsiveContainer({ children }: { children: React.ReactNode }) {
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {children}
        </div>
    );
}

/**
 * Responsive grid
 */
export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {children}
        </div>
    );
}

/**
 * Touch-optimized button for mobile
 */
export function TouchButton({
    children,
    onClick,
    className = '',
}: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
}) {
    const { isTouchDevice } = useDeviceType();

    return (
        <button
            onClick={onClick}
            className={`${className} ${isTouchDevice ? 'min-h-[44px] min-w-[44px]' : ''
                } touch-manipulation`}
        >
            {children}
        </button>
    );
}

/**
 * Responsive text sizes
 */
export const responsiveText = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    base: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl',
    '2xl': 'text-2xl sm:text-3xl',
    '3xl': 'text-3xl sm:text-4xl',
} as const;

/**
 * Viewport height fix for mobile browsers (fixes 100vh issue)
 */
export function useViewportHeight() {
    if (typeof window === 'undefined') return;

    const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    return () => {
        window.removeEventListener('resize', setVH);
        window.removeEventListener('orientationchange', setVH);
    };
}

/**
 * Mobile menu component
 */
export function MobileMenu({
    isOpen,
    onClose,
    children,
}: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={onClose}
                />
            )}

            {/* Menu */}
            <div
                className={`fixed inset-x-0 bottom-0 bg-[#252526] border-t border-[#3c3c3c] rounded-t-2xl shadow-2xl transform transition-transform duration-300 z-50 max-h-[80vh] overflow-y-auto ${isOpen ? 'translate-y-0' : 'translate-y-full'
                    }`}
            >
                {/* Handle */}
                <div className="flex justify-center py-3">
                    <div className="w-12 h-1 bg-[#858585] rounded-full" />
                </div>

                {children}
            </div>
        </>
    );
}

/**
 * Safe area insets for notched devices
 */
export function useSafeArea() {
    return {
        top: 'env(safe-area-inset-top)',
        right: 'env(safe-area-inset-right)',
        bottom: 'env(safe-area-inset-bottom)',
        left: 'env(safe-area-inset-left)',
    };
}
