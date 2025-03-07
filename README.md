# Continuity: AI Knowledge Preservation Framework

Continuity is a lightweight framework that enables AI systems to actively manage conversation knowledge by identifying and preserving crucial information throughout interactions. It allows LLMs to selectively save important context using XML-based commands, maintaining critical information across conversation boundaries and making it available for future sessions.

## Features

- **XML-Based Knowledge Tagging System**: Enable LLMs to use structured XML commands to add, edit, and organize critical information
- **Chat ID Association**: Associate summary entries with specific chat IDs and enable cross-chat knowledge retrieval
- **Knowledge Management**: Hierarchical organization of preserved information with automatic detection of related information
- **Clean Integration API**: Simple API for host application integration with event hooks and methods for knowledge retrieval
- **Vector Database Integration**: Semantic search for finding related information based on meaning, not just exact matches
- **RAGs Integration**: Retrieval-Augmented Generation support for enhancing AI responses with relevant information

## Installation

```bash
npm install continuity
```

## Quick Start

```typescript
import { ContinuityAPI } from 'continuity';

// Create a new instance with default options
const continuity = new ContinuityAPI();

// Process an AI response with XML commands
const aiResponse = `I'll help you with your project. 
<add_summary><category>project</category><context>Building a mobile fitness tracking app</context></add_summary>
Let's start by defining the requirements.`;

// Process the response
const result = await continuity.processResponse(aiResponse, 'chat-123');

console.log(result.text); // "I'll help you with your project. Let's start by defining the requirements."
console.log(result.commands); // Array of parsed commands
console.log(result.results); // Array of command execution results

// Retrieve summaries
const summaries = await continuity.getSummaries('chat-123');
console.log(summaries);
```

## XML Command Structure

### Add Summary

```xml
<add_summary>
  <linenumber>1-2</linenumber>
  <category>objective</category>
  <priority>high</priority>
  <context>The user wants to build a mobile app for tracking fitness activities</context>
</add_summary>
```

### Edit Summary

```xml
<edit_summary>
  <id>summary-id-here</id>
  <context>Budget constraint: $5000 maximum for development</context>
</edit_summary>
```

### Delete Summary

```xml
<delete_summary>
  <id>summary-id-here</id>
</delete_summary>
```

### Query Summary

```xml
<query_summary>
  <category>requirements</category>
</query_summary>
```

### Save User Data (RAGs)

```xml
<save_user_data>
  <key>user_preference</key>
  <value>The user prefers dark mode and minimalist design</value>
</save_user_data>
```

### Retrieve User Data (RAGs)

```xml
<retrieve_user_data>
  <key>user_preference</key>
</retrieve_user_data>
```

Or retrieve by semantic search:

```xml
<retrieve_user_data>
  <query>What are the user's design preferences?</query>
  <limit>3</limit>
</retrieve_user_data>
```

## API Reference

### ContinuityAPI

The main class for interacting with the Continuity framework.

#### Constructor

```typescript
new ContinuityAPI(options?: ContinuityOptions)
```

Options:
- `storage`: Storage configuration options
- `context`: Context manager configuration options
- `rags`: RAGs configuration options
  - `enabled`: Enable RAGs functionality (default: false)
  - `openAiApiKey`: OpenAI API key for embeddings (optional)
  - `embeddingModel`: Embedding model to use (default: 'text-embedding-ada-002')
  - `useLocalEmbeddings`: Use local embeddings instead of OpenAI (default: true)
  - `maxResults`: Maximum number of results to return (default: 5)
  - `similarityThreshold`: Minimum similarity threshold (default: 0.5)
- `defaultChatId`: Default chat ID to use if none is provided

#### Methods

##### processResponse

Process AI response text to extract and handle commands.

```typescript
async processResponse(text: string, chatId?: string): Promise<{
  text: string;
  commands: Command[];
  results: any[];
}>
```

##### getSummaries

Get all summaries for a chat.

```typescript
async getSummaries(chatId?: string): Promise<SummaryEntry[]>
```

##### getSummary

Get a specific summary by ID.

```typescript
async getSummary(id: string): Promise<SummaryEntry | null>
```

##### querySummaries

Query summaries based on criteria.

```typescript
async querySummaries(options: QueryOptions, chatId?: string): Promise<SummaryEntry[]>
```

##### findRelatedSummaries

Find related summaries for a given summary.

```typescript
async findRelatedSummaries(summaryId: string, chatId?: string): Promise<SummaryEntry[]>
```

##### importSummaries

Import summaries from another chat.

```typescript
async importSummaries(
  sourceChatId: string,
  targetChatId?: string,
  filter?: (entry: SummaryEntry) => boolean
): Promise<SummaryEntry[]>
```

##### getOrganizedSummaries

Organize summaries into a hierarchical structure.

```typescript
async getOrganizedSummaries(chatId?: string): Promise<any>
```

##### searchSimilarSummaries

Search for semantically similar summaries based on meaning rather than exact matches.

```typescript
async searchSimilarSummaries(
  query: string,
  chatId?: string,
  limit?: number,
  threshold?: number
): Promise<{ summary: SummaryEntry; score: number }[]>
```

##### importSimilarSummaries

Import semantically similar summaries from another chat based on a search query.

```typescript
async importSimilarSummaries(
  query: string,
  sourceChatId: string,
  targetChatId?: string,
  limit?: number,
  threshold?: number
): Promise<SummaryEntry[]>
```

##### generateChatId

Generate a new chat ID.

```typescript
generateChatId(): string
```

##### addEventListener

Add an event listener.

```typescript
addEventListener(listener: EventListener): void
```

##### removeEventListener

Remove an event listener.

```typescript
removeEventListener(listener: EventListener): void
```

### Events

The framework emits the following events:

- `SUMMARY_ADDED`: When a new summary is added
- `SUMMARY_UPDATED`: When a summary is updated
- `SUMMARY_DELETED`: When a summary is deleted
- `COMMAND_PROCESSED`: When a command is processed
- `ERROR`: When an error occurs

## Advanced Usage

### Custom Storage Adapter

You can implement a custom storage adapter to persist summaries in a database or other storage system.

```typescript
import { StorageAdapter, StorageManager, SummaryEntry } from 'continuity';

