"use client";

import React from "react";
import { Check, X } from "lucide-react";

interface InlineTrackChangeProps {
    changeId: string;
    originalText: string;
    suggestedText: string;
    onAccept: (changeId: string) => void;
    onReject: (changeId: string) => void;
}

export function InlineTrackChange({
    changeId,
    originalText,
    suggestedText,
    onAccept,
    onReject
}: InlineTrackChangeProps) {
    return (
        <span className="track-change-group" data-change-id={changeId}>
            {/* Deleted text (strikethrough red) */}
            <span className="track-change-deletion">{originalText}</span>

            {/* Inserted text (green underline) */}
            <span className="track-change-insertion">{suggestedText}</span>

            {/* Accept/Reject buttons */}
            <span className="track-change-buttons">
                <button
                    onClick={() => onAccept(changeId)}
                    className="track-change-btn track-change-btn-accept"
                    title="Accept change"
                >
                    <Check className="w-2.5 h-2.5" />
                </button>
                <button
                    onClick={() => onReject(changeId)}
                    className="track-change-btn track-change-btn-reject"
                    title="Reject change"
                >
                    <X className="w-2.5 h-2.5" />
                </button>
            </span>
        </span>
    );
}

// Utility to apply a tracked change to editor content
export function applyTrackedChange(
    content: string,
    originalText: string,
    suggestedText: string,
    changeId: string
): { html: string; found: boolean } {
    if (!content.includes(originalText)) {
        return { html: content, found: false };
    }

    const changeHtml = `<span class="track-change-group" data-change-id="${changeId}"><span class="track-change-deletion">${originalText}</span><span class="track-change-insertion">${suggestedText}</span><span class="track-change-buttons" contenteditable="false"><button class="track-change-btn track-change-btn-accept" data-action="accept" data-change-id="${changeId}">✓</button><button class="track-change-btn track-change-btn-reject" data-action="reject" data-change-id="${changeId}">✗</button></span></span>`;

    const newHtml = content.replace(originalText, changeHtml);
    return { html: newHtml, found: true };
}

// Accept a change - keep suggested text, remove original
export function acceptTrackedChange(content: string, changeId: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");

    const changeGroup = doc.querySelector(`[data-change-id="${changeId}"]`);
    if (changeGroup) {
        const insertion = changeGroup.querySelector(".track-change-insertion");
        if (insertion) {
            changeGroup.replaceWith(document.createTextNode(insertion.textContent || ""));
        }
    }

    return doc.body.innerHTML;
}

// Reject a change - keep original text, remove suggested
export function rejectTrackedChange(content: string, changeId: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");

    const changeGroup = doc.querySelector(`[data-change-id="${changeId}"]`);
    if (changeGroup) {
        const deletion = changeGroup.querySelector(".track-change-deletion");
        if (deletion) {
            changeGroup.replaceWith(document.createTextNode(deletion.textContent || ""));
        }
    }

    return doc.body.innerHTML;
}
