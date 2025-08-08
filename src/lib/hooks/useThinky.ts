import { useState, useCallback, useEffect } from 'react';
import { useChat } from 'ai/react';
import { saveChatMessages, loadChatMessages, getChatSessions, deleteChatSession, type ChatMessage, type ChatSession } from '../firebase/firebaseUtils';
import { useAuth } from './useAuth';

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
  sessionId?: string; // New option for session management
}

export function useThinky(options: UseThinkyOptions = {}) {
  const [context, setContext] = useState<ThinkyContext>(options.initialContext || { type: 'general' });
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);
  const [isLoadingNonStreaming, setIsLoadingNonStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(options.sessionId || null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const { user } = useAuth();

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
    onFinish: async (message) => {
      console.log('Chat finished:', message);
      setIsLoadingComplete(true);
      
      // Save messages to backend after each response
      if (user && messages.length > 0) {
        try {
          console.log('User authenticated, saving messages. User ID:', user.uid);
          const chatMessages: ChatMessage[] = messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            role: msg.role as 'user' | 'assistant',
            timestamp: new Date(),
            context: context
          }));
          
          console.log('Saving chat messages:', chatMessages.length, 'messages');
          const sessionId = await saveChatMessages(user.uid, chatMessages, currentSessionId || undefined);
          if (!currentSessionId) {
            setCurrentSessionId(sessionId);
          }
          console.log('Chat messages saved successfully, session ID:', sessionId);
        } catch (error) {
          console.error('Failed to save chat messages:', error);
          // Don't throw the error - just log it so the chat continues to work
        }
      } else {
        console.log('Not saving messages - user not authenticated or no messages');
      }
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setIsLoadingComplete(false);
    },
  });

  // Load chat sessions on component mount
  useEffect(() => {
    const loadSessions = async () => {
      if (!user) {
        console.log('User not authenticated - skipping session load');
        return;
      }
      
      setIsLoadingSessions(true);
      try {
        const sessions = await getChatSessions();
        console.log('Loaded chat sessions:', sessions.length);
        setChatSessions(sessions);
        
        // If there are sessions and no current session is loaded, load the most recent one
        if (sessions.length > 0 && !currentSessionId && !options.sessionId) {
          const mostRecentSession = sessions[0]; // Sessions are sorted by updatedAt descending
          console.log('Loading most recent session:', mostRecentSession.id, 'with', mostRecentSession.messages.length, 'messages');
          
          const sessionMessages = await loadChatMessages(mostRecentSession.id);
          if (sessionMessages.length > 0) {
            const formattedMessages = sessionMessages.map(msg => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
            }));
            console.log('Setting messages:', formattedMessages.length);
            setMessages(formattedMessages);
            setCurrentSessionId(mostRecentSession.id);
          }
        } else if (sessions.length === 0) {
          console.log('No existing sessions found - starting fresh');
        }
      } catch (error) {
        console.error('Failed to load chat sessions:', error);
        // Don't throw the error - just log it
      } finally {
        setIsLoadingSessions(false);
      }
    };

    loadSessions();
  }, [user]); // Remove currentSessionId and options.sessionId from dependencies to prevent infinite loops

  // Load specific session if sessionId is provided
  useEffect(() => {
    const loadSession = async () => {
      if (!user || !options.sessionId) {
        console.log('User not authenticated or no sessionId provided - skipping session load');
        return;
      }
      
      try {
        const sessionMessages = await loadChatMessages(options.sessionId);
        if (sessionMessages.length > 0) {
          const formattedMessages = sessionMessages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
          }));
          setMessages(formattedMessages);
          setCurrentSessionId(options.sessionId);
        }
      } catch (error) {
        console.error('Failed to load chat session:', error);
        // Don't throw the error - just log it
      }
    };

    loadSession();
  }, [user, options.sessionId, setMessages]);

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
      
      // Save messages to backend
      if (user) {
        try {
          const chatMessages: ChatMessage[] = [...messages, userMessage, assistantMessage].map(msg => ({
            id: msg.id,
            content: msg.content,
            role: msg.role as 'user' | 'assistant',
            timestamp: new Date(),
            context: updatedContext
          }));
          
          const sessionId = await saveChatMessages(user.uid, chatMessages, currentSessionId || undefined);
          if (!currentSessionId) {
            setCurrentSessionId(sessionId);
          }
        } catch (error) {
          console.error('Failed to save chat messages:', error);
          // Don't throw the error - just log it so the chat continues to work
        }
      }
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
  }, [context, messages, setMessages, options, api, user, currentSessionId]);

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

  // Load a specific chat session
  const loadSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    
    try {
      const sessionMessages = await loadChatMessages(sessionId);
      if (sessionMessages.length > 0) {
        const formattedMessages = sessionMessages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
        }));
        setMessages(formattedMessages);
        setCurrentSessionId(sessionId);
      }
    } catch (error) {
      console.error('Failed to load chat session:', error);
    }
  }, [user, setMessages]);

  // Create a new chat session
  const createNewSession = useCallback(async () => {
    // Save current session before creating a new one
    if (user && messages.length > 1 && currentSessionId) {
      // Only save if there are meaningful messages (not just the welcome message)
      const meaningfulMessages = messages.filter(msg => 
        msg.role === 'user' || (msg.role === 'assistant' && msg.content !== "Hi! I'm Thinky, your AI assistant. I can help you with compliance, technical questions, and general guidance. How can I assist you today?")
      );
      
      if (meaningfulMessages.length > 1) {
        try {
          console.log('Saving current session before creating new one');
          const chatMessages: ChatMessage[] = messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            role: msg.role as 'user' | 'assistant',
            timestamp: new Date(),
            context: context
          }));
          
          await saveChatMessages(user.uid, chatMessages, currentSessionId);
          console.log('Current session saved before creating new one');
          
          // Refresh the sessions list to show the updated session
          try {
            const sessions = await getChatSessions();
            setChatSessions(sessions);
          } catch (error) {
            console.error('Failed to refresh sessions list:', error);
          }
        } catch (error) {
          console.error('Failed to save current session:', error);
        }
      } else {
        console.log('No meaningful messages to save - skipping session save');
      }
    }
    
    // Create new session
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm Thinky, your AI assistant. I can help you with compliance, technical questions, and general guidance. How can I assist you today?",
      },
    ]);
    setCurrentSessionId(null);
  }, [setMessages, user, messages, currentSessionId, context]);

  // Delete a chat session
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    
    try {
      await deleteChatSession(sessionId);
      // Remove from local state
      setChatSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // If this was the current session, create a new one
      if (currentSessionId === sessionId) {
        createNewSession();
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error);
    }
  }, [user, currentSessionId, createNewSession]);

  // Refresh chat sessions
  const refreshSessions = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingSessions(true);
    try {
      const sessions = await getChatSessions();
      setChatSessions(sessions);
    } catch (error) {
      console.error('Failed to refresh chat sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [user]);

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
    // New session management functions
    currentSessionId,
    chatSessions,
    isLoadingSessions,
    loadSession,
    createNewSession,
    deleteSession,
    refreshSessions,
  };
} 