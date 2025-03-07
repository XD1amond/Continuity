/**
 * Integration API module for host application integration
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Command,
  CommandType,
  SummaryEntry,
  ContinuityOptions,
  QueryOptions,
  RagsOptions
} from './types';
import { XmlParser, parser } from './parser';
import { StorageManager, storage } from './storage';
import { ContextManager, context } from './context';
import { VectorDatabase, vectorDb, TextVector, VectorSearchResult } from './vector';
import {
  RagsManager,
  rags,
  EmbeddingProvider,
  DefaultEmbeddingProvider,
  OpenAIEmbeddingProvider,
  RagsRetrievalOptions,
  RagsRetrievalResult
} from './rags';

/**
 * Event types emitted by the Continuity API
 */
export enum EventType {
  SUMMARY_ADDED = 'summary_added',
  SUMMARY_UPDATED = 'summary_updated',
  SUMMARY_DELETED = 'summary_deleted',
  COMMAND_PROCESSED = 'command_processed',
  ERROR = 'error'
}

/**
 * Event listener type
 */
export type EventListener = (eventType: EventType, data: any) => void;

/**
 * Main Continuity API class
 * This is the primary interface for host applications to interact with the framework
 */
export class ContinuityAPI {
  private parser: XmlParser;
  private storage: StorageManager;
  private context: ContextManager;
  private vectorDb: VectorDatabase;
  private ragsManager: RagsManager;
  private options: Required<ContinuityOptions>;
  private eventListeners: EventListener[] = [];
  
  /**
   * Default API options
   */
  private static readonly DEFAULT_OPTIONS: Required<ContinuityOptions> = {
    storage: {},
    context: {},
    rags: {
      enabled: false,
      useLocalEmbeddings: true,
      maxResults: 5,
      similarityThreshold: 0.5
    },
    defaultChatId: 'default'
  };
  
  /**
   * Create a new ContinuityAPI instance
   */
  constructor(options: ContinuityOptions = {}) {
    this.options = {
      ...ContinuityAPI.DEFAULT_OPTIONS,
      ...options,
      storage: { ...ContinuityAPI.DEFAULT_OPTIONS.storage, ...options.storage },
      context: { ...ContinuityAPI.DEFAULT_OPTIONS.context, ...options.context },
      rags: { ...ContinuityAPI.DEFAULT_OPTIONS.rags, ...options.rags }
    };
    
    this.parser = parser;
    this.storage = storage;
    this.context = context;
    this.vectorDb = vectorDb;
    
    // Initialize RAGs manager
    this.ragsManager = rags;
    
    // Configure embedding provider if OpenAI API key is provided
    if (this.options.rags.enabled) {
      if (this.options.rags.openAiApiKey) {
        const openAiProvider = new OpenAIEmbeddingProvider(
          this.options.rags.openAiApiKey,
          this.options.rags.embeddingModel
        );
        this.ragsManager.setEmbeddingProvider(openAiProvider);
      } else if (!this.options.rags.useLocalEmbeddings) {
        console.warn('OpenAI API key not provided but useLocalEmbeddings is false. Falling back to local embeddings.');
      }
    }
  }
  
  /**
   * Process AI response text to extract and handle commands
   * 
   * @param text - The AI response text to process
   * @param chatId - The chat ID to associate with (defaults to the default chat ID)
   * @returns Processed text with commands removed and processing results
   */
  public async processResponse(text: string, chatId?: string): Promise<{
    text: string;
    commands: Command[];
    results: any[];
  }> {
    const effectiveChatId = chatId || this.options.defaultChatId;
    const commands = this.parser.parse(text);
    const results: any[] = [];
    
    for (const command of commands) {
      if (!this.parser.validateCommand(command)) {
        this.emitEvent(EventType.ERROR, {
          message: 'Invalid command',
          command
        });
        continue;
      }
      
      try {
        const result = await this.executeCommand(command, effectiveChatId);
        results.push(result);
        
        this.emitEvent(EventType.COMMAND_PROCESSED, {
          command,
          result
        });
      } catch (error) {
        this.emitEvent(EventType.ERROR, {
          message: 'Error executing command',
          command,
          error
        });
        
        // Add error to results to maintain index correspondence with commands
        results.push({ error: error instanceof Error ? error.message : String(error) });
      }
    }
    
    // Remove commands from the text
    const cleanedText = this.parser.removeCommands(text);
    
    return {
      text: cleanedText,
      commands,
      results
    };
  }
  
