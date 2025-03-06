/**
 * Storage Manager module for persisting and retrieving summary entries
 */

import { v4 as uuidv4 } from 'uuid';
import { SummaryEntry, StorageOptions, QueryOptions } from './types';

/**
 * Abstract storage adapter interface
 * Implementations can use different storage backends (memory, file, database, etc.)
 */
export interface StorageAdapter {
  /**
   * Save a summary entry
   */
  save(entry: SummaryEntry): Promise<SummaryEntry>;
  
  /**
   * Get a summary entry by ID
   */
  getById(id: string): Promise<SummaryEntry | null>;
  
  /**
   * Get all summary entries for a chat
   */
  getByChatId(chatId: string): Promise<SummaryEntry[]>;
  
  /**
   * Delete a summary entry
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Query summary entries based on criteria
   */
  query(chatId: string, options?: QueryOptions): Promise<SummaryEntry[]>;
  
  /**
   * Clear all entries (mainly for testing)
   */
  clear(): Promise<void>;
}

/**
 * In-memory storage adapter implementation
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private entries: Map<string, SummaryEntry> = new Map();
  
  async save(entry: SummaryEntry): Promise<SummaryEntry> {
    this.entries.set(entry.id, entry);
    return entry;
  }
  
  async getById(id: string): Promise<SummaryEntry | null> {
    return this.entries.get(id) || null;
  }
  
  async getByChatId(chatId: string): Promise<SummaryEntry[]> {
    return Array.from(this.entries.values())
      .filter(entry => entry.chatId === chatId);
  }
  
  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }
  
  async query(chatId: string, options: QueryOptions = {}): Promise<SummaryEntry[]> {
    let results = Array.from(this.entries.values())
      .filter(entry => entry.chatId === chatId);
    
    // Apply category filter
    if (options.category) {
      results = results.filter(entry => entry.category === options.category);
    }
    
    // Apply priority filter
    if (options.priority) {
      results = results.filter(entry => entry.priority === options.priority);
    }
    
    // Apply date range filter
    if (options.createdBetween) {
      results = results.filter(entry => 
        entry.createdAt >= options.createdBetween!.start && 
        entry.createdAt <= options.createdBetween!.end
      );
    }
    
    // Apply sorting
    if (options.sortBy) {
      const sortField = options.sortBy;
      const sortDirection = options.sortDirection || 'desc';
      
      results.sort((a, b) => {
        const aValue = a[sortField] as any;
        const bValue = b[sortField] as any;
        
        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }
    
    // Apply limit
    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }
  
  async clear(): Promise<void> {
    this.entries.clear();
  }
}

/**
 * Storage Manager class for handling summary persistence
 */
export class StorageManager {
  private adapter: StorageAdapter;
  private options: Required<StorageOptions>;
  
  /**
   * Default storage options
   */
  private static readonly DEFAULT_OPTIONS: Required<StorageOptions> = {
    adapter: null,
    maxEntriesPerChat: 1000,
    enableAutoCleanup: true
  };
  
  /**
   * Create a new StorageManager instance
   */
  constructor(options: StorageOptions = {}) {
    this.options = { ...StorageManager.DEFAULT_OPTIONS, ...options };
    this.adapter = this.options.adapter || new MemoryStorageAdapter();
  }
  
  /**
   * Create a new summary entry
   */
  public async createSummary(
    chatId: string, 
    context: string, 
    category?: string, 
    priority?: string, 
    lineNumber?: string
  ): Promise<SummaryEntry> {
    const now = new Date();
    
    const entry: SummaryEntry = {
      id: uuidv4(),
      chatId,
      context,
      category,
      priority: priority as any,
      lineNumber,
      createdAt: now,
      modifiedAt: now,
      version: 1
    };
    
    const savedEntry = await this.adapter.save(entry);
    
    // Perform auto-cleanup if enabled
    if (this.options.enableAutoCleanup) {
      this.cleanupOldEntries(chatId);
    }
    
    return savedEntry;
  }
  
  /**
   * Update an existing summary entry
   */
  public async updateSummary(
    id: string, 
    updates: Partial<Pick<SummaryEntry, 'context' | 'category' | 'priority'>>
  ): Promise<SummaryEntry | null> {
    const entry = await this.adapter.getById(id);
    
    if (!entry) {
      return null;
    }
    
    const updatedEntry: SummaryEntry = {
      ...entry,
      ...updates,
      modifiedAt: new Date(),
      version: entry.version + 1
    };
    
    return this.adapter.save(updatedEntry);
  }
  
  /**
   * Delete a summary entry
   */
  public async deleteSummary(id: string): Promise<boolean> {
    return this.adapter.delete(id);
  }
  
  /**
   * Get a summary entry by ID
   */
  public async getSummary(id: string): Promise<SummaryEntry | null> {
    return this.adapter.getById(id);
  }
  
  /**
   * Get all summaries for a chat
   */
  public async getChatSummaries(chatId: string): Promise<SummaryEntry[]> {
    return this.adapter.getByChatId(chatId);
  }
  
  /**
   * Query summaries based on criteria
   */
  public async querySummaries(chatId: string, options: QueryOptions = {}): Promise<SummaryEntry[]> {
    return this.adapter.query(chatId, options);
  }
  
  /**
   * Clean up old entries to stay within maxEntriesPerChat limit
   */
  private async cleanupOldEntries(chatId: string): Promise<void> {
    const entries = await this.adapter.getByChatId(chatId);
    
    if (entries.length <= this.options.maxEntriesPerChat) {
      return;
    }
    
    // Sort by modified date (oldest first)
    const sortedEntries = entries.sort((a, b) => 
      a.modifiedAt.getTime() - b.modifiedAt.getTime()
    );
    
    // Delete oldest entries to get back to the limit
    const entriesToDelete = sortedEntries.slice(0, entries.length - this.options.maxEntriesPerChat);
    
    for (const entry of entriesToDelete) {
      await this.adapter.delete(entry.id);
    }
  }
  
  /**
   * Set a custom storage adapter
   */
  public setAdapter(adapter: StorageAdapter): void {
    this.adapter = adapter;
  }
}

// Export a default instance with memory storage
export const storage = new StorageManager();