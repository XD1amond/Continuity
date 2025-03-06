/**
 * Vector Database module for semantic knowledge storage and retrieval
 */

import { v4 as uuidv4 } from 'uuid';
import { SummaryEntry } from './types';

/**
 * Calculate cosine similarity between two vectors
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score between 0 and 1
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Simple vector representation of text
 */
export interface TextVector {
  /** Unique identifier for the vector */
  id: string;
  
  /** The original text */
  text: string;
  
  /** Vector embedding of the text */
  vector: number[];
  
  /** Metadata associated with the vector */
  metadata: Record<string, any>;
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  /** The matched vector */
  vector: TextVector;
  
  /** Similarity score (0-1) */
  score: number;
}

/**
 * Simple text-to-vector embedding function
 * Note: This is a very simplified implementation for demonstration purposes.
 * In a real application, you would use a proper embedding model like OpenAI's embeddings API.
 */
export function textToVector(text: string): number[] {
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
 * Vector Database class for semantic knowledge storage and retrieval
 */
export class VectorDatabase {
  private vectors: TextVector[] = [];
  
  /**
   * Add a text vector to the database
   * 
   * @param text - The text to vectorize and store
   * @param metadata - Optional metadata to associate with the vector
   * @returns The stored text vector
   */
  public addVector(text: string, metadata: Record<string, any> = {}): TextVector {
    const vector: TextVector = {
      id: uuidv4(),
      text,
      vector: textToVector(text),
      metadata
    };
    
    this.vectors.push(vector);
    return vector;
  }
  
  /**
   * Add a summary entry to the vector database
   * 
   * @param entry - The summary entry to add
   * @returns The stored text vector
   */
  public addSummaryEntry(entry: SummaryEntry): TextVector {
    return this.addVector(entry.context, {
      summaryId: entry.id,
      chatId: entry.chatId,
      category: entry.category,
      priority: entry.priority,
      createdAt: entry.createdAt,
      modifiedAt: entry.modifiedAt
    });
  }
  
  /**
   * Search for similar vectors
   * 
   * @param text - The query text
   * @param limit - Maximum number of results to return
   * @param threshold - Minimum similarity score (0-1)
   * @returns Array of search results sorted by similarity
   */
  public search(text: string, limit: number = 10, threshold: number = 0.5): VectorSearchResult[] {
    const queryVector = textToVector(text);
    
    // Calculate similarity scores
    const results: VectorSearchResult[] = this.vectors.map(vector => ({
      vector,
      score: cosineSimilarity(queryVector, vector.vector)
    }));
    
    // Filter by threshold and sort by score (descending)
    return results
      .filter(result => result.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  /**
   * Search for similar vectors with specific metadata criteria
   * 
   * @param text - The query text
   * @param metadataFilter - Function to filter by metadata
   * @param limit - Maximum number of results to return
   * @param threshold - Minimum similarity score (0-1)
   * @returns Array of search results sorted by similarity
   */
  public searchWithFilter(
    text: string,
    metadataFilter: (metadata: Record<string, any>) => boolean,
    limit: number = 10,
    threshold: number = 0.5
  ): VectorSearchResult[] {
    const queryVector = textToVector(text);
    
    // Filter by metadata and calculate similarity scores
    const results: VectorSearchResult[] = this.vectors
      .filter(vector => metadataFilter(vector.metadata))
      .map(vector => ({
        vector,
        score: cosineSimilarity(queryVector, vector.vector)
      }));
    
    // Filter by threshold and sort by score (descending)
    return results
      .filter(result => result.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  /**
   * Get a vector by ID
   * 
   * @param id - The vector ID
   * @returns The vector or null if not found
   */
  public getVector(id: string): TextVector | null {
    return this.vectors.find(v => v.id === id) || null;
  }
  
  /**
   * Delete a vector by ID
   * 
   * @param id - The vector ID
   * @returns True if deleted, false if not found
   */
  public deleteVector(id: string): boolean {
    const index = this.vectors.findIndex(v => v.id === id);
    if (index !== -1) {
      this.vectors.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Clear all vectors
   */
  public clear(): void {
    this.vectors = [];
  }
  
  /**
   * Get the number of vectors in the database
   */
  public get size(): number {
    return this.vectors.length;
  }
}

// Export a singleton instance
export const vectorDb = new VectorDatabase();