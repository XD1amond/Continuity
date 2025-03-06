/**
 * Context Manager module for maintaining hierarchical representation of knowledge
 */

import { SummaryEntry, ContextOptions } from './types';
import { storage } from './storage';

/**
 * Context Manager class for organizing and relating summary entries
 */
export class ContextManager {
  private options: Required<ContextOptions>;
  
  /**
   * Default context options
   */
  private static readonly DEFAULT_OPTIONS: Required<ContextOptions> = {
    enableConflictResolution: true,
    maxHierarchyDepth: 3
  };
  
  /**
   * Create a new ContextManager instance
   */
  constructor(options: ContextOptions = {}) {
    this.options = { ...ContextManager.DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Find related summaries based on content similarity
   * 
   * @param entry - The summary entry to find relations for
   * @param chatId - The chat ID to search within
   * @returns Array of related summary entries
   */
  public async findRelatedSummaries(entry: SummaryEntry, chatId: string): Promise<SummaryEntry[]> {
    // Get all summaries for the chat
    const allSummaries = await storage.getChatSummaries(chatId);
    
    // Filter out the current entry
    const otherSummaries = allSummaries.filter(s => s.id !== entry.id);
    
    // Find related summaries based on content similarity
    // This is a simple implementation that could be improved with NLP techniques
    const relatedSummaries = otherSummaries.filter(s => {
      // Check if they share the same category
      if (entry.category && s.category === entry.category) {
        return true;
      }
      
      // Check for content similarity (simple word overlap)
      const entryWords = new Set(entry.context.toLowerCase().split(/\s+/));
      const summaryWords = new Set(s.context.toLowerCase().split(/\s+/));
      
      // Count common words
      let commonWords = 0;
      for (const word of entryWords) {
        if (summaryWords.has(word) && word.length > 3) { // Only count words longer than 3 chars
          commonWords++;
        }
      }
      
      // Calculate similarity score
      const similarityThreshold = 0.3; // 30% similarity
      const similarityScore = commonWords / Math.min(entryWords.size, summaryWords.size);
      
      return similarityScore >= similarityThreshold;
    });
    
    return relatedSummaries;
  }
  
  /**
   * Detect and resolve conflicts between summary entries
   * 
   * @param entries - Array of potentially conflicting entries
   * @returns Resolved entries with conflicts marked
   */
  public resolveConflicts(entries: SummaryEntry[]): SummaryEntry[] {
    if (!this.options.enableConflictResolution || entries.length <= 1) {
      return entries;
    }
    
    // Group entries by category
    const entriesByCategory: Record<string, SummaryEntry[]> = {};
    
    for (const entry of entries) {
      const category = entry.category || 'uncategorized';
      
      if (!entriesByCategory[category]) {
        entriesByCategory[category] = [];
      }
      
      entriesByCategory[category].push(entry);
    }
    
    // Process each category group
    const resolvedEntries: SummaryEntry[] = [];
    
    for (const category in entriesByCategory) {
      const categoryEntries = entriesByCategory[category];
      
      if (categoryEntries.length <= 1) {
        // No conflicts possible with a single entry
        resolvedEntries.push(...categoryEntries);
        continue;
      }
      
      // Sort by version (newest first)
      categoryEntries.sort((a, b) => b.version - a.version);
      
      // For now, we'll use a simple strategy: keep the newest version
      // This could be enhanced with more sophisticated conflict resolution
      resolvedEntries.push(categoryEntries[0]);
    }
    
    return resolvedEntries;
  }
  
  /**
   * Organize summaries into a hierarchical structure
   * 
   * @param entries - Array of summary entries to organize
   * @returns Hierarchical representation of entries
   */
  public organizeHierarchy(entries: SummaryEntry[]): any {
    // Group by category first
    const hierarchy: Record<string, any> = {};
    
    for (const entry of entries) {
      const category = entry.category || 'uncategorized';
      
      if (!hierarchy[category]) {
        hierarchy[category] = {
          entries: [],
          subcategories: {}
        };
      }
      
      hierarchy[category].entries.push(entry);
    }
    
    // Sort entries within each category by priority
    for (const category in hierarchy) {
      hierarchy[category].entries.sort((a: SummaryEntry, b: SummaryEntry) => {
        const priorityOrder: Record<string, number> = {
          'high': 3,
          'medium': 2,
          'low': 1,
          undefined: 0
        };
        
        return (priorityOrder[b.priority as string] || 0) - (priorityOrder[a.priority as string] || 0);
      });
    }
    
    return hierarchy;
  }
  
  /**
   * Import summaries from another chat
   * 
   * @param sourceChatId - The source chat ID to import from
   * @param targetChatId - The target chat ID to import to
   * @param filter - Optional filter function to select which summaries to import
   * @returns Array of imported summary entries
   */
  public async importSummaries(
    sourceChatId: string, 
    targetChatId: string,
    filter?: (entry: SummaryEntry) => boolean
  ): Promise<SummaryEntry[]> {
    // Get all summaries from the source chat
    const sourceSummaries = await storage.getChatSummaries(sourceChatId);
    
    // Apply filter if provided
    const summariesToImport = filter 
      ? sourceSummaries.filter(filter)
      : sourceSummaries;
    
    // Import each summary to the target chat
    const importedSummaries: SummaryEntry[] = [];
    
    for (const summary of summariesToImport) {
      const importedSummary = await storage.createSummary(
        targetChatId,
        summary.context,
        summary.category,
        summary.priority,
        summary.lineNumber
      );
      
      importedSummaries.push(importedSummary);
    }
    
    return importedSummaries;
  }
}

// Export a default instance
export const context = new ContextManager();