  /**
   * Execute a single command
   * 
   * @param command - The command to execute
   * @param chatId - The chat ID to associate with
   * @returns Result of the command execution
   */
  private async executeCommand(command: Command, chatId: string): Promise<any> {
    switch (command.type) {
      case CommandType.ADD_SUMMARY:
        return this.handleAddSummary(command, chatId);
        
      case CommandType.EDIT_SUMMARY:
        return this.handleEditSummary(command);
        
      case CommandType.DELETE_SUMMARY:
        return this.handleDeleteSummary(command);
        
      case CommandType.QUERY_SUMMARY:
        return this.handleQuerySummary(command, chatId);
        
      case CommandType.SAVE_USER_DATA:
        return this.handleSaveUserData(command, chatId);
        
      case CommandType.RETRIEVE_USER_DATA:
        return this.handleRetrieveUserData(command, chatId);
        
      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }
  }
  
  /**
   * Handle add_summary command
   */
  private async handleAddSummary(command: Command, chatId: string): Promise<SummaryEntry> {
    const { context: summaryContext, category, priority, lineNumber } = command.params;
    
    if (!summaryContext) {
      throw new Error('Context is required for add_summary command');
    }
    
    const entry = await this.storage.createSummary(
      chatId,
      summaryContext,
      category,
      priority,
      lineNumber
    );
    
    // Add to vector database for semantic search
    this.vectorDb.addSummaryEntry(entry);
    
    this.emitEvent(EventType.SUMMARY_ADDED, { entry });
    
    return entry;
  }
  
  /**
   * Handle edit_summary command
   */
  private async handleEditSummary(command: Command): Promise<SummaryEntry | null> {
    const { id, context, category, priority } = command.params;
    
    if (!id) {
      throw new Error('ID is required for edit_summary command');
    }
    
    const updates: Partial<SummaryEntry> = {};
    
    if (context !== undefined) {
      updates.context = context;
    }
    
    if (category !== undefined) {
      updates.category = category;
    }
    
    if (priority !== undefined) {
      updates.priority = priority as any;
    }
    
    const updatedEntry = await this.storage.updateSummary(id, updates);
    
    if (updatedEntry) {
      this.emitEvent(EventType.SUMMARY_UPDATED, { entry: updatedEntry });
    }
    
    return updatedEntry;
  }
  
  /**
   * Handle delete_summary command
   */
  private async handleDeleteSummary(command: Command): Promise<boolean> {
    const { id } = command.params;
    
    if (!id) {
      throw new Error('ID is required for delete_summary command');
    }
    
    const success = await this.storage.deleteSummary(id);
    
    if (success) {
      this.emitEvent(EventType.SUMMARY_DELETED, { id });
    }
    
    return success;
  }
  
  /**
   * Handle query_summary command
   */
  private async handleQuerySummary(command: Command, chatId: string): Promise<SummaryEntry[]> {
    const { category, priority } = command.params;
    
    const queryOptions: QueryOptions = {};
    
    if (category) {
      queryOptions.category = category;
    }
    
    if (priority) {
      queryOptions.priority = priority as any;
    }
    
    return this.storage.querySummaries(chatId, queryOptions);
  }
  
  /**
   * Handle save_user_data command
   * Saves user data as a summary entry with special category
   */
  private async handleSaveUserData(command: Command, chatId: string): Promise<SummaryEntry> {
    const { key, value } = command.params;
    
    if (!key) {
      throw new Error('Key is required for save_user_data command');
    }
    
    if (value === undefined) {
      throw new Error('Value is required for save_user_data command');
    }
    
    // Create a summary entry with the user data
    // Use 'user_data' as the category and the key as a subcategory
    const entry = await this.storage.createSummary(
      chatId,
      value,
      `user_data.${key}`,
      'medium'
    );
    
    // If RAGs is enabled, add to RAGs index
    if (this.options.rags.enabled) {
      await this.ragsManager.addEntry(entry);
    } else {
      // Otherwise just add to vector database
      this.vectorDb.addSummaryEntry(entry);
    }
    
    this.emitEvent(EventType.SUMMARY_ADDED, { entry });
    
    return entry;
  }
  
