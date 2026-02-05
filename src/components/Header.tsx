"use client";

import { Rocket, Share, FileDown, Printer, Code, RotateCcw, RotateCw, Scissors, Copy, Clipboard, FileText, Maximize, Eye, Play, Terminal } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
    onExportPdf?: () => void;
    onExportWord?: () => void;
    onExportHtml?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onSelectAll?: () => void;
    onClearFormatting?: () => void;
    onShowWordCount?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
}

// Dropdown Menu Component
function DropdownMenu({
    label,
    items,
    isOpen,
    onToggle,
    onClose
}: {
    label: string;
    items: { label: string; icon?: React.ReactNode; shortcut?: string; onClick: () => void; divider?: boolean; disabled?: boolean }[];
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
}) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={onToggle}
                className={`text-xs font-medium px-2 py-1 rounded transition-colors ${isOpen ? 'bg-[#094771] text-white' : 'text-[#858585] hover:text-[#cccccc]'
                    }`}
            >
                {label}
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-[#252526] border border-[#3c3c3c] rounded-md shadow-xl z-50">
                    {items.map((item, index) => (
                        item.divider ? (
                            <div key={index} className="h-px bg-[#3c3c3c] my-1" />
                        ) : (
                            <button
                                key={index}
                                onClick={() => {
                                    if (!item.disabled) {
                                        item.onClick();
                                        onClose();
                                    }
                                }}
                                disabled={item.disabled}
                                className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2.5 ${item.disabled
                                        ? 'text-[#6e6e6e] cursor-not-allowed'
                                        : 'text-[#cccccc] hover:bg-[#094771]'
                                    }`}
                            >
                                {item.icon && <span className="w-3.5 h-3.5 flex items-center justify-center opacity-70">{item.icon}</span>}
                                <span className="flex-1">{item.label}</span>
                                {item.shortcut && (
                                    <span className="text-[10px] text-[#858585]">{item.shortcut}</span>
                                )}
                            </button>
                        )
                    ))}
                </div>
            )}
        </div>
    );
}

export function Header({
    onExportPdf,
    onExportWord,
    onExportHtml,
    onUndo,
    onRedo,
    onSelectAll,
    onClearFormatting,
    onShowWordCount,
    canUndo = false,
    canRedo = false,
}: HeaderProps) {
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const iconSize = 12;

    const fileMenuItems = [
        {
            label: 'Export as PDF',
            icon: <FileDown size={iconSize} />,
            shortcut: '⌘P',
            onClick: onExportPdf || (() => window.print()),
        },
        {
            label: 'Export as Word',
            icon: <FileText size={iconSize} />,
            shortcut: '⌘⇧W',
            onClick: onExportWord || (() => { }),
        },
        {
            label: 'Export as HTML',
            icon: <Code size={iconSize} />,
            onClick: onExportHtml || (() => { }),
        },
        { divider: true, label: '', onClick: () => { } },
        {
            label: 'Print',
            icon: <Printer size={iconSize} />,
            shortcut: '⌘P',
            onClick: () => window.print(),
        },
    ];

    const editMenuItems = [
        {
            label: 'Undo',
            icon: <RotateCcw size={iconSize} />,
            shortcut: '⌘Z',
            onClick: onUndo || (() => document.execCommand('undo')),
            disabled: !canUndo,
        },
        {
            label: 'Redo',
            icon: <RotateCw size={iconSize} />,
            shortcut: '⌘⇧Z',
            onClick: onRedo || (() => document.execCommand('redo')),
            disabled: !canRedo,
        },
        { divider: true, label: '', onClick: () => { } },
        {
            label: 'Cut',
            icon: <Scissors size={iconSize} />,
            shortcut: '⌘X',
            onClick: () => document.execCommand('cut'),
        },
        {
            label: 'Copy',
            icon: <Copy size={iconSize} />,
            shortcut: '⌘C',
            onClick: () => document.execCommand('copy'),
        },
        {
            label: 'Paste',
            icon: <Clipboard size={iconSize} />,
            shortcut: '⌘V',
            onClick: () => document.execCommand('paste'),
        },
        { divider: true, label: '', onClick: () => { } },
        {
            label: 'Select All',
            icon: <FileText size={iconSize} />,
            shortcut: '⌘A',
            onClick: onSelectAll || (() => document.execCommand('selectAll')),
        },
        { divider: true, label: '', onClick: () => { } },
        {
            label: 'Clear Formatting',
            onClick: onClearFormatting || (() => { }),
        },
    ];

    const viewMenuItems = [
        {
            label: 'Focus Mode',
            icon: <Maximize size={iconSize} />,
            onClick: () => {
                const editorEl = document.querySelector('.tiptap-editor');
                editorEl?.classList.toggle('focus-mode');
            },
        },
        { divider: true, label: '', onClick: () => { } },
        {
            label: 'Show Word Count',
            icon: <Eye size={iconSize} />,
            onClick: onShowWordCount || (() => { }),
        },
    ];

    const runMenuItems = [
        {
            label: 'Run Document',
            icon: <Play size={iconSize} />,
            shortcut: '⌘⏎',
            onClick: () => { },
        },
        {
            label: 'Open Terminal',
            icon: <Terminal size={iconSize} />,
            shortcut: '⌘`',
            onClick: () => { },
        },
    ];

    return (
        <header className="flex-none flex items-center justify-between whitespace-nowrap border-b border-[#3c3c3c] bg-[#323233] px-4 py-2 z-20">
            <div className="flex items-center gap-3 text-[#cccccc]">
                <div className="flex items-center justify-center size-7 bg-[#0078d4]/20 rounded text-[#0078d4]">
                    <span className="material-symbols-outlined text-[18px]">terminal</span>
                </div>
                <h2 className="text-[#cccccc] text-sm font-semibold leading-tight">
                    Workspace
                </h2>
            </div>
            <div className="flex flex-1 justify-end gap-4 items-center">
                <div className="hidden md:flex items-center gap-1">
                    <DropdownMenu
                        label="File"
                        items={fileMenuItems}
                        isOpen={openMenu === 'file'}
                        onToggle={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
                        onClose={() => setOpenMenu(null)}
                    />
                    <DropdownMenu
                        label="Edit"
                        items={editMenuItems}
                        isOpen={openMenu === 'edit'}
                        onToggle={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
                        onClose={() => setOpenMenu(null)}
                    />
                    <DropdownMenu
                        label="View"
                        items={viewMenuItems}
                        isOpen={openMenu === 'view'}
                        onToggle={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
                        onClose={() => setOpenMenu(null)}
                    />
                    <DropdownMenu
                        label="Run"
                        items={runMenuItems}
                        isOpen={openMenu === 'run'}
                        onToggle={() => setOpenMenu(openMenu === 'run' ? null : 'run')}
                        onClose={() => setOpenMenu(null)}
                    />
                </div>
                <div className="h-4 w-px bg-[#3c3c3c] hidden md:block"></div>
                <div className="flex gap-2">
                    <button className="flex items-center justify-center overflow-hidden rounded h-7 px-3 bg-[#0078d4] hover:bg-[#1a85dc] transition-colors text-white text-xs font-medium">
                        <span className="truncate flex items-center gap-1.5">
                            <Rocket className="w-3.5 h-3.5" />
                            Deploy
                        </span>
                    </button>
                    <button className="flex items-center justify-center overflow-hidden rounded h-7 px-3 bg-[#3c3c3c] hover:bg-[#4a4a4a] transition-colors text-[#cccccc] text-xs font-medium">
                        <Share className="w-3.5 h-3.5 mr-1.5" />
                        <span className="truncate">Share</span>
                    </button>
                </div>
                <div className="bg-center bg-no-repeat bg-cover rounded-full size-7 border border-[#3c3c3c] cursor-pointer hover:border-[#0078d4] transition-all bg-gradient-to-br from-[#0078d4] to-[#68217a]"></div>
            </div>
        </header>
    );
}
