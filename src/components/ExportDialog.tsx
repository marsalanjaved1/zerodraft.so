'use client';

import { useState, useCallback } from 'react';
import {
    FileDown,
    FileText,
    FileCode,
    FileType,
    Download,
    X
} from 'lucide-react';

interface ExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: 'pdf' | 'docx' | 'md' | 'html' | 'txt') => void;
    filename: string;
}

const exportOptions = [
    {
        format: 'pdf' as const,
        label: 'PDF Document',
        description: 'Print-ready document',
        icon: FileDown,
    },
    {
        format: 'docx' as const,
        label: 'Word Document',
        description: 'Microsoft Word format',
        icon: FileText,
    },
    {
        format: 'md' as const,
        label: 'Markdown',
        description: 'Plain text with formatting',
        icon: FileCode,
    },
    {
        format: 'html' as const,
        label: 'HTML',
        description: 'Web page format',
        icon: FileType,
    },
    {
        format: 'txt' as const,
        label: 'Plain Text',
        description: 'No formatting',
        icon: FileText,
    },
];

export function ExportDialog({ isOpen, onClose, onExport, filename }: ExportDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
                    <div className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-[#cccccc]" />
                        <h2 className="text-[#cccccc] font-medium">Export Document</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-[#3c3c3c] rounded"
                    >
                        <X className="w-4 h-4 text-[#858585]" />
                    </button>
                </div>

                {/* Filename */}
                <div className="px-4 py-3 border-b border-[#3c3c3c]">
                    <p className="text-xs text-[#858585] mb-1">Exporting</p>
                    <p className="text-sm text-[#cccccc] font-mono">{filename}</p>
                </div>

                {/* Export options */}
                <div className="p-2">
                    {exportOptions.map((option) => (
                        <button
                            key={option.format}
                            onClick={() => {
                                onExport(option.format);
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[#3c3c3c] transition-colors text-left"
                        >
                            <div className="p-2 bg-[#1e1e1e] rounded-md border border-[#3c3c3c]">
                                <option.icon className="w-4 h-4 text-[#cccccc]" />
                            </div>
                            <div>
                                <p className="text-sm text-[#cccccc] font-medium">{option.label}</p>
                                <p className="text-xs text-[#858585]">{option.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Export utility functions
export function exportToPdf() {
    window.print();
}

export function exportToWord(html: string, filename: string) {
    const blob = new Blob([`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${filename}</title></head>
<body>${html}</body>
</html>
    `], { type: 'application/msword' });
    downloadBlob(blob, `${filename}.doc`);
}

export function exportToHtml(html: string, filename: string) {
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${filename}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
        h1, h2, h3 { color: #111; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
    </style>
</head>
<body>${html}</body>
</html>
    `;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    downloadBlob(blob, `${filename}.html`);
}

export function exportToMarkdown(html: string, filename: string) {
    // Simple HTML to Markdown conversion
    let md = html
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<ul[^>]*>/gi, '\n')
        .replace(/<\/ul>/gi, '\n')
        .replace(/<ol[^>]*>/gi, '\n')
        .replace(/<\/ol>/gi, '\n')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '') // Remove remaining tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n') // Normalize newlines
        .trim();

    const blob = new Blob([md], { type: 'text/markdown' });
    downloadBlob(blob, `${filename}.md`);
}

export function exportToPlainText(text: string, filename: string) {
    const blob = new Blob([text], { type: 'text/plain' });
    downloadBlob(blob, `${filename}.txt`);
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
