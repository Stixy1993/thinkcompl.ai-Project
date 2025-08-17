import { NextRequest, NextResponse } from 'next/server';

// Microsoft Teams integration API
// Handles Teams notifications, messages, and channel interactions

interface TeamsMessage {
  body: {
    content: string;
    contentType: 'html' | 'text';
  };
  subject?: string;
  importance?: 'low' | 'normal' | 'high' | 'urgent';
  mentions?: Array<{
    id: number;
    mentionText: string;
    mentioned: {
      user: {
        displayName: string;
        id: string;
        userIdentityType: string;
      };
    };
  }>;
}

interface TeamsNotification {
  type: 'itr_update' | 'punch_list_item' | 'task_reminder' | 'report_ready' | 'approval_required';
  projectName: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string;
  dueDate?: string;
  documentId?: string;
  actionUrl?: string;
}

// Get access token from request cookies
async function getAccessToken(request: NextRequest): Promise<string> {
  const token = request.cookies.get('sharepoint_access_token')?.value;
  if (!token) {
    throw new Error('No access token found. Please authenticate with Microsoft first.');
  }
  return token;
}

// Refresh access token if needed
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.SHAREPOINT_CLIENT_ID || '',
      client_secret: process.env.SHAREPOINT_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

// Make Microsoft Graph API request with token refresh handling
async function makeGraphRequest(endpoint: string, options: RequestInit = {}, request: NextRequest): Promise<any> {
  let token = await getAccessToken(request);

  const makeRequest = async (currentToken: string) => {
    return await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  };

  let response = await makeRequest(token);

  // If token expired, try to refresh
  if (response.status === 401) {
    const refreshToken = request.cookies.get('sharepoint_refresh_token')?.value;
    if (refreshToken) {
      try {
        token = await refreshAccessToken(refreshToken);
        response = await makeRequest(token);
      } catch (error) {
        console.error('Failed to refresh token:', error);
        throw new Error('Authentication failed. Please sign in again.');
      }
    } else {
      throw new Error('Authentication expired. Please sign in again.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Microsoft Graph API error: ${errorData.error?.message || response.statusText}`);
  }

  return response.json();
}

// Get user's teams
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'getTeams':
        return await getUserTeams(request);
      case 'getChannels':
        const teamId = searchParams.get('teamId');
        if (!teamId) {
          return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
        }
        return await getTeamChannels(request, teamId);
      case 'getMessages':
        const channelTeamId = searchParams.get('teamId');
        const channelId = searchParams.get('channelId');
        if (!channelTeamId || !channelId) {
          return NextResponse.json({ error: 'teamId and channelId are required' }, { status: 400 });
        }
        return await getChannelMessages(request, channelTeamId, channelId);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in Teams GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Teams data' },
      { status: 500 }
    );
  }
}

// Send Teams notifications and messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'sendNotification':
        return await sendTeamsNotification(request, body);
      case 'sendMessage':
        return await sendTeamsMessage(request, body);
      case 'createMeeting':
        return await createTeamsMeeting(request, body);
      case 'sendTaskReminder':
        return await sendTaskReminder(request, body);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in Teams POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send Teams notification' },
      { status: 500 }
    );
  }
}

// Get user's teams
async function getUserTeams(request: NextRequest) {
  const data = await makeGraphRequest('/me/joinedTeams', {}, request);
  return NextResponse.json({ teams: data.value });
}

// Get channels for a team
async function getTeamChannels(request: NextRequest, teamId: string) {
  const data = await makeGraphRequest(`/teams/${teamId}/channels`, {}, request);
  return NextResponse.json({ channels: data.value });
}

// Get messages from a channel
async function getChannelMessages(request: NextRequest, teamId: string, channelId: string) {
  const data = await makeGraphRequest(`/teams/${teamId}/channels/${channelId}/messages`, {}, request);
  return NextResponse.json({ messages: data.value });
}

