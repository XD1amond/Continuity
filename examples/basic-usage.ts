/**
 * Basic usage example for the Continuity framework
 * 
 * This example demonstrates how to:
 * 1. Initialize the Continuity API
 * 2. Process AI responses with XML commands
 * 3. Retrieve and manage summaries
 * 4. Use event listeners
 */

import { ContinuityAPI, EventType } from '../src/api';

// Create a new instance with default options
const continuity = new ContinuityAPI({
  defaultChatId: 'example-chat'
});

// Add an event listener to log events
continuity.addEventListener((eventType, data) => {
  console.log(`Event: ${eventType}`, data);
});

// Example function to process an AI response
async function processAiResponse(response: string, chatId?: string) {
  console.log('Original AI response:');
  console.log(response);
  console.log('---');
  
  // Process the response
  const result = await continuity.processResponse(response, chatId);
  
  console.log('Processed response (commands removed):');
  console.log(result.text);
  console.log('---');
  
  console.log('Parsed commands:');
  console.log(JSON.stringify(result.commands, null, 2));
  console.log('---');
  
  return result;
}

// Example function to display all summaries for a chat
async function displaySummaries(chatId?: string) {
  const summaries = await continuity.getSummaries(chatId);
  
  console.log(`Summaries for chat ${chatId || 'example-chat'}:`);
  
  if (summaries.length === 0) {
    console.log('No summaries found.');
    return;
  }
  
  for (const summary of summaries) {
    console.log(`- [${summary.category || 'uncategorized'}] ${summary.context}`);
    console.log(`  ID: ${summary.id}, Priority: ${summary.priority || 'none'}`);
    console.log(`  Created: ${summary.createdAt.toISOString()}`);
    console.log('');
  }
}

// Example function to display hierarchically organized summaries
async function displayOrganizedSummaries(chatId?: string) {
  const hierarchy = await continuity.getOrganizedSummaries(chatId);
  
  console.log(`Organized summaries for chat ${chatId || 'example-chat'}:`);
  
  for (const category in hierarchy) {
    console.log(`Category: ${category}`);
    
    for (const entry of hierarchy[category].entries) {
      console.log(`- [${entry.priority || 'none'}] ${entry.context}`);
    }
    
    console.log('');
  }
}

// Main example function
async function runExample() {
  try {
    // Example 1: Process a response with add_summary command
    console.log('Example 1: Adding a summary');
    await processAiResponse(`I'll help you with your project. 
<add_summary>
  <category>project</category>
  <priority>high</priority>
  <context>Building a mobile fitness tracking app</context>
</add_summary>
Let's start by defining the requirements.`);
    
    await displaySummaries();
    
    // Example 2: Process a response with multiple commands
    console.log('\nExample 2: Adding multiple summaries');
    await processAiResponse(`Let's define the key requirements:
<add_summary>
  <category>requirements</category>
  <priority>high</priority>
  <context>The app must track steps, calories, and distance</context>
</add_summary>
<add_summary>
  <category>requirements</category>
  <priority>medium</priority>
  <context>The app should sync with fitness devices</context>
</add_summary>
<add_summary>
  <category>requirements</category>
  <priority>low</priority>
  <context>The app could have social sharing features</context>
</add_summary>
These requirements will guide our development process.`);
    
    await displaySummaries();
    
    // Example 3: Query summaries by category
    console.log('\nExample 3: Querying summaries');
    const queryResult = await continuity.querySummaries({ category: 'requirements' });
    
    console.log('Requirements summaries:');
    for (const summary of queryResult) {
      console.log(`- [${summary.priority}] ${summary.context}`);
    }
    
    // Example 4: Organize summaries hierarchically
    console.log('\nExample 4: Hierarchical organization');
    await displayOrganizedSummaries();
    
    // Example 5: Edit a summary
    console.log('\nExample 5: Editing a summary');
    const summaries = await continuity.getSummaries();
    const summaryToEdit = summaries.find(s => s.category === 'requirements' && s.priority === 'high');
    
    if (summaryToEdit) {
      await processAiResponse(`I need to update the high priority requirement:
<edit_summary>
  <id>${summaryToEdit.id}</id>
  <context>The app must track steps, calories, distance, and heart rate</context>
</edit_summary>
This will make the app more comprehensive.`);
      
      await displaySummaries();
    }
    
    // Example 6: Import summaries to a new chat
    console.log('\nExample 6: Importing summaries to a new chat');
    const newChatId = continuity.generateChatId();
    
    // Import only high priority summaries
    const importedSummaries = await continuity.importSummaries(
      'example-chat',
      newChatId,
      (entry) => entry.priority === 'high'
    );
    
    console.log(`Imported ${importedSummaries.length} high priority summaries to chat ${newChatId}`);
    await displaySummaries(newChatId);
    
    console.log('\nExample completed successfully!');
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Run the example
runExample();