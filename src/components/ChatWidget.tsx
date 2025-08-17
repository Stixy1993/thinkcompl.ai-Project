"use client";

import { useState, useEffect, useRef } from "react";
import { useThinky } from "@/lib/hooks/useThinky";
import { useAuth } from "@/lib/hooks/useAuth";
import { HiPlus, HiTrash, HiClock, HiChat } from "react-icons/hi";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatWidgetProps {
  fullPage?: boolean;
  apiEndpoint?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ChatWidget({ fullPage = false, apiEndpoint }: ChatWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(fullPage ? true : false);
  const [error, setError] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showLoading, setShowLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTeamChat, setActiveTeamChat] = useState<TeamMember | null>(null);
  const [teamChatMessages, setTeamChatMessages] = useState<{[key: string]: Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: Date}>}>({});
  const [teamChatInput, setTeamChatInput] = useState('');
  
  const {
    messages: thinkyMessages,
    input,
    handleInputChange,
    sendMessage,
    isLoading,
    askCompliance,
    askTechnical,
    askGeneral,
    // New session management
    currentSessionId,
    chatSessions,
    isLoadingSessions,
    loadSession,
    createNewSession,
    deleteSession,
    refreshSessions,
  } = useThinky({
    initialContext: { type: 'general' },
    stream: false, // Disable streaming - responses will appear all at once
    apiEndpoint, // Pass apiEndpoint to the hook
  });

  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper functions for team member avatars
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getBackgroundColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
      'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await fetch('/api/team-members');
        const data = await response.json();
        
        let members = [];
        if (data.success && data.teamMembers && data.teamMembers.length > 0) {
          members = data.teamMembers;
        }
        
        // Add some demo team members to show the stacking effect
        const demoMembers = [
          {
            id: 'john-demo',
            name: 'John Smith',
            email: 'john@company.com', 
            role: 'Project Manager'
          },
          {
            id: 'sarah-demo',
            name: 'Sarah Johnson',
            email: 'sarah@company.com',
            role: 'Quality Engineer'  
          },
          {
            id: 'mike-demo',
            name: 'Mike Chen',
            email: 'mike@company.com',
            role: 'Lead Inspector'
          },
          {
            id: 'emma-demo', 
            name: 'Emma Davis',
            email: 'emma@company.com',
            role: 'Compliance Officer'
          }
        ];
        
        // Combine real members with demo members
        const allMembers = [...members, ...demoMembers];
        setTeamMembers(allMembers);
        
      } catch (error) {
        console.error('Error fetching team members:', error);
        // Fallback to demo members if API fails
        setTeamMembers([
          {
            id: 'john-demo',
            name: 'John Smith',
            email: 'john@company.com', 
            role: 'Project Manager'
          },
          {
            id: 'sarah-demo',
            name: 'Sarah Johnson',
            email: 'sarah@company.com',
            role: 'Quality Engineer'  
          },
          {
            id: 'mike-demo',
            name: 'Mike Chen',
            email: 'mike@company.com',
            role: 'Lead Inspector'
          }
        ]);
      }
    };

    fetchTeamMembers();
  }, []);

  // Auto-scroll to bottom when new messages arrive or when component mounts
  useEffect(() => {
    if (messagesEndRef.current) {
      // Use a small delay to ensure the messages are rendered
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [thinkyMessages, mounted]);

  // Handle loading state more smoothly and scroll when loading starts
  useEffect(() => {
    if (isLoading) {
      setShowLoading(true);
      // Scroll to bottom when loading starts to show "Thinky is thinking..."
      setTimeout(() => scrollToBottom(), 100);
    } else {
      // Simple delay to hide loading after response arrives
      const timer = setTimeout(() => {
        setShowLoading(false);
        // Scroll again after loading ends to show the complete response
        setTimeout(() => scrollToBottom(), 50);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.parentElement;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const messageToSend = input.trim();
    setError(null);
    
    try {
      // Clear the input immediately after sending
      handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
      await sendMessage(messageToSend);
    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to send message. Please check your API configuration.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleThinkyClick = () => {
    const chatWindow = window.open(
      '/chat',
      'ThinkyChat',
      'width=800,height=600,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no'
    );
    setIsOpen(false);
  };

  const handleChatButtonClick = () => {
    setIsOpen(true);
    setError(null);
  };

  const handleTeamMemberClick = (member: TeamMember) => {
    setActiveTeamChat(member);
    setIsOpen(false); // Close Thinky chat if open
    
    // Initialize chat messages for this member if they don't exist
    if (!teamChatMessages[member.id]) {
      setTeamChatMessages(prev => ({
        ...prev,
        [member.id]: [
          {
            id: '1',
            role: 'assistant',
            content: `Hi! I'm ${member.name}. How can I help you with the project today?`,
            timestamp: new Date()
          }
        ]
      }));
    }
  };

  const handleTeamChatSend = () => {
    if (!teamChatInput.trim() || !activeTeamChat) return;
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: teamChatInput.trim(),
      timestamp: new Date()
    };

    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant' as const,
      content: `Thanks for your message! This is a demo response from ${activeTeamChat.name}. In a real implementation, this would connect to a proper chat system.`,
      timestamp: new Date()
    };

    setTeamChatMessages(prev => ({
      ...prev,
      [activeTeamChat.id]: [
        ...(prev[activeTeamChat.id] || []),
        userMessage,
        assistantMessage
      ]
    }));

    setTeamChatInput('');
  };

  const handleTeamChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTeamChatSend();
    }
  };

  const handleNewChat = async () => {
    try {
      setIsCreatingNewChat(true);
      await createNewSession();
      setShowSessions(false);
    } catch (error) {
      console.error('Error creating new chat session:', error);
    } finally {
      setIsCreatingNewChat(false);
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    try {
      await loadSession(sessionId);
      setShowSessions(false);
    } catch (error) {
      console.error('Error loading chat session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (confirm('Are you sure you want to delete this chat session?')) {
        await deleteSession(sessionId);
      }
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  };

  if (!mounted) {
    return null;
  }

  // If fullPage is true, render only the chat interface without the floating button
  if (fullPage) {
    return (
      <div className="min-h-screen h-screen w-full flex flex-row bg-gradient-to-br from-gray-50 to-gray-200">
        {/* Left side: Chat Sessions Panel */}
        <div className="w-80 h-full flex flex-col border-r border-gray-200 bg-white shadow-xl">
          {/* Sessions Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Chat Sessions</h2>
              <button
                onClick={handleNewChat}
                disabled={isCreatingNewChat}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="New Chat"
              >
                {isCreatingNewChat ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <HiPlus className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingSessions ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2">Loading sessions...</p>
              </div>
            ) : chatSessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <HiChat className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No chat sessions yet</p>
                <button
                  onClick={handleNewChat}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              <div className="p-2">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleLoadSession(session.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentSessionId === session.id
                        ? 'bg-blue-100 border border-blue-300'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {session.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {(() => {
                            try {
                              const date = session.updatedAt instanceof Date 
                                ? session.updatedAt 
                                : new Date(session.updatedAt);
                              
                              const now = new Date();
                              const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
                              
                              if (diffInHours < 1) {
                                return 'Just now';
                              } else if (diffInHours < 24) {
                                return `${Math.floor(diffInHours)}h ago`;
                              } else if (diffInHours < 48) {
                                return 'Yesterday';
                              } else {
                                return date.toLocaleDateString();
                              }
                            } catch (error) {
                              return 'Recent';
                            }
                          })()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete session"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Chat Panel */}
        <div className="flex-1 h-full flex flex-col bg-white">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border-b border-red-200">
              <div className="text-red-600 text-sm">
                {error}
                <button 
                  onClick={() => setError(null)}
                  className="ml-2 text-red-800 hover:text-red-900"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center">
            <div className="w-full max-w-4xl flex flex-col space-y-4">
              {thinkyMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} items-end`}
                >
                  {message.role === 'assistant' && (
                    <img
                      src="/Thinky.png"
                      alt="Thinky Avatar"
                      className="w-10 h-10 rounded-full mr-3 border border-gray-300 bg-white object-cover shadow"
                    />
                  )}
                  <div
                    className={`max-w-[70%] px-4 py-3 rounded-lg shadow-md transition-all duration-200 break-words
                      ${message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-200'}
                    `}
                  >
                    {message.content}
                  </div>
                  {message.role === 'user' && (
                    <img
                      src={user?.photoURL || "/user.png"}
                      alt="User Avatar"
                      className="w-10 h-10 rounded-full ml-3 border border-gray-300 bg-white object-cover shadow"
                    />
                  )}
                </div>
              ))}
              {showLoading && (
                <div className="flex justify-start items-end">
                  <img
                    src="/Thinky.png"
                    alt="Thinky Avatar"
                    className="w-10 h-10 rounded-full mr-3 border border-gray-300 bg-white object-cover shadow"
                  />
                  <div className="max-w-[70%] px-4 py-3 rounded-lg shadow-md bg-white text-gray-600 border border-gray-200 animate-pulse">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm">Thinky is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area - fixed to bottom */}
          <div className="w-full px-4 pb-6 sticky bottom-0 z-10">
            <div className="flex items-center bg-white rounded-xl shadow-lg border border-gray-200 p-2">
              <input
                type="text"
                className="flex-1 px-4 py-2 rounded-l-xl outline-none bg-transparent text-gray-900"
                placeholder="Type your message..."
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-r-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={isLoading || !input.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating Chat Bubbles Area */}
      <div 
        className="fixed bottom-6 right-6 z-40"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="relative" style={{ minWidth: '60px', minHeight: '300px' }}>
          {/* Team Member Bubbles */}
          {teamMembers.map((member, index) => (
            <div
              key={member.id}
              className="absolute bottom-0 right-0 transition-all duration-300 ease-out cursor-pointer"
              style={{
                transform: isExpanded 
                  ? `translateY(-${(index + 1) * 70}px) translateX(0px)` 
                  : `translateY(-${(index + 1) * 12}px) translateX(0px)`,
                zIndex: 40 - index
              }}
              onClick={() => handleTeamMemberClick(member)}
            >
              <div className="relative">
                <div className={`w-14 h-14 rounded-full border border-gray-300 flex items-center justify-center text-sm font-medium text-white shadow-lg hover:scale-110 transition-transform ${getBackgroundColor(member.name)}`}>
                  {getInitials(member.name)}
                </div>
              </div>
            </div>
          ))}

          {/* Thinky - Always on bottom, highest z-index */}
          <button
            onClick={handleChatButtonClick}
            className="absolute bottom-0 right-0 w-14 h-14 bg-white rounded-full shadow-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-2xl flex items-center justify-center transition-all duration-300 group z-50"
          >
            <img 
              src="/Thinky.png" 
              alt="Thinky" 
              className="w-13 h-13 object-cover rounded-full"
            />
            {/* Tooltip */}
            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-80 transition-opacity duration-200 whitespace-nowrap z-50">
              Ask Thinky
            </span>
          </button>
        </div>
      </div>

      {/* Regular Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-white rounded-lg shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-500 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden">
                <img 
                  src="/Thinky.png" 
                  alt="Thinky" 
                  className="w-8 h-8 object-cover rounded-full"
                />
              </div>
              <div>
                <button 
                  onClick={handleThinkyClick}
                  className="font-semibold hover:text-blue-200 transition-colors cursor-pointer"
                >
                  Thinky
                </button>
                <p className="text-xs text-blue-100">Project Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSessions(!showSessions)}
                className="text-white hover:text-gray-200 hover:bg-blue-700 transition-colors p-2 rounded-lg"
                title="Chat Sessions"
              >
                <HiClock className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 hover:bg-blue-700 transition-colors p-2 rounded-lg"
                title="Minimize"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Sessions Panel */}
          {showSessions && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              <div className="p-2">
                <div className="flex items-center justify-between p-2 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-800">Chat Sessions</h3>
                  <button
                    onClick={handleNewChat}
                    disabled={isCreatingNewChat}
                    className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="New Chat"
                  >
                    {isCreatingNewChat ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    ) : (
                      <HiPlus className="w-3 h-3" />
                    )}
                  </button>
                </div>
                {isLoadingSessions ? (
                  <div className="p-2 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : chatSessions.length === 0 ? (
                  <div className="p-2 text-center text-gray-500 text-xs">
                    No sessions yet
                  </div>
                ) : (
                  <div className="space-y-1">
                    {chatSessions.slice(0, 5).map((session) => (
                      <div
                        key={session.id}
                        onClick={() => handleLoadSession(session.id)}
                        className={`p-2 rounded cursor-pointer transition-colors text-xs ${
                          currentSessionId === session.id
                            ? 'bg-blue-100 border border-blue-300'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate flex-1">{session.title}</span>
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="ml-1 p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <HiTrash className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border-b border-red-200">
              <div className="text-red-600 text-sm">
                {error}
                <button 
                  onClick={() => setError(null)}
                  className="ml-2 text-red-800 hover:text-red-900"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {thinkyMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date().toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
              </div>
            ))}
            {showLoading && (
              <div className="flex justify-start items-end">
                <img
                  src="/Thinky.png"
                  alt="Thinky Avatar"
                  className="w-8 h-8 rounded-full mr-2 border border-gray-300 bg-white object-cover shadow"
                />
                <div className="max-w-[80%] px-3 py-2 rounded-lg bg-gray-100 text-gray-800">
                  <p className="text-sm">Thinky is thinking...</p>
                </div>
              </div>
            )}
            {/* Invisible div for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Ask Thinky anything..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Member Chat Window */}
      {activeTeamChat && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-white rounded-lg shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-500 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${getBackgroundColor(activeTeamChat.name)}`}>
                {getInitials(activeTeamChat.name)}
              </div>
              <div>
                <h3 className="font-semibold">{activeTeamChat.name}</h3>
                <p className="text-xs text-blue-100">{activeTeamChat.role || 'Team Member'}</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTeamChat(null)}
              className="text-white hover:text-gray-200 hover:bg-blue-700 transition-colors p-2 rounded-lg"
              title="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {(teamChatMessages[activeTeamChat.id] || []).map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} items-end`}
              >
                {message.role === 'assistant' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white mr-2 ${getBackgroundColor(activeTeamChat.name)}`}>
                    {getInitials(activeTeamChat.name)}
                  </div>
                )}
                <div
                  className={`max-w-[70%] px-3 py-2 rounded-lg shadow-sm transition-all duration-200 break-words text-sm
                    ${message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800 border border-gray-200'}
                  `}
                >
                  {message.content}
                </div>
                {message.role === 'user' && (
                  <img
                    src={user?.photoURL || "/user.png"}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full ml-2 border border-gray-300 bg-white object-cover shadow-sm"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex items-center bg-gray-50 rounded-lg p-2">
              <input
                type="text"
                className="flex-1 px-3 py-2 bg-transparent outline-none text-gray-900 text-sm"
                placeholder={`Message ${activeTeamChat.name}...`}
                value={teamChatInput}
                onChange={(e) => setTeamChatInput(e.target.value)}
                onKeyDown={handleTeamChatKeyPress}
              />
              <button
                onClick={handleTeamChatSend}
                className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={!teamChatInput.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 