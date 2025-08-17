// Outlook Calendar Client Library for thinkcompl.ai
// Provides easy-to-use functions for calendar integration and project scheduling

export interface CalendarEvent {
  id?: string;
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
  onlineMeetingProvider?: 'teamsForBusiness';
  categories?: string[];
  importance?: 'low' | 'normal' | 'high';
  isReminderOn?: boolean;
  reminderMinutesBeforeStart?: number;
}

export interface ProjectSchedule {
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
    duration: number;
    attendees: string[];
  }>;
}

export interface FreeBusyInfo {
  scheduleId: string;
  freeBusyViewType: string;
  freeBusyTimeSlots: Array<{
    start: string;
    end: string;
    status: 'free' | 'busy' | 'tentative' | 'outOfOffice' | 'workingElsewhere';
  }>;
}

class OutlookCalendarClient {
  private baseUrl = '/api/outlook-calendar';

  // Get calendar events for a date range
  async getEvents(startTime?: string, endTime?: string): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      action: 'getEvents',
      ...(startTime && { startTime }),
      ...(endTime && { endTime })
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch calendar events');
    }
    const data = await response.json();
    return data.events;
  }

  // Get a specific calendar event
  async getEvent(eventId: string): Promise<CalendarEvent> {
    const response = await fetch(`${this.baseUrl}?action=getEvent&eventId=${eventId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch calendar event');
    }
    const data = await response.json();
    return data.event;
  }

  // Get free/busy information for multiple people
  async getFreeBusy(emails: string[], startTime: string, endTime: string): Promise<FreeBusyInfo[]> {
    const params = new URLSearchParams({
      action: 'getFreeBusy',
      emails: emails.join(','),
      startTime,
      endTime
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch free/busy information');
    }
    const data = await response.json();
    return data.freeBusy;
  }

  // Create a calendar event
  async createEvent(event: CalendarEvent): Promise<CalendarEvent> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'createEvent',
        event
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create calendar event');
    }

    const data = await response.json();
    return data.event;
  }

  // Create a complete project schedule
  async createProjectSchedule(schedule: ProjectSchedule): Promise<{ events: CalendarEvent[]; message: string }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'createProjectSchedule',
        schedule
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create project schedule');
    }

    return await response.json();
  }

  // Schedule an inspection
  async scheduleInspection(inspection: {
    title: string;
    date: string;
    inspector: string;
    location: string;
    equipment: string[];
    projectName: string;
    duration?: number;
  }): Promise<CalendarEvent> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'scheduleInspection',
        ...inspection
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to schedule inspection');
    }

    const data = await response.json();
    return data.event;
  }

  // Schedule a meeting
  async scheduleMeeting(meeting: {
    subject: string;
    date: string;
    duration: number;
    attendees: string[];
    agenda?: string;
    location?: string;
    isOnline?: boolean;
  }): Promise<CalendarEvent> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'scheduleMeeting',
        ...meeting
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to schedule meeting');
    }

    const data = await response.json();
    return data.event;
  }

  // Create a recurring meeting
  async createRecurringMeeting(meeting: {
    name: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: string;
    time: string;
    duration: number;
    attendees: string[];
    projectName?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<CalendarEvent> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'createRecurringMeeting',
        ...meeting
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create recurring meeting');
    }

    const data = await response.json();
    return data.recurringMeeting;
  }

  // Update a calendar event
  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const response = await fetch(this.baseUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        updates
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update calendar event');
    }

    const data = await response.json();
    return data.event;
  }

  // Delete a calendar event
  async deleteEvent(eventId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}?eventId=${eventId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete calendar event');
    }
  }

  // Helper methods for common thinkcompl.ai use cases

  // Schedule a project kickoff meeting
  async scheduleProjectKickoff(projectName: string, date: string, attendees: string[], agenda?: string): Promise<CalendarEvent> {
    return this.scheduleMeeting({
      subject: `Project Kickoff - ${projectName}`,
      date,
      duration: 90, // 1.5 hours
      attendees,
      agenda: agenda || `
        <div>
          <h3>Project Kickoff Meeting - ${projectName}</h3>
          <h4>Agenda:</h4>
          <ul>
            <li>Project overview and objectives</li>
            <li>Team introductions and roles</li>
            <li>Project timeline and milestones</li>
            <li>ITR and testing requirements</li>
            <li>Communication and reporting procedures</li>
            <li>Q&A and next steps</li>
          </ul>
        </div>
      `,
      isOnline: true
    });
  }

  // Schedule weekly progress meetings
  async scheduleWeeklyProgressMeetings(projectName: string, attendees: string[], startDate: string, endDate: string, dayOfWeek: string = 'monday', time: string = '10:00'): Promise<CalendarEvent> {
    return this.createRecurringMeeting({
      name: 'Weekly Progress Meeting',
      frequency: 'weekly',
      dayOfWeek,
      time,
      duration: 60,
      attendees,
      projectName,
      startDate,
      endDate
    });
  }

  // Schedule ITR review sessions
  async scheduleITRReview(projectName: string, itrName: string, reviewer: string, date: string, duration: number = 60): Promise<CalendarEvent> {
    return this.createEvent({
      subject: `ITR Review - ${itrName}`,
      body: {
        contentType: 'HTML',
        content: `
          <div>
            <h3>ITR Review Session</h3>
            <p><strong>Project:</strong> ${projectName}</p>
            <p><strong>ITR:</strong> ${itrName}</p>
            <p><strong>Reviewer:</strong> ${reviewer}</p>
            <p><em>Please review the ITR document before this meeting and prepare any questions or feedback.</em></p>
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
      attendees: [{
        emailAddress: { address: reviewer },
        type: 'required'
      }],
      categories: ['thinkcompl.ai ITR Review'],
      importance: 'normal',
      isReminderOn: true,
      reminderMinutesBeforeStart: 60,
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness'
    });
  }

  // Schedule equipment testing
  async scheduleEquipmentTesting(projectName: string, equipmentList: string[], tester: string, location: string, date: string, duration: number = 120): Promise<CalendarEvent> {
    return this.createEvent({
      subject: `Equipment Testing - ${projectName}`,
      body: {
        contentType: 'HTML',
        content: `
          <div>
            <h3>Equipment Testing Session</h3>
            <p><strong>Project:</strong> ${projectName}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>Tester:</strong> ${tester}</p>
            <p><strong>Equipment to Test:</strong></p>
            <ul>
              ${equipmentList.map(item => `<li>${item}</li>`).join('')}
            </ul>
            <p><em>Please ensure all testing equipment is available and functional.</em></p>
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
        emailAddress: { address: tester },
        type: 'required'
      }],
      categories: ['thinkcompl.ai Testing', 'Equipment'],
      importance: 'high',
      isReminderOn: true,
      reminderMinutesBeforeStart: 1440 // 24 hours
    });
  }

  // Find available meeting times
  async findAvailableTimes(attendees: string[], duration: number, preferredDate: string): Promise<Array<{ start: string; end: string }>> {
    // Get free/busy for the preferred date
    const startOfDay = new Date(preferredDate);
    startOfDay.setHours(8, 0, 0, 0); // 8 AM
    
    const endOfDay = new Date(preferredDate);
    endOfDay.setHours(18, 0, 0, 0); // 6 PM

    const freeBusy = await this.getFreeBusy(
      attendees,
      startOfDay.toISOString(),
      endOfDay.toISOString()
    );

    // Simple algorithm to find free slots
    const availableSlots: Array<{ start: string; end: string }> = [];
    const workingHours = {
      start: 8, // 8 AM
      end: 18   // 6 PM
    };

    // This is a simplified implementation - in production you'd want more sophisticated scheduling logic
    for (let hour = workingHours.start; hour < workingHours.end - (duration / 60); hour++) {
      const slotStart = new Date(preferredDate);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

      // Check if all attendees are free during this slot
      const isSlotFree = freeBusy.every(person => {
        return person.freeBusyTimeSlots.every(slot => {
          const slotStartTime = new Date(slot.start);
          const slotEndTime = new Date(slot.end);
          
          // Check if the proposed meeting time overlaps with any busy time
          return !(slotStartTime < slotEnd && slotEndTime > slotStart) || slot.status === 'free';
        });
      });

      if (isSlotFree) {
        availableSlots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString()
        });
      }
    }

    return availableSlots;
  }
}

export const calendarClient = new OutlookCalendarClient();