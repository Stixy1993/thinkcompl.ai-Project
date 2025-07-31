import { useState, useCallback } from 'react';
import { useChat } from 'ai/react';

export interface ThinkyContext {
  type: 'compliance' | 'technical' | 'general';
  projectId?: string;
  userId?: string;
  currentPage?: string;
}

export interface ThinkyMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  context?: ThinkyContext;
}

export interface UseThinkyOptions {
  initialContext?: ThinkyContext;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean; // New option to control streaming
  apiEndpoint?: string;
}

export function useThinky(options: UseThinkyOptions = {}) {
  const [context, setContext] = useState<ThinkyContext>(options.initialContext || { type: 'general' });
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);
  const [isLoadingNonStreaming, setIsLoadingNonStreaming] = useState(false);

  const api = options.apiEndpoint || '/api/claude/chat';
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    reload,
    stop,
    isLoading: chatLoading,
  } = useChat({
    api,
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm Thinky, your AI assistant. I can help you with compliance, technical questions, and general guidance. How can I assist you today?",
      },
    ],
    body: {
      context: context.type,
      model: options.model,
      maxTokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.7,
      stream: options.stream !== false, // Default to true for streaming
    },
    onFinish: (message) => {
      console.log('Chat finished:', message);
      setIsLoadingComplete(true);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setIsLoadingComplete(false);
    },
  });

  // Custom send message function for non-streaming mode
  const sendMessageNonStreaming = useCallback(async (content: string, messageContext?: Partial<ThinkyContext>) => {
    if (!content.trim()) return;

    const updatedContext = { ...context, ...messageContext };
    setContext(updatedContext);
    
    // Add user message immediately
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: content.trim(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoadingNonStreaming(true);
    
    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: updatedContext.type,
          model: options.model,
          maxTokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.7,
          stream: false, // Force non-streaming
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const text = await response.text();
      console.log('Claude response text:', text);

      // Try to extract content from different response formats
      let content = text;
      try {
        // First, try to parse as a single JSON object
        const jsonResponse = JSON.parse(text);
        if (jsonResponse.content) {
          content = jsonResponse.content;
        } else if (jsonResponse.text) {
          content = jsonResponse.text;
        } else if (typeof jsonResponse === 'string') {
          content = jsonResponse;
        }
      } catch (e) {
        // Not a single JSON object, try NDJSON parsing
        try {
          const lines = text.split('\n').filter(Boolean);
          for (const line of lines) {
            const obj = JSON.parse(line);
            if (obj.content) {
              content = obj.content;
              break;
            } else if (obj.text) {
              content = obj.text;
              break;
            } else if (obj.delta && obj.delta.content) {
              content = obj.delta.content;
              break;
            }
          }
        } catch (e2) {
          // Not JSON at all, use raw text
          console.log('Using raw text as response');
        }
      }
      
      console.log('Extracted content:', content);
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the user message if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      // Add a small delay to ensure loading state is visible
      setTimeout(() => {
        setIsLoadingNonStreaming(false);
      }, 200);
    }
  }, [context, messages, setMessages, options, api]);

  // Update context and reload conversation
  const updateContext = useCallback((newContext: Partial<ThinkyContext>) => {
    setContext(prev => ({ ...prev, ...newContext }));
    // Reload with new context
    reload();
  }, [reload]);

  // Send a message with specific context
  const sendMessage = useCallback(async (content: string, messageContext?: Partial<ThinkyContext>) => {
    try {
      if (options.stream === false) {
        // Use non-streaming mode
        await sendMessageNonStreaming(content, messageContext);
      } else {
        // Use default streaming mode
        const updatedContext = { ...context, ...messageContext };
        setContext(updatedContext);
        
        // Use the handleSubmit from useChat
        await handleSubmit(new Event('submit') as any);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [context, handleSubmit, options.stream, sendMessageNonStreaming]);

  // Compliance-specific helper
  const askCompliance = useCallback((question: string) => {
    return sendMessage(question, { type: 'compliance' });
  }, [sendMessage]);

  // Technical-specific helper
  const askTechnical = useCallback((question: string) => {
    return sendMessage(question, { type: 'technical' });
  }, [sendMessage]);

  // General helper
  const askGeneral = useCallback((question: string) => {
    return sendMessage(question, { type: 'general' });
  }, [sendMessage]);

  return {
    messages,
    input,
    handleInputChange,
    sendMessage,
    askCompliance,
    askTechnical,
    askGeneral,
    updateContext,
    context,
    isLoading: chatLoading || isLoadingNonStreaming,
    isLoadingComplete,
    setMessages,
    reload,
    stop,
  };
} 