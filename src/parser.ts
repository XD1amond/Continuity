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
    const commandRegex = /<(add_summary|edit_summary|delete_summary|query_summary)>([\s\S]*?)<\/\1>/g;
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
    return text.replace(/<(add_summary|edit_summary|delete_summary|query_summary)>[\s\S]*?<\/\1>/g, '');
  }
}

// Export a singleton instance
export const parser = new XmlParser();