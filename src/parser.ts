/**
 * Parser module for detecting and processing XML tags in AI responses
 */

import { Command, CommandType, Priority } from './types';

/**
 * XML Parser class for extracting and processing XML commands from text
 */
export class XmlParser {
  /**
   * Parse text content and extract XML commands
   * 
   * @param text - The text content to parse
   * @returns Array of parsed commands
   */
  public parse(text: string): Command[] {
    const commands: Command[] = [];
    
    // Match all supported command tags
    const commandRegex = /<(add_summary|edit_summary|delete_summary|query_summary|save_user_data|retrieve_user_data)>([\s\S]*?)<\/\1>/g;
    let match;
    
    while ((match = commandRegex.exec(text)) !== null) {
      const commandTypeStr = match[1];
      const commandContent = match[2];
      
      // Map string to CommandType enum
      let commandType: CommandType;
      switch (commandTypeStr) {
        case 'add_summary':
          commandType = CommandType.ADD_SUMMARY;
          break;
        case 'edit_summary':
          commandType = CommandType.EDIT_SUMMARY;
          break;
        case 'delete_summary':
          commandType = CommandType.DELETE_SUMMARY;
          break;
        case 'query_summary':
          commandType = CommandType.QUERY_SUMMARY;
          break;
        case 'save_user_data':
          commandType = CommandType.SAVE_USER_DATA;
          break;
        case 'retrieve_user_data':
          commandType = CommandType.RETRIEVE_USER_DATA;
          break;
        default:
          continue; // Skip unknown command types
      }
      
      // Create command object
      const command: Command = {
        type: commandType,
        params: this.parseCommandParams(commandContent)
      };
      
      commands.push(command);
    }
    
    return commands;
  }
  
  /**
   * Parse command parameters from the command content
   *
   * @param content - The content inside the command tags
   * @returns Parsed parameters
   */
  private parseCommandParams(content: string): Command['params'] {
    const params: Command['params'] = {};
    
    // Parse line number
    const lineNumberMatch = /<linenumber>(.*?)<\/linenumber>/i.exec(content);
    if (lineNumberMatch) {
      params.lineNumber = lineNumberMatch[1].trim();
    }
    
    // Parse category
    const categoryMatch = /<category>(.*?)<\/category>/i.exec(content);
    if (categoryMatch) {
      params.category = categoryMatch[1].trim();
    }
    
    // Parse priority
    const priorityMatch = /<priority>(.*?)<\/priority>/i.exec(content);
    if (priorityMatch) {
      const priorityValue = priorityMatch[1].trim().toLowerCase();
      if (Object.values(Priority).includes(priorityValue as Priority)) {
        params.priority = priorityValue as Priority;
      }
    }
    
    // Parse context
    const contextMatch = /<context>([\s\S]*?)<\/context>/i.exec(content);
    if (contextMatch) {
      params.context = contextMatch[1].trim();
    }
    
    // Parse ID (for edit/delete operations)
    const idMatch = /<id>(.*?)<\/id>/i.exec(content);
    if (idMatch) {
      params.id = idMatch[1].trim();
    }
    
    // Parse key (for user data operations)
    const keyMatch = /<key>(.*?)<\/key>/i.exec(content);
    if (keyMatch) {
      params.key = keyMatch[1].trim();
    }
    
    // Parse value (for user data operations)
    const valueMatch = /<value>([\s\S]*?)<\/value>/i.exec(content);
    if (valueMatch) {
      params.value = valueMatch[1].trim();
    }
    
    // Parse query (for retrieval operations)
    const queryMatch = /<query>([\s\S]*?)<\/query>/i.exec(content);
    if (queryMatch) {
      params.query = queryMatch[1].trim();
    }
    
    // Parse limit (for retrieval operations)
    const limitMatch = /<limit>(\d+)<\/limit>/i.exec(content);
    if (limitMatch) {
      params.limit = parseInt(limitMatch[1].trim(), 10);
    }
    
    return params;
  }
  
  /**
   * Validate a command to ensure it has all required parameters
   * 
   * @param command - The command to validate
   * @returns True if valid, false otherwise
   */
  public validateCommand(command: Command): boolean {
    switch (command.type) {
      case CommandType.ADD_SUMMARY:
        // Add summary requires context
        return !!command.params.context;
        
      case CommandType.EDIT_SUMMARY:
        // Edit summary requires ID and at least one parameter to update
        return !!command.params.id && (
          !!command.params.context ||
          !!command.params.category ||
          !!command.params.priority
        );
        
      case CommandType.DELETE_SUMMARY:
        // Delete summary requires ID
        return !!command.params.id;
        
      case CommandType.QUERY_SUMMARY:
        // Query summary is always valid, even without parameters
        return true;
        
      case CommandType.SAVE_USER_DATA:
        // Save user data requires key and value
        return !!command.params.key && command.params.value !== undefined;
        
      case CommandType.RETRIEVE_USER_DATA:
        // Retrieve user data requires either key or query
        return !!command.params.key || !!command.params.query;
        
      default:
        return false;
    }
  }
  
  /**
   * Remove XML commands from text
   * 
   * @param text - The text containing XML commands
   * @returns Text with XML commands removed
   */
  public removeCommands(text: string): string {
    return text.replace(/<(add_summary|edit_summary|delete_summary|query_summary|save_user_data|retrieve_user_data)>[\s\S]*?<\/\1>/g, '');
  }
}

// Export a singleton instance
export const parser = new XmlParser();