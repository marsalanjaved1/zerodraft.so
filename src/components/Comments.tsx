'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    MessageSquare,
    Send,
    X,
    Reply,
    MoreVertical,
    Trash2,
    Edit2,
    Check,
    CheckCheck
} from 'lucide-react';

// ============ Types ============
export interface Comment {
    id: string;
    content: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    createdAt: Date;
    updatedAt?: Date;
    parentId?: string;
    positionStart?: number;
    positionEnd?: number;
    resolved?: boolean;
    replies?: Comment[];
}

// ============ Comment Item ============
interface CommentItemProps {
    comment: Comment;
    currentUserId: string;
    onReply?: (commentId: string, content: string) => void;
    onEdit?: (commentId: string, content: string) => void;
    onDelete?: (commentId: string) => void;
    onResolve?: (commentId: string) => void;
    depth?: number;
}

function CommentItem({
    comment,
    currentUserId,
    onReply,
    onEdit,
    onDelete,
    onResolve,
    depth = 0,
}: CommentItemProps) {
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [replyContent, setReplyContent] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const isOwner = comment.userId === currentUserId;

    const handleSubmitEdit = () => {
        if (editContent.trim() && onEdit) {
            onEdit(comment.id, editContent.trim());
            setIsEditing(false);
        }
    };

    const handleSubmitReply = () => {
        if (replyContent.trim() && onReply) {
            onReply(comment.id, replyContent.trim());
            setReplyContent('');
            setIsReplying(false);
        }
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className={`${depth > 0 ? 'ml-6 border-l-2 border-[#3c3c3c] pl-3' : ''}`}>
            <div className={`group p-3 rounded-lg hover:bg-[#3c3c3c]/30 ${comment.resolved ? 'opacity-60' : ''}`}>
                {/* Header */}
                <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#007acc] to-[#68217a] flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
                        {comment.userName[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-[#cccccc]">{comment.userName}</span>
                            <span className="text-[10px] text-[#858585]">{formatTime(comment.createdAt)}</span>
                            {comment.updatedAt && (
                                <span className="text-[10px] text-[#858585]">(edited)</span>
                            )}
                            {comment.resolved && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-green-900/30 text-green-400 rounded flex items-center gap-1">
                                    <CheckCheck className="w-2.5 h-2.5" />
                                    Resolved
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        {isEditing ? (
                            <div className="mt-2">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full p-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-xs text-[#cccccc] resize-none focus:outline-none focus:border-[#007acc]"
                                    rows={3}
                                    autoFocus
                                />
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-2 py-1 text-xs text-[#858585] hover:text-[#cccccc]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmitEdit}
                                        className="px-2 py-1 text-xs bg-[#007acc] hover:bg-[#1a85dc] text-white rounded"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-[#cccccc] mt-1 whitespace-pre-wrap">{comment.content}</p>
                        )}

                        {/* Actions */}
                        {!isEditing && (
                            <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!comment.resolved && (
                                    <button
                                        onClick={() => setIsReplying(!isReplying)}
                                        className="flex items-center gap-1 text-[10px] text-[#858585] hover:text-[#cccccc]"
                                    >
                                        <Reply className="w-3 h-3" />
                                        Reply
                                    </button>
                                )}
                                {depth === 0 && !comment.resolved && onResolve && (
                                    <button
                                        onClick={() => onResolve(comment.id)}
                                        className="flex items-center gap-1 text-[10px] text-[#858585] hover:text-green-400"
                                    >
                                        <Check className="w-3 h-3" />
                                        Resolve
                                    </button>
                                )}
                                {isOwner && (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex items-center gap-1 text-[10px] text-[#858585] hover:text-[#cccccc]"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDelete?.(comment.id)}
                                            className="flex items-center gap-1 text-[10px] text-[#858585] hover:text-red-400"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Reply Input */}
                {isReplying && (
                    <div className="mt-3 ml-9">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Write a reply..."
                                className="flex-1 px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#007acc]"
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
                                autoFocus
                            />
                            <button
                                onClick={handleSubmitReply}
                                disabled={!replyContent.trim()}
                                className="p-1.5 bg-[#007acc] hover:bg-[#1a85dc] text-white rounded disabled:opacity-50"
                            >
                                <Send className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-1">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            currentUserId={currentUserId}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============ Comments Panel ============
interface CommentsPanelProps {
    comments: Comment[];
    currentUserId: string;
    currentUserName: string;
    onAddComment: (content: string, positionStart?: number, positionEnd?: number) => void;
    onReply: (parentId: string, content: string) => void;
    onEdit: (commentId: string, content: string) => void;
    onDelete: (commentId: string) => void;
    onResolve: (commentId: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export function CommentsPanel({
    comments,
    currentUserId,
    currentUserName,
    onAddComment,
    onReply,
    onEdit,
    onDelete,
    onResolve,
    isOpen,
    onClose,
}: CommentsPanelProps) {
    const [newComment, setNewComment] = useState('');
    const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

    const filteredComments = comments.filter(c => {
        if (filter === 'open') return !c.resolved;
        if (filter === 'resolved') return c.resolved;
        return true;
    });

    const handleSubmit = () => {
        if (newComment.trim()) {
            onAddComment(newComment.trim());
            setNewComment('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="w-80 bg-[#252526] border-l border-[#3c3c3c] flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#007acc]" />
                    <span className="text-sm text-[#cccccc] font-medium">Comments</span>
                    <span className="text-xs text-[#858585]">({comments.length})</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-[#3c3c3c] rounded">
                    <X className="w-4 h-4 text-[#858585]" />
                </button>
            </div>

            {/* Filter */}
            <div className="flex gap-1 px-3 py-2 border-b border-[#3c3c3c]">
                {(['all', 'open', 'resolved'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-2.5 py-1 text-[10px] rounded-full capitalize ${filter === f
                                ? 'bg-[#007acc] text-white'
                                : 'bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4c4c4c]'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-2">
                {filteredComments.length > 0 ? (
                    <div className="space-y-1">
                        {filteredComments.map((comment) => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                currentUserId={currentUserId}
                                onReply={onReply}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onResolve={onResolve}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <MessageSquare className="w-10 h-10 text-[#858585] opacity-30 mb-3" />
                        <p className="text-sm text-[#858585]">No comments yet</p>
                        <p className="text-xs text-[#6e6e6e] mt-1">Start a discussion below</p>
                    </div>
                )}
            </div>

            {/* New Comment Input */}
            <div className="p-3 border-t border-[#3c3c3c]">
                <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#007acc] to-[#68217a] flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
                        {currentUserName[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="w-full p-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-xs text-[#cccccc] placeholder-[#858585] resize-none focus:outline-none focus:border-[#007acc]"
                            rows={2}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    handleSubmit();
                                }
                            }}
                        />
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-[#858585]">⌘+Enter to send</span>
                            <button
                                onClick={handleSubmit}
                                disabled={!newComment.trim()}
                                className="px-3 py-1 bg-[#007acc] hover:bg-[#1a85dc] text-white text-xs rounded disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <Send className="w-3 h-3" />
                                Comment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============ Comments Button (for toolbar) ============
interface CommentsButtonProps {
    onClick: () => void;
    count: number;
    hasUnread?: boolean;
}

export function CommentsButton({ onClick, count, hasUnread }: CommentsButtonProps) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[#3c3c3c] rounded text-xs text-[#cccccc] transition-colors relative"
        >
            <MessageSquare className="w-3.5 h-3.5" />
            {count > 0 && <span>{count}</span>}
            {hasUnread && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#007acc] rounded-full" />
            )}
        </button>
    );
}
