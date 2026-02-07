"use client";

import { Menu, ChevronRight, Share2 } from "lucide-react";

interface HeaderProps {
    workspaceName?: string;
    projectName?: string;
    documentTitle?: string;
    isSaved?: boolean;
    onMenuClick?: () => void;
    onShare?: () => void;
    userAvatar?: string;
}

export function Header({
    workspaceName = "Projects",
    projectName = "Q3 Marketing",
    documentTitle = "Untitled Document",
    isSaved = true,
    onMenuClick,
    onShare,
    userAvatar,
}: HeaderProps) {
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
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{workspaceName}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>{projectName}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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
