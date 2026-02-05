import { useState, useCallback, useEffect } from 'react';
import type { EditorInstance } from 'novel';

interface UseSearchOptions {
    editor: EditorInstance | null;
}

interface SearchResult {
    from: number;
    to: number;
}

interface UseSearchReturn {
    query: string;
    setQuery: (query: string) => void;
    results: SearchResult[];
    currentIndex: number;
    matchCount: number;
    goToNext: () => void;
    goToPrevious: () => void;
    replace: (replacement: string) => void;
    replaceAll: (replacement: string) => void;
    clear: () => void;
}

export function useEditorSearch({ editor }: UseSearchOptions): UseSearchReturn {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Find all matches when query changes
    useEffect(() => {
        if (!editor || !query) {
            setResults([]);
            setCurrentIndex(0);
            return;
        }

        const text = editor.getText();
        const matches: SearchResult[] = [];
        const lowerQuery = query.toLowerCase();
        const lowerText = text.toLowerCase();

        let pos = 0;
        while (true) {
            const index = lowerText.indexOf(lowerQuery, pos);
            if (index === -1) break;

            // Need to convert text position to editor position
            // This is a simplified approach - may need adjustment for complex docs
            matches.push({
                from: index,
                to: index + query.length,
            });
            pos = index + 1;
        }

        setResults(matches);
        setCurrentIndex(matches.length > 0 ? 0 : -1);

        // Highlight first match
        if (matches.length > 0) {
            highlightMatch(editor, matches[0]);
        }
    }, [query, editor]);

    // Highlight a specific match
    const highlightMatch = useCallback((ed: EditorInstance, match: SearchResult) => {
        // Convert text position to document position
        // For ProseMirror, we need to account for node boundaries
        const { from, to } = match;

        try {
            // Simple approach: select the text range
            const docText = ed.getText();
            const textBefore = docText.slice(0, from);

            // Count actual document position by iterating through nodes
            let docPos = 0;
            let charCount = 0;

            ed.state.doc.descendants((node, pos) => {
                if (charCount >= from) return false; // Stop searching

                if (node.isText) {
                    const nodeTextLength = node.text?.length || 0;
                    if (charCount + nodeTextLength >= from) {
                        // Found the starting position
                        docPos = pos + (from - charCount);
                        return false;
                    }
                    charCount += nodeTextLength;
                } else if (node.isBlock && charCount > 0) {
                    charCount += 1; // Account for newlines between blocks
                }
                return true;
            });

            // Select and scroll to the match
            ed.chain()
                .focus()
                .setTextSelection({ from: docPos + 1, to: docPos + 1 + (to - from) })
                .run();
        } catch (e) {
            console.error('Error highlighting match:', e);
        }
    }, []);

    const goToNext = useCallback(() => {
        if (results.length === 0 || !editor) return;

        const nextIndex = (currentIndex + 1) % results.length;
        setCurrentIndex(nextIndex);
        highlightMatch(editor, results[nextIndex]);
    }, [results, currentIndex, editor, highlightMatch]);

    const goToPrevious = useCallback(() => {
        if (results.length === 0 || !editor) return;

        const prevIndex = currentIndex === 0 ? results.length - 1 : currentIndex - 1;
        setCurrentIndex(prevIndex);
        highlightMatch(editor, results[prevIndex]);
    }, [results, currentIndex, editor, highlightMatch]);

    const replace = useCallback((replacement: string) => {
        if (!editor || results.length === 0 || currentIndex === -1) return;

        // The text should already be selected from highlighting
        editor.chain().focus().insertContent(replacement).run();

        // Re-search to update results
        setQuery(q => q); // Trigger re-search
    }, [editor, results, currentIndex]);

    const replaceAll = useCallback((replacement: string) => {
        if (!editor || !query) return;

        const text = editor.getHTML();
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const newHtml = text.replace(regex, replacement);

        editor.commands.setContent(newHtml);
        setResults([]);
        setCurrentIndex(-1);
    }, [editor, query]);

    const clear = useCallback(() => {
        setQuery('');
        setResults([]);
        setCurrentIndex(-1);
    }, []);

    return {
        query,
        setQuery,
        results,
        currentIndex: currentIndex + 1, // 1-indexed for display
        matchCount: results.length,
        goToNext,
        goToPrevious,
        replace,
        replaceAll,
        clear,
    };
}
