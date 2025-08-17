// Microsoft Teams Client Library for thinkcompl.ai
// Provides easy-to-use functions for Teams integration

export interface TeamsNotification {
  type: 'itr_update' | 'punch_list_item' | 'task_reminder' | 'report_ready' | 'approval_required';
  projectName: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string;
  dueDate?: string;
  documentId?: string;
  actionUrl?: string;
}

export interface Team {
  id: string;
  displayName: string;
  description?: string;
  webUrl: string;
}

export interface Channel {
  id: string;
  displayName: string;
  description?: string;
  membershipType: 'standard' | 'private';
}

export interface TeamsMessage {
  id: string;
  body: {
    content: string;
    contentType: 'html' | 'text';
  };
  from: {
    user: {
      displayName: string;
      id: string;
    };
  };
  createdDateTime: string;
}

class MicrosoftTeamsClient {
  private baseUrl = '/api/microsoft-teams';

  // Get user's teams
  async getUserTeams(): Promise<Team[]> {
    const response = await fetch(`${this.baseUrl}?action=getTeams`);
    if (!response.ok) {
      throw new Error('Failed to fetch teams');
    }
    const data = await response.json();
    return data.teams;
  }

  // Get channels for a team
  async getTeamChannels(teamId: string): Promise<Channel[]> {
    const response = await fetch(`${this.baseUrl}?action=getChannels&teamId=${teamId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch channels');
    }
    const data = await response.json();
    return data.channels;
  }

  // Get messages from a channel
  async getChannelMessages(teamId: string, channelId: string): Promise<TeamsMessage[]> {
    const response = await fetch(`${this.baseUrl}?action=getMessages&teamId=${teamId}&channelId=${channelId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    const data = await response.json();
    return data.messages;
  }

  // Send a notification to a Teams channel
  async sendNotification(notification: TeamsNotification, teamId: string, channelId: string): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sendNotification',
        notification,
        teamId,
        channelId
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send notification');
    }
  }

  // Send a message to a Teams channel
  async sendMessage(message: string, teamId: string, channelId: string, mentions?: string[]): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sendMessage',
        message,
        teamId,
        channelId,
        mentions
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }
  }

  // Create a Teams meeting
  async createMeeting(subject: string, startTime: string, endTime: string, attendees: string[], agenda?: string): Promise<any> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'createMeeting',
        subject,
        startTime,
        endTime,
        attendees,
        agenda
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create meeting');
    }

    const data = await response.json();
    return data.meeting;
  }

  // Send a task reminder
  async sendTaskReminder(task: any, teamId: string, channelId: string): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sendTaskReminder',
        task,
        teamId,
        channelId
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send task reminder');
    }
  }

  // Helper methods for common thinkcompl.ai use cases

  // Notify when an ITR is completed
  async notifyITRCompleted(projectName: string, itrName: string, completedBy: string, teamId: string, channelId: string): Promise<void> {
    const notification: TeamsNotification = {
      type: 'itr_update',
      projectName,
      message: `ITR "${itrName}" has been completed by ${completedBy}.`,
      priority: 'normal',
      assignedTo: completedBy
    };

    await this.sendNotification(notification, teamId, channelId);
  }

  // Notify when a punch list item needs attention
  async notifyPunchListItem(projectName: string, itemDescription: string, assignedTo: string, priority: 'low' | 'normal' | 'high' | 'urgent', teamId: string, channelId: string): Promise<void> {
    const notification: TeamsNotification = {
      type: 'punch_list_item',
      projectName,
      message: `Punch list item requires attention: ${itemDescription}`,
      priority,
      assignedTo
    };

    await this.sendNotification(notification, teamId, channelId);
  }

  // Notify when a report is ready
  async notifyReportReady(projectName: string, reportType: string, reportUrl: string, teamId: string, channelId: string): Promise<void> {
    const notification: TeamsNotification = {
      type: 'report_ready',
      projectName,
      message: `${reportType} report is now available for review.`,
      priority: 'normal',
      actionUrl: reportUrl
    };

    await this.sendNotification(notification, teamId, channelId);
  }

  // Notify when approval is required
  async notifyApprovalRequired(projectName: string, documentName: string, approver: string, dueDate: string, actionUrl: string, teamId: string, channelId: string): Promise<void> {
    const notification: TeamsNotification = {
      type: 'approval_required',
      projectName,
      message: `Document "${documentName}" requires approval.`,
      priority: 'high',
      assignedTo: approver,
      dueDate,
      actionUrl
    };

    await this.sendNotification(notification, teamId, channelId);
  }

  // Send daily progress update
  async sendDailyProgressUpdate(projectName: string, completedTasks: number, totalTasks: number, upcomingDeadlines: any[], teamId: string, channelId: string): Promise<void> {
    const progressPercentage = Math.round((completedTasks / totalTasks) * 100);
    
    let message = `📊 **Daily Progress Report - ${projectName}**\n\n`;
    message += `✅ Progress: ${completedTasks}/${totalTasks} tasks completed (${progressPercentage}%)\n\n`;
    
    if (upcomingDeadlines.length > 0) {
      message += `⏰ **Upcoming Deadlines:**\n`;
      upcomingDeadlines.forEach(deadline => {
        message += `• ${deadline.task} - Due: ${deadline.date}\n`;
      });
    } else {
      message += `✨ No urgent deadlines upcoming.\n`;
    }

    await this.sendMessage(message, teamId, channelId);
  }

  // Send weekly summary
  async sendWeeklySummary(projectName: string, summary: {
    completedITRs: number;
    pendingApprovals: number;
    upcomingInspections: number;
    criticalIssues: any[];
  }, teamId: string, channelId: string): Promise<void> {
    let message = `📋 **Weekly Summary - ${projectName}**\n\n`;
    message += `📄 ITRs Completed: ${summary.completedITRs}\n`;
    message += `⏳ Pending Approvals: ${summary.pendingApprovals}\n`;
    message += `🔍 Upcoming Inspections: ${summary.upcomingInspections}\n\n`;
    
    if (summary.criticalIssues.length > 0) {
      message += `🚨 **Critical Issues Requiring Attention:**\n`;
      summary.criticalIssues.forEach(issue => {
        message += `• ${issue.description} (${issue.priority})\n`;
      });
    } else {
      message += `✅ No critical issues to report.\n`;
    }

    await this.sendMessage(message, teamId, channelId);
  }
}

export const teamsClient = new MicrosoftTeamsClient();