"use client";

import { Menu, ChevronRight, Share2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface HeaderProps {
    workspaceName?: string;
    projectName?: string;
    documentTitle?: string;
    isSaved?: boolean;
    onMenuClick?: () => void;
    onShare?: () => void;
    onRenameWorkspace?: (newName: string) => void;
    userAvatar?: string;
}

export function Header({
    workspaceName = "Projects",
    projectName = "Q3 Marketing",
    documentTitle = "Untitled Document",
    isSaved = true,
    onMenuClick,
    onShare,
    onRenameWorkspace,
    userAvatar,
}: HeaderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [nameInput, setNameInput] = useState(projectName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setNameInput(projectName);
    }, [projectName]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSubmit = () => {
        setIsEditing(false);
        if (nameInput.trim() && nameInput !== projectName) {
            onRenameWorkspace?.(nameInput);
        } else {
            setNameInput(projectName);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setNameInput(projectName);
        }
    };

    return (
        <header className="h-12 flex-none bg-white border-b border-border flex items-center justify-between px-4 z-30">
            {/* Left side - Menu, Breadcrumbs, Title */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="text-gray-400 hover:text-gray-900 transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Breadcrumbs */}
                {/* Breadcrumbs */}
                {/* Breadcrumbs */}
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Link href="/dashboard" className="hover:text-gray-900 transition-colors font-medium">
                        {workspaceName}
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </div>

                {/* Document Title */}
                <div className="flex items-center gap-2">
                    <h1 className="text-sm font-medium text-gray-900">
                        {documentTitle}
                    </h1>
                    {/* Save indicator */}
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${isSaved ? 'bg-green-500' : 'bg-yellow-500'}`}
                        title={isSaved ? 'Saved' : 'Unsaved changes'}
                    />
                </div>
            </div>

            {/* Right side - Share, Avatar */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onShare}
                    className="text-gray-500 hover:text-gray-900 text-xs font-medium px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5 border border-transparent hover:border-gray-200"
                >
                    Share
                    <Share2 className="w-3.5 h-3.5" />
                </button>

                {/* User Avatar */}
                <div
                    className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 bg-cover bg-center cursor-pointer hover:ring-2 hover:ring-gray-300 transition-all"
                    style={userAvatar ? { backgroundImage: `url(${userAvatar})` } : { background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                />
            </div>
        </header>
    );
}
