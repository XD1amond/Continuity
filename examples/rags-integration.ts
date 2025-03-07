/**
 * RAGs (Retrieval-Augmented Generation) Integration Example
 * 
 * This example demonstrates how to:
 * 1. Enable RAGs functionality in the Continuity framework
 * 2. Save user data using XML commands
 * 3. Retrieve user data using semantic search
 * 4. Use RAGs to enhance AI responses with relevant information
 */

import { ContinuityAPI, OpenAIEmbeddingProvider } from '../src';

// Create a new instance with RAGs enabled
const continuity = new ContinuityAPI({
  defaultChatId: 'rags-example-chat',
  rags: {
    enabled: true,
    useLocalEmbeddings: true, // Use local embeddings for demo purposes
    // In production, you would use OpenAI embeddings:
    // openAiApiKey: 'your-openai-api-key',
    // embeddingModel: 'text-embedding-ada-002',
    maxResults: 5,
    similarityThreshold: 0.5
  }
});

// Example function to process an AI response
async function processAiResponse(response: string, chatId: string): Promise<void> {
  console.log(`Processing response for chat ${chatId}:`);
  console.log(response);
  console.log('---');
  
  // Process the response
  const result = await continuity.processResponse(response, chatId);
  
  console.log('Processed response:');
  console.log(result.text);
  console.log('---');
  
  console.log('Commands processed:');
  console.log(JSON.stringify(result.commands, null, 2));
  console.log('---');
}

// Example function to simulate an AI generating a response with RAGs
async function generateAiResponseWithRags(userQuery: string, chatId: string): Promise<string> {
  console.log(`Generating response for query: "${userQuery}" in chat ${chatId}`);
  
  // First, retrieve relevant user data using RAGs
  const retrieveCommand = `<retrieve_user_data>
  <query>${userQuery}</query>
  <limit>3</limit>
</retrieve_user_data>`;
  
  const retrieveResult = await continuity.processResponse(retrieveCommand, chatId);
  const userData = retrieveResult.results[0];
  
  console.log('Retrieved user data:');
  console.log(JSON.stringify(userData, null, 2));
  console.log('---');
  
  // Simulate AI using the retrieved data to generate a response
  let aiResponse = `Based on what I know about you, `;
  
  if (userData.results && userData.results.length > 0) {
    // Use the retrieved information in the response
    aiResponse += `I can see that:\n\n`;
    
    for (const item of userData.results) {
      aiResponse += `- ${item.key}: ${item.value}\n`;
    }
    
    aiResponse += `\nIs there anything specific about these topics you'd like to discuss further?`;
  } else {
    aiResponse += `I don't have much information about that yet. Would you like to tell me more?`;
  }
  
  return aiResponse;
}

// Main example function
async function runExample(): Promise<void> {
  try {
    const chatId = 'rags-example-chat';
    
    // Example 1: Save user data
    console.log('Example 1: Saving user data');
    
    await processAiResponse(`
<save_user_data>
  <key>name</key>
  <value>John Smith</value>
</save_user_data>
I'll remember your name is John Smith.
    `, chatId);
    
    await processAiResponse(`
<save_user_data>
  <key>favorite_color</key>
  <value>blue</value>
</save_user_data>
I've noted that your favorite color is blue.
    `, chatId);
    
    await processAiResponse(`
<save_user_data>
  <key>job</key>
  <value>software engineer</value>
</save_user_data>
I'll remember that you work as a software engineer.
    `, chatId);
    
    await processAiResponse(`
<save_user_data>
  <key>hobby</key>
  <value>playing guitar and hiking on weekends</value>
</save_user_data>
Great! I've saved that you enjoy playing guitar and hiking on weekends.
    `, chatId);
    
    await processAiResponse(`
<save_user_data>
  <key>location</key>
  <value>San Francisco, California</value>
</save_user_data>
I've noted that you're located in San Francisco, California.
    `, chatId);
    
    // Example 2: Retrieve user data by key
    console.log('\nExample 2: Retrieving user data by key');
    
    await processAiResponse(`
<retrieve_user_data>
  <key>name</key>
</retrieve_user_data>
Your name is John Smith.
    `, chatId);
    
    // Example 3: Retrieve user data by semantic search
    console.log('\nExample 3: Retrieving user data by semantic search');
    
    await processAiResponse(`
<retrieve_user_data>
  <query>What are the user's interests and activities?</query>
  <limit>2</limit>
</retrieve_user_data>
Based on what I know, you enjoy playing guitar and hiking on weekends.
    `, chatId);
    
    // Example 4: Simulate AI generating responses with RAGs
    console.log('\nExample 4: Generating AI responses with RAGs');
    
    const queries = [
      "What do I like to do for fun?",
      "Where do I live?",
      "What do I do for work?"
    ];
    
    for (const query of queries) {
      const aiResponse = await generateAiResponseWithRags(query, chatId);
      console.log(`User query: ${query}`);
      console.log(`AI response: ${aiResponse}`);
      console.log('---');
    }
    
    console.log('Example completed successfully!');
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Run the example
runExample();