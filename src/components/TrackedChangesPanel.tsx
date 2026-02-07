"use client";

import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { TrackedChange } from "@/lib/hooks/use-tracked-changes";
import { useState } from "react";

interface TrackedChangeItemProps {
    change: TrackedChange;
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
}

function TrackedChangeItem({ change, onAccept, onReject }: TrackedChangeItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={`border rounded-lg mb-2 overflow-hidden transition-all ${change.status === "accepted"
                ? "border-green-200 bg-green-50/50"
                : change.status === "rejected"
                    ? "border-red-200 bg-red-50/50 opacity-60"
                    : "border-gray-200 bg-white"
            }`}>
            {/* Header */}
            <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-500 shrink-0">
                        {change.status === "pending" ? "Suggestion" : change.status}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                        "{change.original.slice(0, 30)}..." → "{change.suggested.slice(0, 30)}..."
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {change.status === "pending" && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAccept(change.id); }}
                                className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors"
                                title="Accept change"
                            >
                                <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onReject(change.id); }}
                                className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors"
                                title="Reject change"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-100">
                    {change.reason && (
                        <p className="text-xs text-gray-500 italic mt-2 mb-2">
                            {change.reason}
                        </p>
                    )}

                    <div className="space-y-2 mt-2">
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                            <span className="text-xs font-medium text-red-600 block mb-1">Original:</span>
                            <p className="text-sm text-red-800 line-through">{change.original}</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                            <span className="text-xs font-medium text-green-600 block mb-1">Suggested:</span>
                            <p className="text-sm text-green-800">{change.suggested}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface TrackedChangesPanelProps {
    changes: TrackedChange[];
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
    onAcceptAll: () => void;
    onRejectAll: () => void;
}

export function TrackedChangesPanel({
    changes,
    onAccept,
    onReject,
    onAcceptAll,
    onRejectAll
}: TrackedChangesPanelProps) {
    const pendingChanges = changes.filter(c => c.status === "pending");
    const resolvedChanges = changes.filter(c => c.status !== "pending");

    if (changes.length === 0) {
        return (
            <div className="p-4 text-center text-gray-400 text-sm">
                No tracked changes yet.
                <p className="text-xs mt-1">AI suggestions will appear here.</p>
            </div>
        );
    }

    return (
        <div className="p-3">
            {/* Bulk Actions */}
            {pendingChanges.length > 0 && (
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                    <span className="text-xs text-gray-500">
                        {pendingChanges.length} pending change{pendingChanges.length > 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onAcceptAll}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded transition-colors"
                        >
                            <Check className="w-3 h-3" />
                            Accept All
                        </button>
                        <button
                            onClick={onRejectAll}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                            <X className="w-3 h-3" />
                            Reject All
                        </button>
                    </div>
                </div>
            )}

            {/* Pending Changes */}
            {pendingChanges.map(change => (
                <TrackedChangeItem
                    key={change.id}
                    change={change}
                    onAccept={onAccept}
                    onReject={onReject}
                />
            ))}

            {/* Resolved Changes */}
            {resolvedChanges.length > 0 && pendingChanges.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400 mb-2 block">Resolved</span>
                </div>
            )}
            {resolvedChanges.map(change => (
                <TrackedChangeItem
                    key={change.id}
                    change={change}
                    onAccept={onAccept}
                    onReject={onReject}
                />
            ))}
        </div>
    );
}
