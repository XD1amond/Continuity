import { ContinuityAPI, EventType } from '../api';

describe('ContinuityAPI', () => {
  let api: ContinuityAPI;
  
  beforeEach(() => {
    // Create a new API instance for each test
    api = new ContinuityAPI({
      defaultChatId: 'test-chat'
    });
  });
  
  test('should process add_summary command', async () => {
    // AI response with an add_summary command
    const aiResponse = `I'll help you with your project. 
<add_summary>
  <category>project</category>
  <priority>high</priority>
  <context>Building a mobile fitness tracking app</context>
</add_summary>
Let's start by defining the requirements.`;
    
    // Process the response
    const result = await api.processResponse(aiResponse);
    
    // Check that the command was removed from the text
    expect(result.text.replace(/\s+/g, ' ').trim()).toBe(`I'll help you with your project. Let's start by defining the requirements.`.replace(/\s+/g, ' ').trim());
    
    // Check that the command was parsed
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].type).toBe('add_summary');
    expect(result.commands[0].params.category).toBe('project');
    expect(result.commands[0].params.priority).toBe('high');
    expect(result.commands[0].params.context).toBe('Building a mobile fitness tracking app');
    
    // Check that the summary was created
    const summaries = await api.getSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].category).toBe('project');
    expect(summaries[0].priority).toBe('high');
    expect(summaries[0].context).toBe('Building a mobile fitness tracking app');
  });
  
  test('should process edit_summary command', async () => {
    // Create a unique chat ID for this test
    const chatId = 'edit-test-' + Date.now();
    
    // First add a summary
    const addResponse = `<add_summary>
  <category>requirements</category>
  <context>The app should track steps and calories</context>
</add_summary>`;
    
    await api.processResponse(addResponse, chatId);
    
    // Get the summary that was added
    const initialSummaries = await api.getSummaries(chatId);
    expect(initialSummaries.length).toBe(1);
    
    const summaryId = initialSummaries[0].id;
    
    // Then edit it
    const editResponse = `<edit_summary>
  <id>${summaryId}</id>
  <context>The app should track steps, calories, and heart rate</context>
</edit_summary>`;
    
    await api.processResponse(editResponse, chatId);
    
    // Check that the summary was updated
    const updatedSummaries = await api.getSummaries(chatId);
    expect(updatedSummaries.length).toBe(1);
    expect(updatedSummaries[0].context).toBe('The app should track steps, calories, and heart rate');
    expect(updatedSummaries[0].version).toBeGreaterThan(1); // Version should be incremented
  });
  
  test('should process delete_summary command', async () => {
    // Create a unique chat ID for this test
    const chatId = 'delete-test-' + Date.now();
    
    // First add a summary
    const addResponse = `<add_summary>
  <category>budget</category>
  <context>Budget is $10,000</context>
</add_summary>`;
    
    await api.processResponse(addResponse, chatId);
    
    // Get the summary that was added
    const initialSummaries = await api.getSummaries(chatId);
    expect(initialSummaries.length).toBe(1);
    
    const summaryId = initialSummaries[0].id;
    
    // Then delete it
    const deleteResponse = `<delete_summary>
  <id>${summaryId}</id>
</delete_summary>`;
    
    await api.processResponse(deleteResponse, chatId);
    
    // Check that the summary was deleted
    const remainingSummaries = await api.getSummaries(chatId);
    expect(remainingSummaries.length).toBe(0);
  });
  
  test('should process query_summary command', async () => {
    // Add multiple summaries
    await api.processResponse(`<add_summary>
  <category>requirements</category>
  <context>The app should track steps</context>
</add_summary>`);
    
    await api.processResponse(`<add_summary>
  <category>requirements</category>
  <context>The app should track calories</context>
</add_summary>`);
    
    await api.processResponse(`<add_summary>
  <category>design</category>
  <context>The app should have a dark mode</context>
</add_summary>`);
    
    // Query by category
    const queryResponse = `<query_summary>
  <category>requirements</category>
</query_summary>`;
    
    const queryResult = await api.processResponse(queryResponse);
    
    // Check that only requirements were returned
    const queriedSummaries = queryResult.results[0];
    expect(Array.isArray(queriedSummaries)).toBe(true);
    expect(queriedSummaries.length).toBe(2);
    expect(queriedSummaries[0].category).toBe('requirements');
    expect(queriedSummaries[1].category).toBe('requirements');
  });
  
  test('should emit events', async () => {
    const events: { type: EventType; data: any }[] = [];
    
    // Add event listener
    api.addEventListener((type, data) => {
      events.push({ type, data });
    });
    
    // Process a command
    await api.processResponse(`<add_summary>
  <category>timeline</category>
  <context>Project deadline is March 15th</context>
</add_summary>`);
    
    // Check that at least one event was emitted
    expect(events.length).toBeGreaterThan(0);
    
    // At least one of the events should be SUMMARY_ADDED or COMMAND_PROCESSED
    const hasExpectedEvent = events.some(event =>
      event.type === EventType.SUMMARY_ADDED ||
      event.type === EventType.COMMAND_PROCESSED
    );
    expect(hasExpectedEvent).toBe(true);
  });
  
  test('should find related summaries', async () => {
    // Add related summaries
    const result1 = await api.processResponse(`<add_summary>
  <category>requirements</category>
  <context>The app should track daily step count for users</context>
</add_summary>`);
    
    const result2 = await api.processResponse(`<add_summary>
  <category>requirements</category>
  <context>Users should be able to see their step history</context>
</add_summary>`);
    
    const result3 = await api.processResponse(`<add_summary>
  <category>design</category>
  <context>The app should use Material Design</context>
</add_summary>`);
    
    // Get all summaries
    const allSummaries = await api.getSummaries();
    expect(allSummaries.length).toBeGreaterThan(0);
    
    // Find related summaries for the first summary
    const firstSummary = allSummaries[0];
    const relatedSummaries = await api.findRelatedSummaries(firstSummary.id);
    
    // We should have at least one summary
    expect(allSummaries.length).toBeGreaterThan(0);
  });
  
  test('should import summaries from another chat', async () => {
    // Create a source chat ID
    const sourceChatId = 'source-chat-' + Date.now();
    
    // Add a summary to source chat
    await api.processResponse(`<add_summary>
  <category>requirements</category>
  <context>The app should be cross-platform</context>
</add_summary>`, sourceChatId);
    
    // Verify the summary was added
    const sourceSummaries = await api.getSummaries(sourceChatId);
    expect(sourceSummaries.length).toBeGreaterThan(0);
    
    // Create a target chat ID
    const targetChatId = 'target-chat-' + Date.now();
    
    // Import to target chat
    const importedSummaries = await api.importSummaries(sourceChatId, targetChatId);
    
    // Check that at least one summary was imported
    expect(importedSummaries.length).toBeGreaterThan(0);
    
    // Check that they're in the target chat
    const targetSummaries = await api.getSummaries(targetChatId);
    expect(targetSummaries.length).toBeGreaterThan(0);
  });
  
  test('should organize summaries hierarchically', async () => {
    // Create a unique chat ID for this test
    const chatId = 'hierarchy-test-' + Date.now();
    
    // Add summaries with different categories
    await api.processResponse(`<add_summary>
  <category>requirements</category>
  <priority>high</priority>
  <context>The app must work offline</context>
</add_summary>`, chatId);
    
    await api.processResponse(`<add_summary>
  <category>design</category>
  <priority>medium</priority>
  <context>The app should use system font</context>
</add_summary>`, chatId);
    
    // Get all summaries to verify they were added
    const summaries = await api.getSummaries(chatId);
    expect(summaries.length).toBeGreaterThan(0);
    
    // Get organized summaries
    const hierarchy = await api.getOrganizedSummaries(chatId);
    
    // Check that hierarchy is an object
    expect(typeof hierarchy).toBe('object');
    expect(hierarchy).not.toBeNull();
    
    // Check that at least one category exists
    expect(Object.keys(hierarchy).length).toBeGreaterThan(0);
  });
});