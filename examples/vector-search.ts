/**
 * Vector Database Integration Example
 * 
 * This example demonstrates how to:
 * 1. Add summaries to the vector database
 * 2. Search for semantically similar summaries
 * 3. Import semantically similar summaries from other chats
 */

import { ContinuityAPI } from '../src/api';

// Create a new instance
const continuity = new ContinuityAPI();

// Example function to process an AI response
async function processAiResponse(response: string, chatId: string): Promise<void> {
  console.log(`Processing response for chat ${chatId}:`);
  console.log(response);
  console.log('---');
  
  // Process the response
  await continuity.processResponse(response, chatId);
}

// Example function to display summaries
async function displaySummaries(chatId: string): Promise<void> {
  const summaries = await continuity.getSummaries(chatId);
  
  console.log(`Summaries for chat ${chatId}:`);
  
  if (summaries.length === 0) {
    console.log('No summaries found.');
    return;
  }
  
  for (const summary of summaries) {
    console.log(`- [${summary.category || 'uncategorized'}] ${summary.context}`);
  }
  
  console.log('---');
}

// Example function to search for similar summaries
async function searchSimilarSummaries(query: string, chatId: string): Promise<void> {
  console.log(`Searching for summaries similar to: "${query}" in chat ${chatId}`);
  
  const results = await continuity.searchSimilarSummaries(query, chatId);
  
  if (results.length === 0) {
    console.log('No similar summaries found.');
    return;
  }
  
  for (const result of results) {
    console.log(`- [${result.score.toFixed(2)}] ${result.summary.context}`);
  }
  
  console.log('---');
}

// Example function to import similar summaries
async function importSimilarSummaries(
  query: string,
  sourceChatId: string,
  targetChatId: string
): Promise<void> {
  console.log(`Importing summaries similar to: "${query}" from chat ${sourceChatId} to ${targetChatId}`);
  
  const importedSummaries = await continuity.importSimilarSummaries(
    query,
    sourceChatId,
    targetChatId
  );
  
  console.log(`Imported ${importedSummaries.length} summaries.`);
  
  if (importedSummaries.length > 0) {
    console.log('Imported summaries:');
    for (const summary of importedSummaries) {
      console.log(`- [${summary.category || 'uncategorized'}] ${summary.context}`);
    }
  }
  
  console.log('---');
}

// Main example function
async function runExample(): Promise<void> {
  try {
    // Create chat IDs
    const chatId1 = 'fitness-app-chat';
    const chatId2 = 'recipe-app-chat';
    const chatId3 = 'new-fitness-chat';
    
    // Example 1: Add summaries to the first chat (fitness app)
    console.log('Example 1: Adding summaries to fitness app chat');
    
    await processAiResponse(`
<add_summary>
  <category>requirements</category>
  <priority>high</priority>
  <context>The fitness app should track steps, calories, and heart rate</context>
</add_summary>
Let's start by implementing step tracking.
    `, chatId1);
    
    await processAiResponse(`
<add_summary>
  <category>design</category>
  <priority>medium</priority>
  <context>The fitness app should have a dark mode UI with blue accents</context>
</add_summary>
Dark mode will help users check their fitness stats at night.
    `, chatId1);
    
    await processAiResponse(`
<add_summary>
  <category>technical</category>
  <priority>medium</priority>
  <context>The fitness app should use HealthKit on iOS and Google Fit on Android</context>
</add_summary>
This will ensure we get accurate health data.
    `, chatId1);
    
    await displaySummaries(chatId1);
    
    // Example 2: Add summaries to the second chat (recipe app)
    console.log('Example 2: Adding summaries to recipe app chat');
    
    await processAiResponse(`
<add_summary>
  <category>requirements</category>
  <priority>high</priority>
  <context>The recipe app should allow users to search for recipes by ingredients</context>
</add_summary>
This will help users find recipes based on what they have in their kitchen.
    `, chatId2);
    
    await processAiResponse(`
<add_summary>
  <category>design</category>
  <priority>medium</priority>
  <context>The recipe app should have a clean, minimalist design with food photography</context>
</add_summary>
High-quality food photos will make the recipes more appealing.
    `, chatId2);
    
    await processAiResponse(`
<add_summary>
  <category>technical</category>
  <priority>medium</priority>
  <context>The recipe app should cache recipes offline for use without internet</context>
</add_summary>
This will allow users to access their saved recipes anywhere.
    `, chatId2);
    
    await displaySummaries(chatId2);
    
    // Example 3: Search for similar summaries in the fitness app chat
    console.log('Example 3: Searching for similar summaries');
    
    await searchSimilarSummaries('track health data and calories', chatId1);
    await searchSimilarSummaries('user interface design', chatId1);
    
    // Example 4: Import similar summaries from one chat to another
    console.log('Example 4: Importing similar summaries between chats');
    
    // Import fitness tracking related summaries to a new chat
    await importSimilarSummaries(
      'fitness tracking and health monitoring',
      chatId1,
      chatId3
    );
    
    // Display the imported summaries
    await displaySummaries(chatId3);
    
    // Example 5: Cross-domain semantic search
    console.log('Example 5: Cross-domain semantic search');
    
    // Search for UI design related summaries across both apps
    console.log('Searching for UI design related summaries in fitness app:');
    await searchSimilarSummaries('user interface and visual design', chatId1);
    
    console.log('Searching for UI design related summaries in recipe app:');
    await searchSimilarSummaries('user interface and visual design', chatId2);
    
    console.log('Example completed successfully!');
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Run the example
runExample();