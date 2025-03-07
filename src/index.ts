/**
 * Continuity - AI Knowledge Preservation Framework
 *
 * A lightweight library that enables AI systems to actively manage conversation knowledge
 * by identifying and preserving crucial information throughout an interaction.
 */

// Export the main API class
export { ContinuityAPI } from './api';

// Export the main API instance
export { api } from './api';

// Export event types
export { EventType } from './api';

// Export types
export {
  SummaryEntry,
  Priority,
  CommandType,
  Command,
  StorageOptions,
  ContextOptions,
  ContinuityOptions,
  QueryOptions
} from './types';

// Export vector database
export {
  VectorDatabase,
  vectorDb,
  TextVector,
  VectorSearchResult,
  textToVector
} from './vector';

// Export RAGs functionality
export {
  RagsManager,
  rags,
  EmbeddingProvider,
  DefaultEmbeddingProvider,
  OpenAIEmbeddingProvider,
  RagsRetrievalOptions,
  RagsRetrievalResult
} from './rags';