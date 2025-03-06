/**
 * Core type definitions for the Continuity framework
 */

/**
 * Priority levels for summary entries
 */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

/**
 * Represents a single summary entry
 */
export interface SummaryEntry {
  /** Unique identifier for the summary entry */
  id: string;
  
  /** The chat ID this summary is associated with */
  chatId: string;
  
  /** The actual content of the summary */
  context: string;
  
  /** Optional category for organizing summaries */
  category?: string;
  
  /** Optional priority level */
  priority?: Priority;
  
  /** Optional line number reference from the original conversation */
  lineNumber?: string;
  
  /** Timestamp when this summary was created */
  createdAt: Date;
  
  /** Timestamp when this summary was last modified */
  modifiedAt: Date;
  
  /** Version number for tracking changes */
  version: number;
}

/**
 * Supported XML command types
 */
export enum CommandType {
  ADD_SUMMARY = 'add_summary',
  EDIT_SUMMARY = 'edit_summary',
  DELETE_SUMMARY = 'delete_summary',
  QUERY_SUMMARY = 'query_summary'
}

/**
 * Represents a parsed XML command
 */
export interface Command {
  /** The type of command */
  type: CommandType;
  
  /** Command parameters */
  params: {
    /** Line number reference */
    lineNumber?: string;
    
    /** Category for organizing */
    category?: string;
    
    /** Priority level */
    priority?: Priority;
    
    /** The actual content */
    context?: string;
    
    /** ID for edit/delete operations */
    id?: string;
  };
}

/**
 * Storage options for configuring the storage manager
 */
export interface StorageOptions {
  /** Storage adapter implementation */
  adapter?: any;
  
  /** Maximum number of entries to keep per chat */
  maxEntriesPerChat?: number;
  
  /** Enable automatic cleanup of old entries */
  enableAutoCleanup?: boolean;
}

/**
 * Context manager options
 */
export interface ContextOptions {
  /** Enable automatic conflict resolution */
  enableConflictResolution?: boolean;
  
  /** Maximum depth for hierarchical organization */
  maxHierarchyDepth?: number;
}

/**
 * Configuration options for the Continuity framework
 */
export interface ContinuityOptions {
  /** Storage configuration */
  storage?: StorageOptions;
  
  /** Context manager configuration */
  context?: ContextOptions;
  
  /** Default chat ID to use if none is provided */
  defaultChatId?: string;
}

/**
 * Query options for retrieving summaries
 */
export interface QueryOptions {
  /** Filter by category */
  category?: string;
  
  /** Filter by priority */
  priority?: Priority;
  
  /** Filter by creation date range */
  createdBetween?: {
    start: Date;
    end: Date;
  };
  
  /** Maximum number of results to return */
  limit?: number;
  
  /** Sort order */
  sortBy?: 'createdAt' | 'modifiedAt' | 'priority';
  
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}