  /**
   * Handle retrieve_user_data command
   * Retrieves user data using either direct key lookup or RAGs
   */
  private async handleRetrieveUserData(command: Command, chatId: string): Promise<any> {
    const { key, query, limit } = command.params;
    const effectiveChatId = chatId || this.options.defaultChatId;
    
    // If key is provided, do a direct lookup
    if (key) {
      const queryOptions: QueryOptions = {
        category: `user_data.${key}`
      };
      
      const entries = await this.storage.querySummaries(effectiveChatId, queryOptions);
      
      if (entries.length > 0) {
        // Return the most recently created entry
        entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return {
          key,
          value: entries[0].context,
          entry: entries[0]
        };
      }
      
      return { key, value: null };
    }
    
    // If query is provided, use RAGs to find relevant data
    if (query) {
      const effectiveLimit = limit || this.options.rags.maxResults || 5;
      
      if (this.options.rags.enabled) {
        // Use RAGs manager for retrieval
        const retrievalOptions: RagsRetrievalOptions = {
          chatId: effectiveChatId,
          limit: effectiveLimit,
          threshold: this.options.rags.similarityThreshold,
          filter: (entry) => !!entry.category && entry.category.startsWith('user_data.')
        };
        
        const results = await this.ragsManager.retrieve(query, retrievalOptions);
        
        return {
          query,
          results: results.map(result => ({
            key: result.entry.category?.replace('user_data.', ''),
            value: result.entry.context,
            score: result.score,
            entry: result.entry
          }))
        };
      } else {
        // Fall back to vector database if RAGs is not enabled
        const results = this.vectorDb.searchWithFilter(
          query,
          metadata => metadata.chatId === effectiveChatId && !!metadata.category && metadata.category.startsWith('user_data.'),
          effectiveLimit,
          this.options.rags.similarityThreshold
        );
        
        // Convert results to user data format
        const userData = [];
        
        for (const result of results) {
          const summaryId = result.vector.metadata.summaryId;
          const entry = await this.storage.getSummary(summaryId);
          
          if (entry) {
            userData.push({
              key: entry.category?.replace('user_data.', ''),
              value: entry.context,
              score: result.score,
              entry
            });
          }
        }
        
        return {
          query,
          results: userData
        };
      }
    }
    
    throw new Error('Either key or query is required for retrieve_user_data command');
  }
  
  /**
   * Get all summaries for a chat
   * 
   * @param chatId - The chat ID to get summaries for (defaults to the default chat ID)
   * @returns Array of summary entries
   */
  public async getSummaries(chatId?: string): Promise<SummaryEntry[]> {
    const effectiveChatId = chatId || this.options.defaultChatId;
    return this.storage.getChatSummaries(effectiveChatId);
  }
  
  /**
   * Get a specific summary by ID
   * 
   * @param id - The summary ID to get
   * @returns The summary entry or null if not found
   */
  public async getSummary(id: string): Promise<SummaryEntry | null> {
    return this.storage.getSummary(id);
  }
  
  /**
   * Query summaries based on criteria
   * 
   * @param options - Query options
   * @param chatId - The chat ID to query (defaults to the default chat ID)
   * @returns Array of matching summary entries
   */
  public async querySummaries(options: QueryOptions, chatId?: string): Promise<SummaryEntry[]> {
    const effectiveChatId = chatId || this.options.defaultChatId;
    return this.storage.querySummaries(effectiveChatId, options);
  }
  
  /**
   * Find related summaries for a given summary
   * 
   * @param summaryId - The ID of the summary to find relations for
   * @param chatId - The chat ID to search within (defaults to the default chat ID)
   * @returns Array of related summary entries
   */
  public async findRelatedSummaries(summaryId: string, chatId?: string): Promise<SummaryEntry[]> {
    const effectiveChatId = chatId || this.options.defaultChatId;
    const entry = await this.storage.getSummary(summaryId);
    
    if (!entry) {
      return [];
    }
    
    return this.context.findRelatedSummaries(entry, effectiveChatId);
  }
  
