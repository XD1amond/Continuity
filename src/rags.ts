/**
 * RAGs (Retrieval-Augmented Generation) integration module
 * 
 * This module extends the Continuity framework with RAGs capabilities,
 * allowing for more sophisticated retrieval of relevant information.
 */

import { SummaryEntry } from './types';
import { VectorDatabase, TextVector, VectorSearchResult } from './vector';
import { storage } from './storage';

/**
 * Interface for embedding providers
 */
export interface EmbeddingProvider {
  /**
   * Generate embeddings for a text
   * 
   * @param text - The text to generate embeddings for
   * @returns Promise resolving to a vector of embeddings
   */
  generateEmbedding(text: string): Promise<number[]>;
  
  /**
   * Generate embeddings for multiple texts in batch
   * 
   * @param texts - Array of texts to generate embeddings for
   * @returns Promise resolving to an array of embedding vectors
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

/**
 * Default embedding provider that uses the simple character frequency approach
 * This is a placeholder and should be replaced with a proper embedding model in production
 */
export class DefaultEmbeddingProvider implements EmbeddingProvider {
  /**
   * Generate a simple embedding for a text
   * Note: This is a very simplified implementation for demonstration purposes.
   * In a real application, you would use a proper embedding model.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Simplified embedding: count occurrences of each letter (a-z)
    const vector = new Array(26).fill(0);
    const normalizedText = text.toLowerCase();
    
    for (let i = 0; i < normalizedText.length; i++) {
      const charCode = normalizedText.charCodeAt(i) - 97; // 'a' is 97
      if (charCode >= 0 && charCode < 26) {
        vector[charCode]++;
      }
    }
    
    // Normalize the vector
    const sum = vector.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] = vector[i] / sum;
      }
    }
    
    return vector;
  }
  
  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      embeddings.push(await this.generateEmbedding(text));
    }
    
    return embeddings;
  }
}

/**
 * OpenAI embedding provider
 * Note: This requires the OpenAI API key to be set
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  
  /**
   * Create a new OpenAI embedding provider
   * 
   * @param apiKey - OpenAI API key
   * @param model - OpenAI embedding model to use (defaults to 'text-embedding-ada-002')
   */
  constructor(apiKey: string, model: string = 'text-embedding-ada-002') {
    this.apiKey = apiKey;
    this.model = model;
  }
  
  /**
   * Generate an embedding using OpenAI's API
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          input: text
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating OpenAI embedding:', error);
      throw error;
    }
  }
  
  /**
   * Generate embeddings for multiple texts using OpenAI's API
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          input: texts
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      console.error('Error generating OpenAI embeddings:', error);
      throw error;
    }
  }
}

/**
 * RAGs retrieval options
 */
export interface RagsRetrievalOptions {
  /** Maximum number of results to return */
  limit?: number;
  
  /** Minimum similarity score (0-1) */
  threshold?: number;
  
  /** Filter by chat ID */
  chatId?: string;
  
  /** Filter by category */
  category?: string;
  
  /** Filter by priority */
  priority?: string;
  
  /** Custom filter function */
  filter?: (entry: SummaryEntry) => boolean;
}

/**
 * RAGs retrieval result
 */
export interface RagsRetrievalResult {
  /** The retrieved summary entry */
  entry: SummaryEntry;
  
  /** Similarity score (0-1) */
  score: number;
}

/**
 * RAGs Manager class for retrieval-augmented generation
 */
export class RagsManager {
  private vectorDb: VectorDatabase;
  private embeddingProvider: EmbeddingProvider;
  
  /**
   * Create a new RAGs manager
   * 
   * @param vectorDb - Vector database instance
   * @param embeddingProvider - Embedding provider instance
   */
  constructor(
    vectorDb: VectorDatabase,
    embeddingProvider: EmbeddingProvider = new DefaultEmbeddingProvider()
  ) {
    this.vectorDb = vectorDb;
    this.embeddingProvider = embeddingProvider;
  }
  
