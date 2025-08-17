import { NextRequest, NextResponse } from 'next/server';

// Outlook Calendar integration API
// Handles calendar events, meetings, and scheduling for thinkcompl.ai projects

interface CalendarEvent {
  subject: string;
  body: {
    contentType: 'HTML' | 'Text';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type: 'required' | 'optional';
  }>;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: 'teamsForBusiness' | 'skypeForBusiness';
  categories?: string[];
  importance?: 'low' | 'normal' | 'high';
  isReminderOn?: boolean;
  reminderMinutesBeforeStart?: number;
  recurrence?: {
    pattern: {
      type: 'daily' | 'weekly' | 'monthly';
      interval: number;
      daysOfWeek?: string[];
    };
    range: {
      type: 'noEnd' | 'endDate' | 'numbered';
      startDate: string;
      endDate?: string;
      numberOfOccurrences?: number;
    };
  };
}

interface ProjectSchedule {
  projectName: string;
  projectId: string;
  milestones: Array<{
    name: string;
    date: string;
    type: 'inspection' | 'test' | 'report' | 'delivery' | 'meeting';
    description?: string;
    assignedTo?: string[];
  }>;
  recurringMeetings?: Array<{
    name: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: string;
    time: string;
    duration: number; // in minutes
    attendees: string[];
  }>;
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

// Get calendar events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'getEvents':
        return await getCalendarEvents(request);
      case 'getEvent':
        const eventId = searchParams.get('eventId');
        if (!eventId) {
          return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
        }
        return await getCalendarEvent(request, eventId);
      case 'getFreeBusy':
        return await getFreeBusyInfo(request);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in Calendar GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}

// Create calendar events and meetings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'createEvent':
        return await createCalendarEvent(request, body.event);
      case 'createProjectSchedule':
        return await createProjectSchedule(request, body.schedule);
      case 'scheduleInspection':
        return await scheduleInspection(request, body);
      case 'scheduleMeeting':
        return await scheduleMeeting(request, body);
      case 'createRecurringMeeting':
        return await createRecurringMeeting(request, body);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in Calendar POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}

