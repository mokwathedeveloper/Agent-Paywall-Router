/**
 * Search tool — real web search using:
 * 1. DuckDuckGo Instant Answer API (no key, free)
 * 2. Wikipedia Search API (no key, free) — finds articles by keyword
 * 3. Wikipedia Extract API (no key, free) — gets article content
 *
 * No API keys required for any of these.
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
const UA = "AgentPaywallRouter/1.0 (hackathon demo)";

export async function search(query: string): Promise<{
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
}> {
  const start = Date.now();
  const results: SearchResult[] = [];

  // ── 1. DuckDuckGo Instant Answer ─────────────────────────────────────────
  try {
    const ddgUrl = `${DDG_API}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(6000),
    });

    if (ddgRes.ok) {
      const ddg = await ddgRes.json() as {
        AbstractText?: string;
        AbstractURL?: string;
        AbstractSource?: string;
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Name?: string }>;
        Results?: Array<{ Text?: string; FirstURL?: string }>;
      };

      if (ddg.AbstractText && ddg.AbstractText.length > 30) {
        results.push({
          title: ddg.AbstractSource ?? query,
          url: ddg.AbstractURL ?? `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: ddg.AbstractText,
          relevance: 0.98,
          source: "DuckDuckGo",
        });
      }

      for (const topic of (ddg.RelatedTopics ?? []).slice(0, 2)) {
        if (topic.Text && topic.FirstURL && topic.Text.length > 20) {
          results.push({
            title: topic.Name ?? topic.Text.split(" - ")[0] ?? topic.Text.slice(0, 60),
            url: topic.FirstURL,
            snippet: topic.Text,
            relevance: 0.82,
            source: "DuckDuckGo",
          });
        }
      }
    }
  } catch {
    // DDG failed — continue to Wikipedia
  }

  // ── 2. Wikipedia Search API ───────────────────────────────────────────────
  try {
    const searchUrl = `${WIKI_SEARCH_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(8000),
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json() as {
        query?: { search?: Array<{ title: string; snippet: string; pageid: number }> };
      };

      const wikiResults = searchData.query?.search ?? [];

      for (const item of wikiResults.slice(0, 3)) {
        const cleanSnippet = item.snippet
          .replace(/<[^>]+>/g, "")   // strip HTML tags
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, "&")
          .trim();

        if (cleanSnippet.length > 20) {
          results.push({
            title: item.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
            snippet: cleanSnippet,
            relevance: 0.88,
            source: "Wikipedia",
          });
        }
      }
    }
  } catch {
    // Wikipedia search failed — continue
  }

  // ── 3. Wikipedia Extract for top result ──────────────────────────────────
  if (results.length > 0) {
    const topWikiResult = results.find(r => r.source === "Wikipedia");
    if (topWikiResult) {
      try {
        const title = topWikiResult.title.replace(/ /g, "_");
        const extractUrl = `${WIKI_SEARCH_API}?action=query&titles=${encodeURIComponent(title)}&prop=extracts&exintro=1&explaintext=1&exsentences=3&format=json&origin=*`;
        const extractRes = await fetch(extractUrl, {
          headers: { "User-Agent": UA },
          signal: AbortSignal.timeout(6000),
        });

        if (extractRes.ok) {
          const extractData = await extractRes.json() as {
            query?: { pages?: Record<string, { extract?: string }> };
          };
          const pages = Object.values(extractData.query?.pages ?? {});
          const extract = pages[0]?.extract;
          if (extract && extract.length > 50) {
            // Upgrade the snippet with the full extract
            topWikiResult.snippet = extract.slice(0, 350);
          }
        }
      } catch {
        // Extract failed — keep existing snippet
      }
    }
  }

  // ── 4. Always include a DuckDuckGo search link ───────────────────────────
  results.push({
    title: `More results for "${query}"`,
    url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    snippet: `Search DuckDuckGo for more results about "${query}".`,
    relevance: 0.3,
    source: "DuckDuckGo",
  });

  const sliced = results.slice(0, 5);
  return {
    query,
    results: sliced,
    totalResults: sliced.length,
    searchTime: Date.now() - start,
  };
}
