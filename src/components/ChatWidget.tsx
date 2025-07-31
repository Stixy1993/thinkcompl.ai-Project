"use client";

import { useState, useEffect, useRef } from "react";
import { useThinky } from "@/lib/hooks/useThinky";
import { useAuth } from "@/lib/hooks/useAuth";

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

export default function ChatWidget({ fullPage = false, apiEndpoint }: ChatWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(fullPage ? true : false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showLoading, setShowLoading] = useState(false);
  
  const {
    messages: thinkyMessages,
    input,
    handleInputChange,
    sendMessage,
    isLoading,
    askCompliance,
    askTechnical,
    askGeneral,
  } = useThinky({
    initialContext: { type: 'general' },
    stream: false, // Disable streaming - responses will appear all at once
    apiEndpoint, // Pass apiEndpoint to the hook
  });

  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [thinkyMessages]);

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

  // Remove the complex message-based loading logic

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  if (!mounted) {
    return null;
  }

  // If fullPage is true, render only the chat interface without the floating button
  if (fullPage) {
    return (
      <div className="min-h-screen h-screen w-full flex flex-row bg-gradient-to-br from-gray-50 to-gray-200">
        {/* Left side: Chat Panel - full width */}
        <div className="w-1/2 h-full flex flex-col border-r border-gray-200 bg-white shadow-xl">
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
        {/* Right side: Document Discussion Area placeholder */}
        <div className="w-1/2 flex items-center justify-center border-l border-gray-200 bg-white/60">
          <div className="text-gray-400 text-xl font-semibold">Document Discussion Area</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={handleChatButtonClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-white rounded-full shadow-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-2xl flex items-center justify-center z-40 transition-all duration-300 group"
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
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 hover:bg-blue-700 transition-colors p-2 rounded-lg"
              title="Minimize"
            >
              ✕
            </button>
          </div>

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
    </>
  );
} 