  /**
   * Import summaries from another chat
   * 
   * @param sourceChatId - The source chat ID to import from
   * @param targetChatId - The target chat ID to import to (defaults to the default chat ID)
   * @param filter - Optional filter function to select which summaries to import
   * @returns Array of imported summary entries
   */
  public async importSummaries(
    sourceChatId: string,
    targetChatId?: string,
    filter?: (entry: SummaryEntry) => boolean
  ): Promise<SummaryEntry[]> {
    const effectiveTargetChatId = targetChatId || this.options.defaultChatId;
    return this.context.importSummaries(sourceChatId, effectiveTargetChatId, filter);
  }
  
  /**
   * Organize summaries into a hierarchical structure
   * 
   * @param chatId - The chat ID to organize summaries for (defaults to the default chat ID)
   * @returns Hierarchical representation of summaries
   */
  public async getOrganizedSummaries(chatId?: string): Promise<any> {
    const effectiveChatId = chatId || this.options.defaultChatId;
    const summaries = await this.storage.getChatSummaries(effectiveChatId);
    return this.context.organizeHierarchy(summaries);
  }
  
  /**
   * Generate a new chat ID
   *
   * @returns A new unique chat ID
   */
  public generateChatId(): string {
    return uuidv4();
  }
  
  /**
   * Search for semantically similar summaries
   *
   * @param query - The search query text
   * @param chatId - The chat ID to search within (defaults to the default chat ID)
   * @param limit - Maximum number of results to return
   * @param threshold - Minimum similarity score (0-1)
   * @returns Array of summaries sorted by semantic similarity
   */
  public async searchSimilarSummaries(
    query: string,
    chatId?: string,
    limit: number = 5,
    threshold: number = 0.5
  ): Promise<{ summary: SummaryEntry; score: number }[]> {
    const effectiveChatId = chatId || this.options.defaultChatId;
    
    // Search the vector database with chat ID filter
    const results = this.vectorDb.searchWithFilter(
      query,
      metadata => metadata.chatId === effectiveChatId,
      limit,
      threshold
    );
    
    // Convert results to summaries
    const summaryResults: { summary: SummaryEntry; score: number }[] = [];
    
    for (const result of results) {
      const summaryId = result.vector.metadata.summaryId;
      const summary = await this.storage.getSummary(summaryId);
      
      if (summary) {
        summaryResults.push({
          summary,
          score: result.score
        });
      }
    }
    
    return summaryResults;
  }
  
  /**
   * Import semantically similar summaries from another chat
   *
   * @param query - The search query text
   * @param sourceChatId - The source chat ID to import from
   * @param targetChatId - The target chat ID to import to (defaults to the default chat ID)
   * @param limit - Maximum number of summaries to import
   * @param threshold - Minimum similarity score (0-1)
   * @returns Array of imported summaries
   */
  public async importSimilarSummaries(
    query: string,
    sourceChatId: string,
    targetChatId?: string,
    limit: number = 3,
    threshold: number = 0.6
  ): Promise<SummaryEntry[]> {
    const effectiveTargetChatId = targetChatId || this.options.defaultChatId;
    
    // Search the vector database with source chat ID filter
    const results = this.vectorDb.searchWithFilter(
      query,
      metadata => metadata.chatId === sourceChatId,
      limit,
      threshold
    );
    
    // Import each matching summary
    const importedSummaries: SummaryEntry[] = [];
    
    for (const result of results) {
      const summaryId = result.vector.metadata.summaryId;
      const summary = await this.storage.getSummary(summaryId);
      
      if (summary) {
        const importedSummary = await this.storage.createSummary(
          effectiveTargetChatId,
          summary.context,
          summary.category,
          summary.priority,
          summary.lineNumber
        );
        
        // Add to vector database
        this.vectorDb.addSummaryEntry(importedSummary);
        
        importedSummaries.push(importedSummary);
      }
    }
    
    return importedSummaries;
  }
  
  /**
   * Add an event listener
   * 
   * @param listener - The event listener function
   */
  public addEventListener(listener: EventListener): void {
    this.eventListeners.push(listener);
  }
  
  /**
   * Remove an event listener
   * 
   * @param listener - The event listener function to remove
   */
  public removeEventListener(listener: EventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }
  
  /**
   * Emit an event to all listeners
   * 
   * @param eventType - The type of event
   * @param data - The event data
   */
  private emitEvent(eventType: EventType, data: any): void {
    for (const listener of this.eventListeners) {
      try {
        listener(eventType, data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    }
  }
}

// Export a default instance
export const api = new ContinuityAPI();