// Implement a custom storage adapter
class MyDatabaseAdapter implements StorageAdapter {
  async save(entry: SummaryEntry): Promise<SummaryEntry> {
    // Save to database
    return entry;
  }
  
  async getById(id: string): Promise<SummaryEntry | null> {
    // Get from database
    return null;
  }
  
  // Implement other required methods...
}

// Create a storage manager with the custom adapter
const storageManager = new StorageManager({
  adapter: new MyDatabaseAdapter()
});

// Create a Continuity API instance with the custom storage
const continuity = new ContinuityAPI({
  storage: {
    adapter: new MyDatabaseAdapter()
  }
});
```

### Importing Summaries from Previous Conversations

```typescript
// Import all summaries from a previous chat
const importedSummaries = await continuity.importSummaries(
  'previous-chat-id',
  'current-chat-id'
);

// Import only high priority summaries
const highPrioritySummaries = await continuity.importSummaries(
  'previous-chat-id',
  'current-chat-id',
  (entry) => entry.priority === 'high'
);
```

### Hierarchical Organization

```typescript
// Get hierarchically organized summaries
const organizedSummaries = await continuity.getOrganizedSummaries('chat-123');

// Example output:
// {
//   "project": {
//     "entries": [...],
//     "subcategories": {}
//   },
//   "requirements": {
//     "entries": [...],
//     "subcategories": {}
//   }
// }
```

### Semantic Search with Vector Database

The framework includes a vector database for semantic search, allowing you to find information based on meaning rather than exact keyword matches.

```typescript
// Search for semantically similar summaries
const results = await continuity.searchSimilarSummaries(
  'fitness tracking and health monitoring',
  'chat-123',
  5,    // limit: maximum number of results
  0.5   // threshold: minimum similarity score (0-1)
);

// Display results with similarity scores
for (const result of results) {
  console.log(`[${result.score.toFixed(2)}] ${result.summary.context}`);
}

// Import semantically similar summaries from another chat
const importedSummaries = await continuity.importSimilarSummaries(
  'user interface design',
  'source-chat-id',
  'target-chat-id',
  3,    // limit: maximum number of summaries to import
  0.6   // threshold: minimum similarity score (0-1)
);
```

This is particularly useful when users reach context limits in conversations, as it allows retrieving relevant information from previous chats based on semantic similarity rather than requiring exact matches.

### RAGs Integration for Enhanced AI Responses

The framework includes support for Retrieval-Augmented Generation (RAGs), allowing AI systems to save and retrieve user data to enhance responses with relevant information.

```typescript
// Create a Continuity API instance with RAGs enabled
const continuity = new ContinuityAPI({
  rags: {
    enabled: true,
    openAiApiKey: 'your-openai-api-key', // Optional, for better embeddings
    maxResults: 5,
    similarityThreshold: 0.5
  }
});

// Process AI response with save_user_data command
await continuity.processResponse(`
<save_user_data>
  <key>favorite_color</key>
  <value>blue</value>
</save_user_data>
I'll remember your favorite color is blue.
`, 'chat-123');

// Later, retrieve user data by key
const result = await continuity.processResponse(`
<retrieve_user_data>
  <key>favorite_color</key>
</retrieve_user_data>
`, 'chat-123');

// Or retrieve semantically similar user data
const result = await continuity.processResponse(`
<retrieve_user_data>
  <query>What are the user's preferences?</query>
  <limit>3</limit>
</retrieve_user_data>
`, 'chat-123');
```

This enables AI systems to maintain a persistent memory of user information and preferences, which can be retrieved contextually to provide more personalized and relevant responses.

## License

MIT