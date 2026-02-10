/**
 * Fuzzy string matching utilities for edit tools
 * Handles whitespace differences, line ending variations, and small typos
 *
 * P0 fixes applied:
 *   - normalizeWithMap: proper character-position mapping (no more linear ratio)
 *   - boundedLevenshtein: early-exit when distance exceeds threshold
 *   - n-gram candidate filtering: O(n) pre-filter before expensive comparisons
 */

// ─── Normalization ──────────────────────────────────────────────────────────

/**
 * Simple normalize (no position tracking). Used for quick comparisons.
 */
export function normalizeText(text: string): string {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, '  ')
        .replace(/[ ]+/g, ' ')
        .trim();
}

/**
 * Normalize text AND build a character-position map from normalized→original.
 * `map[i]` = the index in the original string that produced normalized char `i`.
 */
export function normalizeWithMap(text: string): { normalized: string; map: number[] } {
    const map: number[] = [];
    let normalized = '';
    let inWhitespace = false;
    // First pass: normalize \r\n → \n and \t → spaces (inline)
    // We iterate the raw string and build normalized + map simultaneously.

    for (let i = 0; i < text.length; i++) {
        let ch = text[i];

        // \r\n → \n  (skip the \r, the \n on next iteration handles it)
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
            continue;
        }
        // \t → two spaces
        if (ch === '\t') {
            // Treat as whitespace
            if (!inWhitespace && normalized.length > 0) {
                normalized += ' ';
                map.push(i);
                inWhitespace = true;
            }
            continue;
        }

        if (ch === ' ' || ch === '\n') {
            if (!inWhitespace && normalized.length > 0) {
                normalized += ' ';
                map.push(i);
                inWhitespace = true;
            }
        } else {
            normalized += ch;
            map.push(i);
            inWhitespace = false;
        }
    }

    // Trim trailing whitespace from normalized
    while (normalized.endsWith(' ')) {
        normalized = normalized.slice(0, -1);
        map.pop();
    }
    // Trim leading whitespace from normalized
    while (normalized.startsWith(' ')) {
        normalized = normalized.slice(1);
        map.shift();
    }

    return { normalized, map };
}

// ─── Levenshtein with early exit ────────────────────────────────────────────

/**
 * Calculate Levenshtein distance with an early-exit threshold.
 * Returns Infinity if the distance exceeds `maxDistance`.
 * This avoids computing the full matrix when strings are clearly too different.
 */
export function boundedLevenshtein(a: string, b: string, maxDistance: number): number {
    // Quick exits
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > maxDistance) return Infinity;

    const aLen = a.length;
    const bLen = b.length;

    // Use two rows instead of full matrix (O(min(m,n)) space)
    let prevRow = new Array(aLen + 1);
    let currRow = new Array(aLen + 1);

    for (let j = 0; j <= aLen; j++) prevRow[j] = j;

    for (let i = 1; i <= bLen; i++) {
        currRow[0] = i;
        let rowMin = currRow[0];

        for (let j = 1; j <= aLen; j++) {
            const cost = b[i - 1] === a[j - 1] ? 0 : 1;
            currRow[j] = Math.min(
                prevRow[j] + 1,      // deletion
                currRow[j - 1] + 1,  // insertion
                prevRow[j - 1] + cost // substitution
            );
            if (currRow[j] < rowMin) rowMin = currRow[j];
        }

        // Early exit: if every value in this row exceeds maxDistance, bail
        if (rowMin > maxDistance) return Infinity;

        [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[aLen] > maxDistance ? Infinity : prevRow[aLen];
}

/**
 * Full Levenshtein (unbounded). Used when we need the exact distance.
 */
export function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    const aLen = a.length;
    const bLen = b.length;
    let prevRow = new Array(aLen + 1);
    let currRow = new Array(aLen + 1);
    for (let j = 0; j <= aLen; j++) prevRow[j] = j;
    for (let i = 1; i <= bLen; i++) {
        currRow[0] = i;
        for (let j = 1; j <= aLen; j++) {
            const cost = b[i - 1] === a[j - 1] ? 0 : 1;
            currRow[j] = Math.min(
                prevRow[j] + 1,
                currRow[j - 1] + 1,
                prevRow[j - 1] + cost
            );
        }
        [prevRow, currRow] = [currRow, prevRow];
    }
    return prevRow[aLen];
}