// Send a formatted notification to Teams
async function sendTeamsNotification(request: NextRequest, body: { notification: TeamsNotification; teamId: string; channelId: string }) {
  const { notification, teamId, channelId } = body;

  // Format the notification message based on type
  const messageContent = formatNotificationMessage(notification);

  const teamsMessage: TeamsMessage = {
    body: {
      content: messageContent,
      contentType: 'html'
    },
    importance: notification.priority === 'urgent' ? 'urgent' : notification.priority
  };

  const data = await makeGraphRequest(
    `/teams/${teamId}/channels/${channelId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(teamsMessage)
    },
    request
  );

  return NextResponse.json({ success: true, message: data });
}

// Send a direct message to Teams
async function sendTeamsMessage(request: NextRequest, body: { message: string; teamId: string; channelId: string; mentions?: string[] }) {
  const { message, teamId, channelId, mentions } = body;

  const teamsMessage: TeamsMessage = {
    body: {
      content: message,
      contentType: 'html'
    }
  };

  // Add mentions if provided
  if (mentions && mentions.length > 0) {
    // Note: Mentions require user IDs which would need to be resolved separately
    // This is a simplified implementation
    teamsMessage.body.content = `${mentions.map(m => `@${m}`).join(' ')} ${message}`;
  }

  const data = await makeGraphRequest(
    `/teams/${teamId}/channels/${channelId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(teamsMessage)
    },
    request
  );

  return NextResponse.json({ success: true, message: data });
}

// Create a Teams meeting
async function createTeamsMeeting(request: NextRequest, body: { subject: string; startTime: string; endTime: string; attendees: string[]; agenda?: string }) {
  const { subject, startTime, endTime, attendees, agenda } = body;

  const meeting = {
    subject,
    body: {
      contentType: 'HTML',
              content: agenda || 'thinkcompl.ai Project Meeting'
    },
    start: {
      dateTime: startTime,
      timeZone: 'UTC'
    },
    end: {
      dateTime: endTime,
      timeZone: 'UTC'
    },
    attendees: attendees.map(email => ({
      emailAddress: {
        address: email,
        name: email.split('@')[0]
      },
      type: 'required'
    })),
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness'
  };

  const data = await makeGraphRequest(
    '/me/events',
    {
      method: 'POST',
      body: JSON.stringify(meeting)
    },
    request
  );

  return NextResponse.json({ success: true, meeting: data });
}

// Send task reminder
async function sendTaskReminder(request: NextRequest, body: { task: any; teamId: string; channelId: string }) {
  const { task, teamId, channelId } = body;

  const reminderContent = `
    <div>
      <h3>🔔 Task Reminder</h3>
      <p><strong>Task:</strong> ${task.title}</p>
      <p><strong>Due Date:</strong> ${task.dueDate}</p>
      <p><strong>Assigned To:</strong> ${task.assignedTo}</p>
      <p><strong>Priority:</strong> ${task.priority}</p>
      ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
      ${task.actionUrl ? `<p><a href="${task.actionUrl}">View Task in thinkcompl.ai</a></p>` : ''}
    </div>
  `;

  const teamsMessage: TeamsMessage = {
    body: {
      content: reminderContent,
      contentType: 'html'
    },
    importance: task.priority === 'urgent' ? 'urgent' : 'normal'
  };

  const data = await makeGraphRequest(
    `/teams/${teamId}/channels/${channelId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(teamsMessage)
    },
    request
  );

  return NextResponse.json({ success: true, reminder: data });
}

// Format notification message based on type
function formatNotificationMessage(notification: TeamsNotification): string {
  const { type, projectName, message, assignedTo, dueDate, actionUrl } = notification;

  let icon = '📋';
      let title = 'thinkcompl.ai Notification';

  switch (type) {
    case 'itr_update':
      icon = '📄';
      title = 'ITR Update';
      break;
    case 'punch_list_item':
      icon = '✅';
      title = 'Punch List Item';
      break;
    case 'task_reminder':
      icon = '⏰';
      title = 'Task Reminder';
      break;
    case 'report_ready':
      icon = '📊';
      title = 'Report Ready';
      break;
    case 'approval_required':
      icon = '✋';
      title = 'Approval Required';
      break;
  }

  let content = `
    <div>
      <h3>${icon} ${title}</h3>
      <p><strong>Project:</strong> ${projectName}</p>
      <p>${message}</p>
  `;

  if (assignedTo) {
    content += `<p><strong>Assigned To:</strong> ${assignedTo}</p>`;
  }

  if (dueDate) {
    content += `<p><strong>Due Date:</strong> ${dueDate}</p>`;
  }

  if (actionUrl) {
    content += `<p><a href="${actionUrl}">View in thinkcompl.ai</a></p>`;
  }

  content += '</div>';

  return content;
}