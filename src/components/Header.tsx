"use client";

import { Menu, ChevronRight, Share2, Edit2 } from "lucide-react";
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
    onRenameDocument?: (newName: string) => Promise<void>;
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
    onRenameDocument,
    userAvatar,
}: HeaderProps) {
    const [isEditingWorkspace, setIsEditingWorkspace] = useState(false);
    const [workspaceNameInput, setWorkspaceNameInput] = useState(projectName);
    const workspaceInputRef = useRef<HTMLInputElement>(null);

    const [isEditingDocument, setIsEditingDocument] = useState(false);
    const [documentNameInput, setDocumentNameInput] = useState(documentTitle);
    const documentInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setWorkspaceNameInput(projectName);
    }, [projectName]);

    useEffect(() => {
        setDocumentNameInput(documentTitle);
    }, [documentTitle]);

    useEffect(() => {
        if (isEditingWorkspace && workspaceInputRef.current) {
            workspaceInputRef.current.focus();
        }
    }, [isEditingWorkspace]);

    useEffect(() => {
        if (isEditingDocument && documentInputRef.current) {
            documentInputRef.current.focus();
        }
    }, [isEditingDocument]);

    const handleWorkspaceSubmit = () => {
        setIsEditingWorkspace(false);
        if (workspaceNameInput.trim() && workspaceNameInput !== projectName) {
            onRenameWorkspace?.(workspaceNameInput);
        } else {
            setWorkspaceNameInput(projectName);
        }
    };

    const handleDocumentSubmit = async () => {
        setIsEditingDocument(false);
        if (documentNameInput.trim() && documentNameInput !== documentTitle) {
            await onRenameDocument?.(documentNameInput);
        } else {
            setDocumentNameInput(documentTitle);
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
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Link href="/dashboard" className="hover:text-gray-900 transition-colors font-medium text-xs">
                        {workspaceName}
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />

                    {/* Workspace/Project Name (renamable, though often 'projectName' prop here is actually workspace name usage in this app) */}
                    {/* Note: The props are a bit confusing: 'workspaceName' is "Projects" usually, 'projectName' fits the workspace slot */}
                    {/* We'll keep the logic as it was, but ensure renames work */}
                </div>

                {/* Document Title */}
                <div className="flex items-center gap-2">
                    {isEditingDocument ? (
                        <input
                            ref={documentInputRef}
                            type="text"
                            value={documentNameInput}
                            onChange={(e) => setDocumentNameInput(e.target.value)}
                            onBlur={handleDocumentSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleDocumentSubmit();
                                if (e.key === 'Escape') {
                                    setIsEditingDocument(false);
                                    setDocumentNameInput(documentTitle);
                                }
                            }}
                            className="bg-white text-gray-900 text-sm font-medium px-1 outline-none border border-indigo-500 rounded min-w-[120px]"
                        />
                    ) : (
                        <h1
                            className="text-sm font-medium text-gray-900 cursor-text hover:bg-gray-50 px-1 rounded transition-colors"
                            onDoubleClick={() => onRenameDocument && setIsEditingDocument(true)}
                            title={onRenameDocument ? "Double click to rename" : undefined}
                        >
                            {documentTitle}
                        </h1>
                    )}

                    {/* Save indicator */}
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${isSaved ? 'bg-green-500' : 'bg-yellow-500'} ml-1`}
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
