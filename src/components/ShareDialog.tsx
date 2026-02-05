'use client';

import { useState, useCallback } from 'react';
import {
    Share2,
    Link2,
    Copy,
    Check,
    X,
    Users,
    Globe,
    Lock,
    Mail,
    UserPlus,
    Trash2,
    ChevronDown
} from 'lucide-react';

// ============ Types ============
export interface ShareMember {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    role: 'owner' | 'editor' | 'viewer';
    status: 'active' | 'pending';
}

export interface ShareLink {
    id: string;
    token: string;
    accessLevel: 'view' | 'comment' | 'edit';
    expiresAt?: Date;
    isActive: boolean;
    viewCount: number;
}

// ============ Share Dialog ============
interface ShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    shareUrl?: string;
    members?: ShareMember[];
    shareLink?: ShareLink | null;
    onInvite?: (email: string, role: 'editor' | 'viewer') => Promise<void>;
    onRemoveMember?: (memberId: string) => Promise<void>;
    onChangeRole?: (memberId: string, role: 'editor' | 'viewer') => Promise<void>;
    onCreateLink?: (accessLevel: 'view' | 'comment' | 'edit') => Promise<ShareLink>;
    onDeleteLink?: (linkId: string) => Promise<void>;
}

export function ShareDialog({
    isOpen,
    onClose,
    title,
    shareUrl = '',
    members = [],
    shareLink,
    onInvite,
    onRemoveMember,
    onChangeRole,
    onCreateLink,
    onDeleteLink,
}: ShareDialogProps) {
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
    const [isInviting, setIsInviting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'people' | 'link'>('people');

    const handleCopyLink = async () => {
        const url = shareLink ? `${window.location.origin}/share/${shareLink.token}` : shareUrl;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim() || !onInvite) return;
        setIsInviting(true);
        try {
            await onInvite(inviteEmail.trim(), inviteRole);
            setInviteEmail('');
        } catch (e) {
            console.error('Failed to invite:', e);
        } finally {
            setIsInviting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
                    <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-[#007acc]" />
                        <h2 className="text-[#cccccc] font-medium">Share "{title}"</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-[#3c3c3c] rounded">
                        <X className="w-4 h-4 text-[#858585]" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#3c3c3c]">
                    <button
                        onClick={() => setActiveTab('people')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs transition-colors ${activeTab === 'people'
                                ? 'text-[#cccccc] border-b-2 border-[#007acc]'
                                : 'text-[#858585] hover:text-[#cccccc]'
                            }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        People
                    </button>
                    <button
                        onClick={() => setActiveTab('link')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs transition-colors ${activeTab === 'link'
                                ? 'text-[#cccccc] border-b-2 border-[#007acc]'
                                : 'text-[#858585] hover:text-[#cccccc]'
                            }`}
                    >
                        <Link2 className="w-3.5 h-3.5" />
                        Get Link
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {activeTab === 'people' ? (
                        <>
                            {/* Invite Form */}
                            <div className="flex gap-2 mb-4">
                                <div className="flex-1 relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#858585]" />
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="Enter email address"
                                        className="w-full pl-9 pr-3 py-2 bg-[#3c3c3c] border border-[#3c3c3c] rounded text-sm text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#007acc]"
                                        onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                    />
                                </div>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                                    className="px-3 py-2 bg-[#3c3c3c] border border-[#3c3c3c] rounded text-xs text-[#cccccc] focus:outline-none"
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                </select>
                                <button
                                    onClick={handleInvite}
                                    disabled={!inviteEmail.trim() || isInviting}
                                    className="px-3 py-2 bg-[#007acc] hover:bg-[#1a85dc] text-white rounded text-xs disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    Invite
                                </button>
                            </div>

                            {/* Members List */}
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center gap-3 p-2 rounded hover:bg-[#3c3c3c]"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007acc] to-[#68217a] flex items-center justify-center text-white text-xs font-medium">
                                            {member.name?.[0] || member.email[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-[#cccccc] truncate">
                                                {member.name || member.email}
                                            </div>
                                            {member.name && (
                                                <div className="text-xs text-[#858585] truncate">{member.email}</div>
                                            )}
                                        </div>
                                        {member.status === 'pending' && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-900/30 text-yellow-400 rounded">
                                                Pending
                                            </span>
                                        )}
                                        {member.role === 'owner' ? (
                                            <span className="text-xs text-[#858585]">Owner</span>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => onChangeRole?.(member.id, e.target.value as 'editor' | 'viewer')}
                                                    className="px-2 py-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[10px] text-[#cccccc]"
                                                >
                                                    <option value="viewer">Viewer</option>
                                                    <option value="editor">Editor</option>
                                                </select>
                                                <button
                                                    onClick={() => onRemoveMember?.(member.id)}
                                                    className="p-1 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-red-400"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {members.length === 0 && (
                                    <div className="text-center py-6 text-xs text-[#858585]">
                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        No one else has access yet
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Link Sharing */}
                            {shareLink ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 p-3 bg-[#1e1e1e] rounded-lg">
                                        <Globe className="w-4 h-4 text-green-400" />
                                        <span className="text-xs text-[#cccccc]">Anyone with the link can {shareLink.accessLevel}</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={`${window.location.origin}/share/${shareLink.token}`}
                                            readOnly
                                            className="flex-1 px-3 py-2 bg-[#3c3c3c] border border-[#3c3c3c] rounded text-xs text-[#cccccc] font-mono"
                                        />
                                        <button
                                            onClick={handleCopyLink}
                                            className="px-3 py-2 bg-[#007acc] hover:bg-[#1a85dc] text-white rounded text-xs flex items-center gap-1.5"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-[#858585]">
                                        <span>{shareLink.viewCount} views</span>
                                        <button
                                            onClick={() => onDeleteLink?.(shareLink.id)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            Remove link
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <Lock className="w-8 h-8 mx-auto mb-3 text-[#858585] opacity-40" />
                                    <p className="text-sm text-[#cccccc] mb-4">Link sharing is off</p>
                                    <button
                                        onClick={() => onCreateLink?.('view')}
                                        className="px-4 py-2 bg-[#007acc] hover:bg-[#1a85dc] text-white rounded text-xs flex items-center gap-2 mx-auto"
                                    >
                                        <Link2 className="w-3.5 h-3.5" />
                                        Create shareable link
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============ Share Button (for Header) ============
interface ShareButtonProps {
    onClick: () => void;
    memberCount?: number;
}

export function ShareButton({ onClick, memberCount = 0 }: ShareButtonProps) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded text-xs text-[#cccccc] transition-colors"
        >
            <Share2 className="w-3.5 h-3.5" />
            Share
            {memberCount > 0 && (
                <span className="ml-1 w-4 h-4 bg-[#007acc] rounded-full text-[10px] flex items-center justify-center">
                    {memberCount}
                </span>
            )}
        </button>
    );
}
