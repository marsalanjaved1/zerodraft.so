'use client';

import { X } from 'lucide-react';
import { useEffect, useCallback } from 'react';

interface FocusModeProps {
    isActive: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export function FocusMode({ isActive, onClose, children }: FocusModeProps) {
    // Escape key to exit focus mode
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isActive, onClose]);

    if (!isActive) return null;

    return (
        <div className="fixed inset-0 z-50 bg-white">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors z-50"
                title="Exit Focus Mode (Escape)"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Centered content with max width */}
            <div className="h-full overflow-y-auto flex justify-center">
                <div className="w-full max-w-2xl px-8 py-16">
                    {children}
                </div>
            </div>
        </div>
    );
}
