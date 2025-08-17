'use client';

import React, { useState, useEffect } from 'react';
import { HiChatBubbleLeftRight, HiUsers, HiMegaphone, HiBell, HiCheck, HiXMark, HiArrowPath } from 'react-icons/hi2';
import { teamsClient, Team, Channel, TeamsNotification } from '@/lib/microsoft-teams';
import Button from './Button';

interface MicrosoftTeamsWidgetProps {
  projectName?: string;
  className?: string;
  isPreviewMode?: boolean;
}

export default function MicrosoftTeamsWidget({ projectName, className = '', isPreviewMode = false }: MicrosoftTeamsWidgetProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'teams' | 'notifications' | 'messages'>('teams');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState<TeamsNotification['type']>('task_reminder');
  const [priority, setPriority] = useState<TeamsNotification['priority']>('normal');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender: string;
    content: string;
    timestamp: Date;
    isOwn: boolean;
    avatar?: string;
  }>>([]);

  // Mock data for preview mode
  const mockTeams: Team[] = [
    {
      id: 'mock-team-1',
      displayName: 'thinkcompl.ai Project Team',
      description: 'Main project collaboration team',
      memberCount: 8
    },
    {
      id: 'mock-team-2', 
      displayName: 'Quality Assurance',
      description: 'Quality control and testing team',
      memberCount: 4
    }
  ];

  const mockChannels: Channel[] = [
    {
      id: 'mock-channel-1',
      displayName: 'General',
      description: 'General team discussions',
      memberCount: 8
    },
    {
      id: 'mock-channel-2',
      displayName: 'Project Updates',
      description: 'Daily project status updates',
      memberCount: 6
    },
    {
      id: 'mock-channel-3',
      displayName: 'ITR Reviews',
      description: 'Inspection Test Report discussions',
      memberCount: 4
    }
  ];

  // Mock chat messages for preview mode
  const mockChatMessages = [
    {
      id: '1',
      sender: 'John Smith',
      content: 'Hey team, just uploaded the latest ITR draft to SharePoint. Could you review by EOD?',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      isOwn: false,
      avatar: '👨‍💼'
    },
    {
      id: '2',
      sender: 'You',
      content: 'Thanks John! I\'ll review it this afternoon.',
      timestamp: new Date(Date.now() - 1000 * 60 * 25), // 25 minutes ago
      isOwn: true
    },
    {
      id: '3',
      sender: 'Thinky',
      content: 'I\'ve analyzed the ITR document. Found 3 compliance items that need attention. Would you like me to generate a summary?',
      timestamp: new Date(Date.now() - 1000 * 60 * 20), // 20 minutes ago
      isOwn: false,
      avatar: '🤖'
    },
    {
      id: '4',
      sender: 'Sarah Johnson',
      content: 'Perfect timing! The audit is next week, so any compliance issues should be addressed ASAP.',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      isOwn: false,
      avatar: '👩‍🔧'
    },
    {
      id: '5',
      sender: 'Thinky',
      content: '📋 Compliance Summary Generated!\n\n• Temperature calibration due for Equipment #TB-101\n• Missing witness signature on Test Report #ITR-2024-08\n• Documentation upload pending for Phase 2 inspection\n\nShall I create tasks for these items?',
      timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
      isOwn: false,
      avatar: '🤖'
    }
  ];

  // Load user's teams on component mount
  useEffect(() => {
    if (isPreviewMode) {
      // Use mock data in preview mode
      setTeams(mockTeams);
      setSelectedTeam(mockTeams[0]);
      setChannels(mockChannels);
      setSelectedChannel(mockChannels[0]);
      setChatMessages(mockChatMessages);
    } else {
      loadTeams();
    }
  }, [isPreviewMode]);

  // Load channels when team is selected
  useEffect(() => {
    if (selectedTeam && !isPreviewMode) {
      loadChannels(selectedTeam.id);
    }
  }, [selectedTeam, isPreviewMode]);

  const loadTeams = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userTeams = await teamsClient.getUserTeams();
      setTeams(userTeams);
      
      // Auto-select first team if available
      if (userTeams.length > 0 && !selectedTeam) {
        setSelectedTeam(userTeams[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  };

  const loadChannels = async (teamId: string) => {
    try {
      setIsLoading(true);
      const teamChannels = await teamsClient.getTeamChannels(teamId);
      setChannels(teamChannels);
      
      // Auto-select General channel if available
      const generalChannel = teamChannels.find(c => c.displayName.toLowerCase() === 'general');
      if (generalChannel && !selectedChannel) {
        setSelectedChannel(generalChannel);
      } else if (teamChannels.length > 0 && !selectedChannel) {
        setSelectedChannel(teamChannels[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedTeam || !selectedChannel || !message.trim()) {
      return;
    }

    try {
      setIsLoading(true);
      await teamsClient.sendMessage(message, selectedTeam.id, selectedChannel.id);
      setMessage('');
      setError(null);
      alert('Message sent successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const sendNotification = async () => {
    if (!selectedTeam || !selectedChannel || !message.trim()) {
      return;
    }

    try {
      setIsLoading(true);
      const notification: TeamsNotification = {
        type: notificationType,
        projectName: projectName || 'thinkcompl.ai Project',
        message: message.trim(),
        priority
      };

      await teamsClient.sendNotification(notification, selectedTeam.id, selectedChannel.id);
      setMessage('');
      setError(null);
      alert('Notification sent successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationTypeIcon = (type: TeamsNotification['type']) => {
    switch (type) {
      case 'itr_update': return '📄';
      case 'punch_list_item': return '✅';
      case 'task_reminder': return '⏰';
      case 'report_ready': return '📊';
      case 'approval_required': return '✋';
      default: return '📋';
    }
  };

  const getPriorityColor = (priority: TeamsNotification['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
        <div className="flex items-center gap-3">
          <HiChatBubbleLeftRight className="w-6 h-6" />
          <div>
            <h3 className="text-lg font-semibold">Microsoft Teams</h3>
            <p className="text-blue-100 text-sm">Send notifications and messages</p>
          </div>
          <button
            onClick={loadTeams}
            disabled={isLoading}
            className="ml-auto p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <HiArrowPath className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {[
            { id: 'teams', label: 'Teams', icon: HiUsers },
            { id: 'notifications', label: 'Notifications', icon: HiBell },
            { id: 'messages', label: 'Messages', icon: HiChatBubbleLeftRight }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <HiXMark className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Team</label>
              <select
                value={selectedTeam?.id || ''}
                onChange={(e) => {
                  const team = teams.find(t => t.id === e.target.value);
                  setSelectedTeam(team || null);
                  setSelectedChannel(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="">Select a team...</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.displayName}
                  </option>
                ))}
              </select>
            </div>

            {selectedTeam && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Channel</label>
                <select
                  value={selectedChannel?.id || ''}
                  onChange={(e) => {
                    const channel = channels.find(c => c.id === e.target.value);
                    setSelectedChannel(channel || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="">Select a channel...</option>
                  {channels.map(channel => (
                    <option key={channel.id} value={channel.id}>
                      # {channel.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedTeam && selectedChannel && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <HiCheck className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-green-800 font-medium">{selectedTeam.displayName}</p>
                    <p className="text-green-600 text-sm"># {selectedChannel.displayName}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notification Type</label>
              <select
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value as TeamsNotification['type'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="task_reminder">{getNotificationTypeIcon('task_reminder')} Task Reminder</option>
                <option value="itr_update">{getNotificationTypeIcon('itr_update')} ITR Update</option>
                <option value="punch_list_item">{getNotificationTypeIcon('punch_list_item')} Punch List Item</option>
                <option value="report_ready">{getNotificationTypeIcon('report_ready')} Report Ready</option>
                <option value="approval_required">{getNotificationTypeIcon('approval_required')} Approval Required</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TeamsNotification['priority'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">🔹 Low</option>
                <option value="normal">🔵 Normal</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your notification message..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Preview */}
            {message.trim() && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(priority)}`}>
                  <span>{getNotificationTypeIcon(notificationType)}</span>
                  <span>{priority.toUpperCase()}</span>
                </div>
                <p className="text-gray-800 mt-2">{message}</p>
              </div>
            )}

            <Button
              onClick={sendNotification}
              disabled={!selectedTeam || !selectedChannel || !message.trim() || isLoading}
              className="w-full"
            >
              <HiMegaphone className="w-4 h-4 mr-2" />
              Send Notification
            </Button>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="flex flex-col h-96">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-gray-50 rounded-lg">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${msg.isOwn ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {msg.avatar ? (
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-sm">
                        {msg.avatar}
                      </div>
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                        msg.isOwn ? 'bg-blue-500' : 'bg-gray-500'
                      }`}>
                        {msg.sender.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-xs ${msg.isOwn ? 'text-right' : ''}`}>
                    {/* Sender Name */}
                    {!msg.isOwn && (
                      <div className="text-xs text-gray-500 mb-1 px-2">
                        {msg.sender}
                      </div>
                    )}
                    
                    {/* Message Content */}
                    <div className={`inline-block px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                      msg.isOwn 
                        ? 'bg-blue-500 text-white rounded-br-sm' 
                        : msg.sender === 'Thinky'
                        ? 'bg-orange-100 text-orange-900 border border-orange-200 rounded-bl-sm'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                    
                    {/* Timestamp */}
                    <div className={`text-xs text-gray-400 mt-1 px-2 ${msg.isOwn ? 'text-right' : ''}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (message.trim()) {
                      // Add new message
                      const newMessage = {
                        id: Date.now().toString(),
                        sender: 'You',
                        content: message.trim(),
                        timestamp: new Date(),
                        isOwn: true
                      };
                      setChatMessages(prev => [...prev, newMessage]);
                      setMessage('');
                    }
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (message.trim()) {
                    const newMessage = {
                      id: Date.now().toString(),
                      sender: 'You',
                      content: message.trim(),
                      timestamp: new Date(),
                      isOwn: true
                    };
                    setChatMessages(prev => [...prev, newMessage]);
                    setMessage('');
                  }
                }}
                disabled={!message.trim()}
                className="px-4 py-2"
              >
                <HiChatBubbleLeftRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {selectedTeam && selectedChannel && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setActiveTab('notifications');
                  setNotificationType('task_reminder');
                  setMessage('Daily standup meeting reminder - please be ready to share your progress updates.');
                }}
                className="p-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
              >
                ⏰ Daily Standup
              </button>
              <button
                onClick={() => {
                  setActiveTab('notifications');
                  setNotificationType('report_ready');
                  setMessage('Weekly progress report is now available for review.');
                }}
                className="p-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
              >
                📊 Weekly Report
              </button>
              <button
                onClick={() => {
                  setActiveTab('notifications');
                  setNotificationType('approval_required');
                  setPriority('high');
                  setMessage('ITR document requires approval before proceeding to next phase.');
                }}
                className="p-2 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors"
              >
                ✋ Need Approval
              </button>
              <button
                onClick={() => {
                  setActiveTab('notifications');
                  setNotificationType('punch_list_item');
                  setMessage('New punch list item added - requires immediate attention.');
                }}
                className="p-2 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors"
              >
                ✅ Punch List
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}