/**
 * Calculate similarity ratio (0-1, 1 = identical)
 */
export function similarityRatio(a: string, b: string): number {
    const distance = levenshteinDistance(a, b);
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - (distance / maxLen);
}

// ─── N-gram candidate filtering ─────────────────────────────────────────────

/**
 * Extract character n-grams from a string.
 */
function extractNgrams(text: string, n: number): Set<string> {
    const ngrams = new Set<string>();
    for (let i = 0; i <= text.length - n; i++) {
        ngrams.add(text.slice(i, i + n));
    }
    return ngrams;
}

/**
 * Jaccard similarity between two n-gram sets.
 * Returns 0-1 (1 = identical n-gram sets).
 */
function ngramSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1;
    let intersection = 0;
    for (const gram of a) {
        if (b.has(gram)) intersection++;
    }
    return intersection / (a.size + b.size - intersection);
}

// ─── Main matching API ──────────────────────────────────────────────────────

export interface FuzzyMatchResult {
    found: boolean;
    matchedText: string;      // The actual text that was matched
    startIndex: number;       // Position in content
    endIndex: number;
    similarity: number;       // 0-1 score
    matchType: 'exact' | 'normalized' | 'fuzzy';
}

const MIN_FUZZY_SIMILARITY = 0.70;
const NGRAM_SIZE = 3;
// Candidates must have at least this n-gram similarity to be worth checking with Levenshtein
const NGRAM_PREFILTER_THRESHOLD = 0.3;

/**
 * Find the best match for searchText within content.
 * Uses progressive relaxation: exact → normalized (with proper position map) → fuzzy
 */
