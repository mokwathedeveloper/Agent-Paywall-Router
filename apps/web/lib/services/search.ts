/**
 * Search tool — real web search using:
 * 1. Tavily (Primary, requires TAVILY_API_KEY)
 * 2. DuckDuckGo Instant Answer API (Fallback, free)
 * 3. Wikipedia Search & Extract APIs (Fallback, free)
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance: number;
  source: string;
}

const DDG_API = "https://api.duckduckgo.com/";
const WIKI_SEARCH_API = "https://en.wikipedia.org/w/api.php";
const TAVILY_API = "https://api.tavily.com/search";
const UA = "AgentPaywallRouter/1.0 (hackathon demo)";
import { sanitizeLog } from "./security";

export async function search(query: string): Promise<{
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
}> {
  const start = Date.now();
  let results: SearchResult[] = [];

  // ── 1. Primary: Tavily (if key exists) ──────────────────────────────────
  if (process.env.TAVILY_API_KEY) {
    try {
      const tavilyRes = await fetch(TAVILY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: query,
          search_depth: "basic",
          max_results: 5,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (tavilyRes.ok) {
        const data = await tavilyRes.json();
        const tavilyResults = (data.results || []).map((r: any) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
          relevance: r.score || 0.9,
          source: "Tavily",
        }));
        results = results.concat(tavilyResults);
      } else {
        console.warn(`[search] Tavily API returned ${sanitizeLog(tavilyRes.status)}. Falling back...`);
      }
    } catch (err) {
      console.error("[search] Tavily error:", err);
    }
  }

  // If Tavily provided enough results, we can skip fallbacks
  if (results.length >= 3) {
    return {
      query,
      results: results.slice(0, 5),
      totalResults: results.length,
      searchTime: Date.now() - start,
    };
  }

  // ── 2. Fallback: Google News RSS ──────────────────────────────────
  try {
    const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const newsRes = await fetch(newsUrl, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(5000),
    });

    if (newsRes.ok) {
      const xml = await newsRes.text();
      const items = xml.split("<item>").slice(1, 6);
      for (const item of items) {
        const title = item.match(/<title>(.*?)<\/title>/)?.[1] || "";
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
        
        if (title && link) {
          results.push({
            title: title.replace(" - ", " | "),
            url: link,
            snippet: `Published on ${pubDate}. Latest news update regarding ${query}.`,
            relevance: 0.95,
            source: "Google News",
          });
        }
      }
    }
  } catch (err) {
    // news fallback failed
  }

  // ── 3. Fallback: DuckDuckGo Instant Answer ─────────────────────────────
  try {
    const ddgUrl = `${DDG_API}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(6000),
    });

    if (ddgRes.ok) {
      const ddg = await ddgRes.json() as any;
      if (ddg.AbstractText && ddg.AbstractText.length > 30) {
        results.push({
          title: ddg.AbstractSource ?? query,
          url: ddg.AbstractURL ?? `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: ddg.AbstractText,
          relevance: 0.98,
          source: "DuckDuckGo",
        });
      }
    }
  } catch {
    // DDG failed
  }

  // ── 4. Fallback: Wikipedia Search ──────────────────────────────────────
  if (results.length < 3) {
    try {
      const searchUrl = `${WIKI_SEARCH_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json`;
      const searchRes = await fetch(searchUrl, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(8000),
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json() as any;
        const wikiResults = searchData.query?.search ?? [];
        for (const item of wikiResults) {
          results.push({
            title: item.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
            snippet: item.snippet.replace(/<[^>]+>/g, "").trim(),
            relevance: 0.88,
            source: "Wikipedia",
          });
        }
      }
    } catch {
      // Wiki failed
    }
  }

  // Always include a DuckDuckGo search link
  results.push({
    title: `More results for "${query}"`,
    url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    snippet: `Search DuckDuckGo for more results about "${query}".`,
    relevance: 0.3,
    source: "DuckDuckGo",
  });

  const uniqueResults = Array.from(new Map(results.map(r => [r.url, r])).values());
  const sliced = uniqueResults.slice(0, 5);

  return {
    query,
    results: sliced,
    totalResults: sliced.length,
    searchTime: Date.now() - start,
  };
}
