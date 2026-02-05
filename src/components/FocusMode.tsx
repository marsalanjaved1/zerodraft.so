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
        <div className="fixed inset-0 z-50 bg-[#1e1e1e]">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-md hover:bg-[#3c3c3c] text-[#858585] hover:text-[#cccccc] transition-colors z-50"
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
