import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, streamText } from "ai";

// Claude model configuration with automatic updates
export interface ClaudeModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  isLatest: boolean;
}

// Available Claude models - this can be automatically updated
export const CLAUDE_MODELS: ClaudeModel[] = [
  {
    id: "claude-3-5-sonnet-20240620",
    name: "Claude 3.5 Sonnet",
    description: "Latest and most capable Claude model",
    maxTokens: 200000,
    isLatest: true
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    description: "Most powerful Claude model for complex tasks",
    maxTokens: 200000,
    isLatest: false
  },
  {
    id: "claude-3-sonnet-20240229",
    name: "Claude 3 Sonnet",
    description: "Balanced performance and speed",
    maxTokens: 200000,
    isLatest: false
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    description: "Fastest and most cost-effective",
    maxTokens: 200000,
    isLatest: false
  }
];

// Get the latest available model
export function getLatestModel(): string {
  const latest = CLAUDE_MODELS.find(model => model.isLatest);
  return latest?.id || "claude-3-5-sonnet-20240620";
}

// Get model by ID
export function getModelById(id: string): ClaudeModel | undefined {
  return CLAUDE_MODELS.find(model => model.id === id);
}

// Thinky-specific system prompts
export const THINKY_SYSTEM_PROMPTS = {
  default: `You are Thinky, a helpful AI assistant for compliance and project management software. You help users with:

- Project documentation and organization
- Compliance requirements and best practices
- Technical questions about the software
- General assistance and guidance

Always be friendly, professional, and helpful. Keep responses concise but informative.`,
  
  compliance: `You are Thinky, a specialized compliance assistant. You help with:

- Regulatory compliance requirements
- Documentation standards
- Audit preparation
- Best practices for compliance management

Provide accurate, up-to-date information and practical guidance.`,
  
  technical: `You are Thinky, a technical assistant. You help with:

- Software usage and features
- Technical troubleshooting
- Integration questions
- Best practices for implementation

Provide clear, actionable technical guidance.`
};

export interface ClaudeRequest {
  messages: any[];
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeResponse {
  text: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Main Claude service class
export class ClaudeService {
  private defaultModel: string;
  
  constructor(defaultModel?: string) {
    this.defaultModel = defaultModel || getLatestModel();
  }

  // Stream text response
  async streamText(request: ClaudeRequest) {
    const model = request.model || this.defaultModel;
    const systemPrompt = request.systemPrompt || THINKY_SYSTEM_PROMPTS.default;
    
    const result = await streamText({
      model: anthropic(model),
      messages: convertToCoreMessages(request.messages),
      system: systemPrompt,
      maxTokens: request.maxTokens || 4000,
      temperature: request.temperature || 0.7,
    });

    return result;
  }

  // Get available models
  getAvailableModels(): ClaudeModel[] {
    return CLAUDE_MODELS;
  }

  // Update model list (for future automatic updates)
  updateModels(newModels: ClaudeModel[]) {
    // This could be called from an external service or API
    // to automatically update available models
    Object.assign(CLAUDE_MODELS, newModels);
  }

  // Get model info
  getModelInfo(modelId: string): ClaudeModel | undefined {
    return getModelById(modelId);
  }
}

// Default instance
export const claudeService = new ClaudeService(); 