/**
 * Web Search Tool — External Information Access for Zero Draft
 * 
 * Gives the Controller the ability to search the web for real-time information.
 * Uses a simple fetch-based approach with configurable providers:
 *   - Brave Search API (default, free tier available)
 *   - Tavily (alternative, requires API key)
 * 
 * The tool is handled server-side (like consultWriter), not sent to the client.
 */

// --- Types ---

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

// --- Search Providers ---

/**
 * Brave Search API
 * Free tier: 2,000 queries/month
 * Set BRAVE_SEARCH_API_KEY in .env.local
 */
async function braveSearch(query: string, count: number = 5): Promise<SearchResult[]> {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
        throw new Error("BRAVE_SEARCH_API_KEY not set");
    }

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(count));

    const response = await fetch(url.toString(), {
        headers: {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": apiKey,
        },
    });

    if (!response.ok) {
        throw new Error(`Brave Search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const results: SearchResult[] = (data.web?.results || []).slice(0, count).map((r: any) => ({
        title: r.title || "",
        url: r.url || "",
        snippet: r.description || "",
    }));

    return results;
}

/**
 * Tavily Search API (alternative provider)
 * Set TAVILY_API_KEY in .env.local
 */
async function tavilySearch(query: string, count: number = 5): Promise<SearchResult[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        throw new Error("TAVILY_API_KEY not set");
    }

    const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            api_key: apiKey,
            query,
            max_results: count,
            search_depth: "basic",
        }),
    });

    if (!response.ok) {
        throw new Error(`Tavily Search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return (data.results || []).slice(0, count).map((r: any) => ({
        title: r.title || "",
        url: r.url || "",
        snippet: r.content || "",
    }));
}

// --- Main Search Function ---

/**
 * Execute a web search using the configured provider.
 * Automatically picks the provider based on available API keys.
 */
export async function webSearch(query: string, count: number = 5): Promise<string> {
    try {
        let results: SearchResult[];

        // Pick provider based on available keys
        if (process.env.BRAVE_SEARCH_API_KEY) {
            results = await braveSearch(query, count);
        } else if (process.env.TAVILY_API_KEY) {
            results = await tavilySearch(query, count);
        } else {
            return "⚠️ Web search is not configured. Set BRAVE_SEARCH_API_KEY or TAVILY_API_KEY in your environment variables.";
        }

        if (results.length === 0) {
            return `No results found for: "${query}"`;
        }

        // Format results for the Controller
        const formatted = results.map((r, i) =>
            `**${i + 1}. ${r.title}**\n   ${r.url}\n   ${r.snippet}`
        ).join("\n\n");

        return `### 🔍 Search Results for "${query}"\n\n${formatted}`;
    } catch (err: any) {
        console.error("[WebSearch] Error:", err);
        return `Web search failed: ${err.message}`;
    }
}
