// Test DuckDuckGo search import and functionality
async function testSearch() {
  try {
    console.log('Testing DuckDuckGo search import...');
    
    // Try importing the module
    const { DuckDuckGoSearch } = await import('@langchain/community/tools/duckduckgo_search');
    console.log('✓ Import successful');
    
    // Try creating an instance
    const search = new DuckDuckGoSearch({ maxResults: 3 });
    console.log('✓ Instance created');
    
    // Try performing a search
    console.log('Performing search...');
    const results = await search.call('test query');
    console.log('✓ Search results:', results);
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSearch();