// Update calendar events
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, updates } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const data = await makeGraphRequest(
      `/me/events/${eventId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates)
      },
      request
    );

    return NextResponse.json({ success: true, event: data });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}

// Delete calendar events
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    await makeGraphRequest(
      `/me/events/${eventId}`,
      { method: 'DELETE' },
      request
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}

// Get calendar events for a date range
async function getCalendarEvents(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startTime = searchParams.get('startTime') || new Date().toISOString();
  const endTime = searchParams.get('endTime') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const data = await makeGraphRequest(
    `/me/calendar/events?$filter=start/dateTime ge '${startTime}' and end/dateTime le '${endTime}'&$orderby=start/dateTime`,
    {},
    request
  );

  return NextResponse.json({ events: data.value });
}

// Get a specific calendar event
async function getCalendarEvent(request: NextRequest, eventId: string) {
  const data = await makeGraphRequest(`/me/events/${eventId}`, {}, request);
  return NextResponse.json({ event: data });
}

// Get free/busy information
async function getFreeBusyInfo(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const emails = searchParams.get('emails')?.split(',') || [];
  const startTime = searchParams.get('startTime') || new Date().toISOString();
  const endTime = searchParams.get('endTime') || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  if (emails.length === 0) {
    return NextResponse.json({ error: 'At least one email is required' }, { status: 400 });
  }

  const requestBody = {
    schedules: emails,
    startTime: {
      dateTime: startTime,
      timeZone: 'UTC'
    },
    endTime: {
      dateTime: endTime,
      timeZone: 'UTC'
    },
    availabilityViewInterval: 60 // 60-minute intervals
  };

  const data = await makeGraphRequest(
    '/me/calendar/getSchedule',
    {
      method: 'POST',
      body: JSON.stringify(requestBody)
    },
    request
  );

  return NextResponse.json({ freeBusy: data.value });
}

// Create a calendar event
async function createCalendarEvent(request: NextRequest, event: CalendarEvent) {
  const data = await makeGraphRequest(
    '/me/events',
    {
      method: 'POST',
      body: JSON.stringify(event)
    },
    request
  );

  return NextResponse.json({ success: true, event: data });
}

// Create a complete project schedule
async function createProjectSchedule(request: NextRequest, schedule: ProjectSchedule) {
  const createdEvents = [];

  // Create milestone events
  for (const milestone of schedule.milestones) {
    const event: CalendarEvent = {
      subject: `${schedule.projectName} - ${milestone.name}`,
      body: {
        contentType: 'HTML',
        content: `
          <div>
            <h3>Project Milestone: ${milestone.name}</h3>
            <p><strong>Project:</strong> ${schedule.projectName}</p>
            <p><strong>Type:</strong> ${milestone.type}</p>
            ${milestone.description ? `<p><strong>Description:</strong> ${milestone.description}</p>` : ''}
            <p><em>This event was automatically created by thinkcompl.ai</em></p>
          </div>
        `
      },
      start: {
        dateTime: milestone.date,
        timeZone: 'UTC'
      },
      end: {
        dateTime: new Date(new Date(milestone.date).getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours duration
        timeZone: 'UTC'
      },
      categories: ['thinkcompl.ai Project', milestone.type],
      importance: milestone.type === 'inspection' || milestone.type === 'test' ? 'high' : 'normal',
      isReminderOn: true,
      reminderMinutesBeforeStart: milestone.type === 'inspection' ? 1440 : 60 // 24 hours for inspections, 1 hour for others
    };

    if (milestone.assignedTo && milestone.assignedTo.length > 0) {
      event.attendees = milestone.assignedTo.map(email => ({
        emailAddress: { address: email },
        type: 'required' as const
      }));
    }

    try {
      const data = await makeGraphRequest(
        '/me/events',
        {
          method: 'POST',
          body: JSON.stringify(event)
        },
        request
      );
      createdEvents.push(data);
    } catch (error) {
      console.error(`Failed to create milestone event for ${milestone.name}:`, error);
    }
  }

  // Create recurring meetings
  if (schedule.recurringMeetings) {
    for (const meeting of schedule.recurringMeetings) {
      try {
        const recurringEvent = await createRecurringMeeting(request, {
          ...meeting,
          projectName: schedule.projectName,
          projectId: schedule.projectId
        });
        createdEvents.push(recurringEvent);
      } catch (error) {
        console.error(`Failed to create recurring meeting ${meeting.name}:`, error);
      }
    }
  }

  return NextResponse.json({ 
    success: true, 
    message: `Created ${createdEvents.length} calendar events for project ${schedule.projectName}`,
    events: createdEvents 
  });
}

// Schedule an inspection
async function scheduleInspection(request: NextRequest, body: {
  title: string;
  date: string;
  inspector: string;
  location: string;
  equipment: string[];
  projectName: string;
  duration?: number;
}) {
  const { title, date, inspector, location, equipment, projectName, duration = 120 } = body;

  const event: CalendarEvent = {
    subject: `Inspection: ${title}`,
    body: {
      contentType: 'HTML',
      content: `
        <div>
          <h3>Equipment Inspection</h3>
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Inspector:</strong> ${inspector}</p>
          <p><strong>Equipment to Inspect:</strong></p>
          <ul>
            ${equipment.map(item => `<li>${item}</li>`).join('')}
          </ul>
          <p><em>Please bring necessary inspection tools and ensure equipment is accessible.</em></p>
        </div>
      `
    },
    start: {
      dateTime: date,
      timeZone: 'UTC'
    },
    end: {
      dateTime: new Date(new Date(date).getTime() + duration * 60 * 1000).toISOString(),
      timeZone: 'UTC'
    },
    location: {
      displayName: location
    },
    attendees: [{
      emailAddress: { address: inspector },
      type: 'required'
    }],
          categories: ['thinkcompl.ai Inspection', 'Project Work'],
    importance: 'high',
    isReminderOn: true,
    reminderMinutesBeforeStart: 1440 // 24 hours before
  };

  const data = await createCalendarEvent(request, event);
  return data;
}

// Schedule a meeting
async function scheduleMeeting(request: NextRequest, body: {
  subject: string;
  date: string;
  duration: number;
  attendees: string[];
  agenda?: string;
  location?: string;
  isOnline?: boolean;
}) {
  const { subject, date, duration, attendees, agenda, location, isOnline = true } = body;

  const event: CalendarEvent = {
    subject,
    body: {
      contentType: 'HTML',
      content: agenda || 'thinkcompl.ai Project Meeting'
    },
    start: {
      dateTime: date,
      timeZone: 'UTC'
    },
    end: {
      dateTime: new Date(new Date(date).getTime() + duration * 60 * 1000).toISOString(),
      timeZone: 'UTC'
    },
    attendees: attendees.map(email => ({
      emailAddress: { address: email },
      type: 'required' as const
    })),
    isOnlineMeeting: isOnline,
    onlineMeetingProvider: isOnline ? 'teamsForBusiness' : undefined,
    categories: ['thinkcompl.ai Meeting'],
    isReminderOn: true,
    reminderMinutesBeforeStart: 15
  };

  if (location && !isOnline) {
    event.location = { displayName: location };
  }

  const data = await createCalendarEvent(request, event);
  return data;
}

// Create a recurring meeting
async function createRecurringMeeting(request: NextRequest, body: {
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: string;
  time: string;
  duration: number;
  attendees: string[];
  projectName?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { name, frequency, dayOfWeek, time, duration, attendees, projectName, startDate, endDate } = body;

  // Calculate start and end times
  const start = startDate ? new Date(startDate) : new Date();
  const [hours, minutes] = time.split(':').map(Number);
  start.setHours(hours, minutes, 0, 0);

  const end = new Date(start.getTime() + duration * 60 * 1000);

  const event: CalendarEvent = {
    subject: projectName ? `${projectName} - ${name}` : name,
    body: {
      contentType: 'HTML',
      content: `
        <div>
          <h3>Recurring Project Meeting</h3>
          ${projectName ? `<p><strong>Project:</strong> ${projectName}</p>` : ''}
          <p><strong>Meeting:</strong> ${name}</p>
          <p><em>This is a recurring meeting scheduled through thinkcompl.ai</em></p>
        </div>
      `
    },
    start: {
      dateTime: start.toISOString(),
      timeZone: 'UTC'
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: 'UTC'
    },
    attendees: attendees.map(email => ({
      emailAddress: { address: email },
      type: 'required' as const
    })),
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness',
    categories: ['thinkcompl.ai Recurring Meeting'],
    isReminderOn: true,
    reminderMinutesBeforeStart: 15,
    recurrence: {
      pattern: {
        type: frequency,
        interval: 1,
        ...(frequency === 'weekly' && dayOfWeek ? { daysOfWeek: [dayOfWeek] } : {})
      },
      range: {
        type: endDate ? 'endDate' : 'noEnd',
        startDate: start.toISOString().split('T')[0],
        ...(endDate ? { endDate } : {})
      }
    }
  };

  const data = await createCalendarEvent(request, event);
  return NextResponse.json({ success: true, recurringMeeting: data });
}