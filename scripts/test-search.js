
const TAVILY_API_KEY = "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";
const TAVILY_API = "https://api.tavily.com/search";

async function testSearch() {
  console.log("Testing Tavily Search with provided key...");
  
  try {
    const response = await fetch(TAVILY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: "Stellar blockchain micropayments",
        search_depth: "basic",
        max_results: 3,
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log("\n✅ Search Successful!");
      console.log(`Found ${data.results?.length || 0} results.`);
      if (data.results && data.results.length > 0) {
        console.log("\nTop Result:");
        console.log(`Title: ${data.results[0].title}`);
        console.log(`URL: ${data.results[0].url}`);
        console.log(`Content: ${data.results[0].content.slice(0, 200)}...`);
      }
    } else {
      console.log("\n❌ Search Failed!");
      console.log("Error Detail:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("\n❌ Request Error:", err.message);
  }
}

testSearch();