  /**
   * Set the embedding provider
   * 
   * @param provider - The embedding provider to use
   */
  public setEmbeddingProvider(provider: EmbeddingProvider): void {
    this.embeddingProvider = provider;
  }
  
  /**
   * Add a summary entry to the RAGs index
   * 
   * @param entry - The summary entry to add
   * @returns Promise resolving to the added vector
   */
  public async addEntry(entry: SummaryEntry): Promise<TextVector> {
    // Generate embedding for the entry context
    const embedding = await this.embeddingProvider.generateEmbedding(entry.context);
    
    // Add to vector database
    return this.vectorDb.addVector(entry.context, {
      summaryId: entry.id,
      chatId: entry.chatId,
      category: entry.category,
      priority: entry.priority,
      createdAt: entry.createdAt,
      modifiedAt: entry.modifiedAt,
      embedding
    });
  }
  
  /**
   * Retrieve relevant information based on a query
   * 
   * @param query - The query text
   * @param options - Retrieval options
   * @returns Promise resolving to an array of retrieval results
   */
  public async retrieve(
    query: string,
    options: RagsRetrievalOptions = {}
  ): Promise<RagsRetrievalResult[]> {
    const {
      limit = 5,
      threshold = 0.5,
      chatId,
      category,
      priority,
      filter
    } = options;
    
    // Generate embedding for the query
    const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);
    
    // Create metadata filter
    const metadataFilter = (metadata: Record<string, any>) => {
      let matches = true;
      
      if (chatId && metadata.chatId !== chatId) {
        matches = false;
      }
      
      if (category && metadata.category !== category) {
        matches = false;
      }
      
      if (priority && metadata.priority !== priority) {
        matches = false;
      }
      
      return matches;
    };
    
    // Search the vector database
    const searchResults = this.vectorDb.searchWithFilter(
      query,
      metadataFilter,
      limit,
      threshold
    );
    
    // Convert search results to RAGs retrieval results
    const retrievalResults: RagsRetrievalResult[] = [];
    
    for (const result of searchResults) {
      const summaryId = result.vector.metadata.summaryId;
      const entry = await storage.getSummary(summaryId);
      
      if (entry && (!filter || filter(entry))) {
        retrievalResults.push({
          entry,
          score: result.score
        });
      }
    }
    
    return retrievalResults;
  }
  
  /**
   * Generate a context string from retrieval results
   * 
   * @param results - The retrieval results
   * @param format - Format string for each result (defaults to "{context}")
   * @returns Formatted context string
   */
  public generateContext(
    results: RagsRetrievalResult[],
    format: string = "{context}"
  ): string {
    let context = "";
    
    for (const result of results) {
      const entry = result.entry;
      const formattedEntry = format
        .replace("{context}", entry.context)
        .replace("{category}", entry.category || "")
        .replace("{priority}", entry.priority || "")
        .replace("{score}", result.score.toFixed(2));
      
      context += formattedEntry + "\n\n";
    }
    
    return context.trim();
  }
  
  /**
   * Index all existing summaries
   * 
   * @param chatId - Optional chat ID to filter summaries
   * @returns Promise resolving to the number of indexed entries
   */
  public async indexAllSummaries(chatId?: string): Promise<number> {
    // Get all summaries
    const summaries = chatId 
      ? await storage.getChatSummaries(chatId)
      : await this.getAllSummaries();
    
    let indexedCount = 0;
    
    // Index each summary
    for (const summary of summaries) {
      await this.addEntry(summary);
      indexedCount++;
    }
    
    return indexedCount;
  }
  
  /**
   * Get all summaries across all chats
   * 
   * @returns Promise resolving to an array of all summaries
   */
  private async getAllSummaries(): Promise<SummaryEntry[]> {
    // This is a simplified implementation
    // In a real application, you would need to track all chat IDs
    // For now, we'll just return an empty array
    return [];
  }
}

// Export a singleton instance with default configuration
export const rags = new RagsManager(new VectorDatabase());