export function findBestMatch(content: string, searchText: string): FuzzyMatchResult {
    // ── 1. Exact match ──
    const exactIndex = content.indexOf(searchText);
    if (exactIndex !== -1) {
        return {
            found: true,
            matchedText: searchText,
            startIndex: exactIndex,
            endIndex: exactIndex + searchText.length,
            similarity: 1.0,
            matchType: 'exact'
        };
    }

    // ── 2. Normalized match (with proper position mapping) ──
    const { normalized: normalizedContent, map: contentMap } = normalizeWithMap(content);
    const { normalized: normalizedSearch } = normalizeWithMap(searchText);

    const normalizedIndex = normalizedContent.indexOf(normalizedSearch);
    if (normalizedIndex !== -1) {
        // Use the position map to get exact original positions
        const originalStart = contentMap[normalizedIndex];
        const normalizedEnd = normalizedIndex + normalizedSearch.length - 1;
        // The end position: find the original index of the last matched char,
        // then +1 to make it exclusive
        const originalEnd = contentMap[normalizedEnd] + 1;

        return {
            found: true,
            matchedText: content.slice(originalStart, originalEnd),
            startIndex: originalStart,
            endIndex: originalEnd,
            similarity: 0.95,
            matchType: 'normalized'
        };
    }

    // ── 3. Fuzzy matching with n-gram pre-filtering ──
    const searchLen = searchText.length;

    // Don't attempt fuzzy matching on very short strings (too many false positives)
    if (searchLen < 5) {
        return noMatch();
    }

    const searchNgrams = extractNgrams(normalizedSearch, NGRAM_SIZE);

    // Maximum edit distance we'd accept (based on MIN_FUZZY_SIMILARITY)
    const maxEditDistance = Math.floor(searchLen * (1 - MIN_FUZZY_SIMILARITY));

    let bestMatch: FuzzyMatchResult = noMatch();

    // Try window sizes: exact length, ±10%
    const windowSizes = [
        searchLen,
        Math.floor(searchLen * 0.9),
        Math.floor(searchLen * 1.1)
    ].filter(w => w > 0 && w <= content.length);

    // De-duplicate
    const uniqueWindowSizes = [...new Set(windowSizes)];

    for (const windowSize of uniqueWindowSizes) {
        // Step size: instead of checking every single character position,
        // step by a fraction of the window size for reasonable coverage
        const step = Math.max(1, Math.floor(windowSize / 10));

        for (let i = 0; i <= content.length - windowSize; i += step) {
            const window = content.slice(i, i + windowSize);
            const normalizedWindow = normalizeText(window);

            // ─ N-gram pre-filter: quick rejection ─
            const windowNgrams = extractNgrams(normalizedWindow, NGRAM_SIZE);
            const ngramSim = ngramSimilarity(searchNgrams, windowNgrams);

            if (ngramSim < NGRAM_PREFILTER_THRESHOLD) continue;

            // ─ Bounded Levenshtein: only compute if n-grams look promising ─
            const distance = boundedLevenshtein(normalizedWindow, normalizedSearch, maxEditDistance);
            if (distance === Infinity) continue;

            const sim = 1 - (distance / Math.max(normalizedWindow.length, normalizedSearch.length));

            if (sim > bestMatch.similarity && sim >= MIN_FUZZY_SIMILARITY) {
                // Refine: check neighbors (step back/forward by 1) for a better alignment
                let bestLocalSim = sim;
                let bestLocalStart = i;
                let bestLocalEnd = i + windowSize;

                for (let offset = -step + 1; offset < step; offset++) {
                    if (offset === 0) continue;
                    const ni = i + offset;
                    if (ni < 0 || ni + windowSize > content.length) continue;
                    const nw = content.slice(ni, ni + windowSize);
                    const nnw = normalizeText(nw);
                    const nd = boundedLevenshtein(nnw, normalizedSearch, maxEditDistance);
                    if (nd === Infinity) continue;
                    const ns = 1 - (nd / Math.max(nnw.length, normalizedSearch.length));
                    if (ns > bestLocalSim) {
                        bestLocalSim = ns;
                        bestLocalStart = ni;
                        bestLocalEnd = ni + windowSize;
                    }
                }

                bestMatch = {
                    found: true,
                    matchedText: content.slice(bestLocalStart, bestLocalEnd),
                    startIndex: bestLocalStart,
                    endIndex: bestLocalEnd,
                    similarity: bestLocalSim,
                    matchType: 'fuzzy'
                };
            }
        }
    }

    // ── 4. Line-by-line matching for multi-line search text ──
    if (searchText.includes('\n')) {
        const searchLines = searchText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const contentLines = content.split('\n');

        for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
            const candidateLines = contentLines.slice(i, i + searchLines.length);
            const candidateText = candidateLines.join('\n');
            const normalizedCandidate = normalizeText(candidateText);

            const distance = boundedLevenshtein(normalizedCandidate, normalizedSearch, maxEditDistance);
            if (distance === Infinity) continue;

            const sim = 1 - (distance / Math.max(normalizedCandidate.length, normalizedSearch.length));

            if (sim > bestMatch.similarity && sim >= MIN_FUZZY_SIMILARITY) {
                const startPos = contentLines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
                bestMatch = {
                    found: true,
                    matchedText: candidateText,
                    startIndex: startPos,
                    endIndex: startPos + candidateText.length,
                    similarity: sim,
                    matchType: 'fuzzy'
                };
            }
        }
    }

    return bestMatch;
}

function noMatch(): FuzzyMatchResult {
    return {
        found: false,
        matchedText: '',
        startIndex: -1,
        endIndex: -1,
        similarity: 0,
        matchType: 'fuzzy'
    };
}

// ─── Convenience: fuzzy replace ─────────────────────────────────────────────

/**
 * Apply a replacement with fuzzy matching.
 * Returns { success, newContent, matchInfo }
 */
export function fuzzyReplace(
    content: string,
    searchText: string,
    replacementText: string
): { success: boolean; newContent: string; matchInfo: FuzzyMatchResult } {
    const match = findBestMatch(content, searchText);

    if (!match.found) {
        return {
            success: false,
            newContent: content,
            matchInfo: match
        };
    }

    const newContent =
        content.slice(0, match.startIndex) +
        replacementText +
        content.slice(match.endIndex);

    return {
        success: true,
        newContent,
        matchInfo: match
    };
}
