'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, GripVertical } from 'lucide-react';

interface SplitPaneProps {
    leftContent: React.ReactNode;
    rightContent: React.ReactNode;
    leftHeader?: React.ReactNode;
    rightHeader?: React.ReactNode;
    onCloseRight?: () => void;
    initialSplit?: number; // Percentage for left pane (default 50)
}

export function SplitPane({
    leftContent,
    rightContent,
    leftHeader,
    rightHeader,
    onCloseRight,
    initialSplit = 50,
}: SplitPaneProps) {
    const [splitPosition, setSplitPosition] = useState(initialSplit);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle drag
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = (x / rect.width) * 100;

            // Clamp between 20% and 80%
            setSplitPosition(Math.max(20, Math.min(80, percentage)));
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div
            ref={containerRef}
            className="flex flex-1 h-full overflow-hidden"
            style={{ cursor: isDragging ? 'col-resize' : 'default' }}
        >
            {/* Left Pane */}
            <div
                className="flex flex-col overflow-hidden"
                style={{ width: `${splitPosition}%` }}
            >
                {leftHeader && (
                    <div className="flex items-center px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c] text-xs text-[#cccccc]">
                        {leftHeader}
                    </div>
                )}
                <div className="flex-1 overflow-auto">
                    {leftContent}
                </div>
            </div>

            {/* Resize Handle */}
            <div
                onMouseDown={handleMouseDown}
                className={`
                    w-1 bg-[#3c3c3c] hover:bg-[#007acc] cursor-col-resize
                    flex items-center justify-center
                    transition-colors duration-150
                    ${isDragging ? 'bg-[#007acc]' : ''}
                `}
            >
                <div className="absolute p-0.5 rounded bg-[#3c3c3c] hover:bg-[#4c4c4c]">
                    <GripVertical className="w-3 h-3 text-[#858585]" />
                </div>
            </div>

            {/* Right Pane */}
            <div
                className="flex flex-col overflow-hidden"
                style={{ width: `${100 - splitPosition}%` }}
            >
                {(rightHeader || onCloseRight) && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c] text-xs text-[#cccccc]">
                        <span>{rightHeader}</span>
                        {onCloseRight && (
                            <button
                                onClick={onCloseRight}
                                className="p-0.5 hover:bg-[#3c3c3c] rounded"
                                title="Close split view"
                            >
                                <X className="w-3.5 h-3.5 text-[#858585]" />
                            </button>
                        )}
                    </div>
                )}
                <div className="flex-1 overflow-auto">
                    {rightContent}
                </div>
            </div>
        </div>
    );
}
