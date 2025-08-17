'use client';

import React, { useState, useEffect } from 'react';
import { HiCalendarDays, HiClock, HiUsers, HiMapPin, HiPlus, HiArrowPath, HiCheck, HiXMark } from 'react-icons/hi2';
import { calendarClient, CalendarEvent, ProjectSchedule } from '@/lib/outlook-calendar';
import Button from './Button';

interface OutlookCalendarWidgetProps {
  projectName?: string;
  projectId?: string;
  className?: string;
  isPreviewMode?: boolean;
}

export default function OutlookCalendarWidget({ projectName, projectId, className = '', isPreviewMode = false }: OutlookCalendarWidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'schedule' | 'meetings'>('events');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Meeting form state
  const [meetingForm, setMeetingForm] = useState({
    subject: '',
    date: '',
    time: '10:00',
    duration: 60,
    attendees: '',
    location: '',
    agenda: '',
    isOnline: true
  });

  // Inspection form state
  const [inspectionForm, setInspectionForm] = useState({
    title: '',
    date: '',
    time: '09:00',
    inspector: '',
    location: '',
    equipment: '',
    duration: 120
  });

  // Mock data for preview mode
  const mockEvents: CalendarEvent[] = [
    {
      id: 'mock-event-1',
      subject: 'Project Kickoff Meeting',
      start: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
      end: new Date(Date.now() + 1000 * 60 * 60 * 3), // 3 hours from now
      location: 'Conference Room A',
      isOnlineMeeting: true,
      attendees: ['john.doe@company.com', 'jane.smith@company.com'],
      category: 'thinkcompl.ai Project',
      description: 'Initial project planning and team introductions'
    },
    {
      id: 'mock-event-2',
      subject: 'ITR Review Session',
      start: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
      end: new Date(Date.now() + 1000 * 60 * 60 * 24 + 1000 * 60 * 90), // Tomorrow + 1.5 hours
      location: 'Site Office',
      isOnlineMeeting: false,
      attendees: ['inspector@thinkcompl.ai', 'qa.manager@company.com'],
      category: 'thinkcompl.ai Inspection',
      description: 'Review of Inspection Test Reports for Phase 1'
    },
    {
      id: 'mock-event-3',
      subject: 'Equipment Calibration',
      start: new Date(Date.now() + 1000 * 60 * 60 * 48), // Day after tomorrow
      end: new Date(Date.now() + 1000 * 60 * 60 * 48 + 1000 * 60 * 60 * 4), // + 4 hours
      location: 'Equipment Room',
      isOnlineMeeting: false,
      attendees: ['tech.lead@company.com'],
      category: 'thinkcompl.ai Maintenance',
      description: 'Monthly equipment calibration and verification'
    }
  ];

  useEffect(() => {
    if (isPreviewMode) {
      // Use mock data in preview mode
      setEvents(mockEvents);
    } else {
      loadEvents();
    }
  }, [selectedDate, isPreviewMode]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const calendarEvents = await calendarClient.getEvents(
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );
      
      setEvents(calendarEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleMeeting = async () => {
    if (!meetingForm.subject || !meetingForm.date || !meetingForm.time) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [hours, minutes] = meetingForm.time.split(':').map(Number);
      const meetingDate = new Date(meetingForm.date);
      meetingDate.setHours(hours, minutes, 0, 0);

      const attendeesList = meetingForm.attendees
        .split(',')
        .map(email => email.trim())
        .filter(email => email.includes('@'));

      await calendarClient.scheduleMeeting({
        subject: meetingForm.subject,
        date: meetingDate.toISOString(),
        duration: meetingForm.duration,
        attendees: attendeesList,
        agenda: meetingForm.agenda || undefined,
        location: meetingForm.location || undefined,
        isOnline: meetingForm.isOnline
      });

      // Reset form
      setMeetingForm({
        subject: '',
        date: '',
        time: '10:00',
        duration: 60,
        attendees: '',
        location: '',
        agenda: '',
        isOnline: true
      });

      alert('Meeting scheduled successfully!');
      loadEvents(); // Refresh events
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule meeting');
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleInspection = async () => {
    if (!inspectionForm.title || !inspectionForm.date || !inspectionForm.inspector) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [hours, minutes] = inspectionForm.time.split(':').map(Number);
      const inspectionDate = new Date(inspectionForm.date);
      inspectionDate.setHours(hours, minutes, 0, 0);

      const equipmentList = inspectionForm.equipment
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      await calendarClient.scheduleInspection({
        title: inspectionForm.title,
        date: inspectionDate.toISOString(),
        inspector: inspectionForm.inspector,
        location: inspectionForm.location || 'TBD',
        equipment: equipmentList,
        projectName: projectName || 'thinkcompl.ai Project',
        duration: inspectionForm.duration
      });

      // Reset form
      setInspectionForm({
        title: '',
        date: '',
        time: '09:00',
        inspector: '',
        location: '',
        equipment: '',
        duration: 120
      });

      alert('Inspection scheduled successfully!');
      loadEvents(); // Refresh events
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule inspection');
    } finally {
      setIsLoading(false);
    }
  };

  const createProjectSchedule = async () => {
    if (!projectName || !projectId) {
      setError('Project information is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const schedule: ProjectSchedule = {
        projectName,
        projectId,
        milestones: [
          {
            name: 'Project Kickoff',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
            type: 'meeting',
            description: 'Initial project meeting with all stakeholders'
          },
          {
            name: 'Design Review',
            date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
            type: 'meeting',
            description: 'Review project designs and specifications'
          },
          {
            name: 'Equipment Inspection',
            date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks from now
            type: 'inspection',
            description: 'Initial equipment inspection and testing'
          },
          {
            name: 'Progress Report',
            date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 4 weeks from now
            type: 'report',
            description: 'Monthly progress report compilation'
          }
        ],
        recurringMeetings: [
          {
            name: 'Weekly Progress Meeting',
            frequency: 'weekly',
            dayOfWeek: 'monday',
            time: '10:00',
            duration: 60,
            attendees: [] // Would be populated with actual team members
          }
        ]
      };

      const result = await calendarClient.createProjectSchedule(schedule);
      alert(`Project schedule created! ${result.events.length} events were added to your calendar.`);
      loadEvents(); // Refresh events
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const formatEventTime = (event: CalendarEvent) => {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getEventIcon = (subject: string) => {
    const lower = subject.toLowerCase();
    if (lower.includes('inspection')) return '🔍';
    if (lower.includes('meeting')) return '🤝';
    if (lower.includes('test')) return '⚡';
    if (lower.includes('review')) return '📋';
    if (lower.includes('report')) return '📊';
    return '📅';
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
        <div className="flex items-center gap-3">
          <HiCalendarDays className="w-6 h-6" />
          <div>
            <h3 className="text-lg font-semibold">Outlook Calendar</h3>
            <p className="text-blue-100 text-sm">Schedule meetings and inspections</p>
          </div>
          <button
            onClick={loadEvents}
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
            { id: 'events', label: 'Events', icon: HiCalendarDays },
            { id: 'meetings', label: 'Schedule', icon: HiPlus },
            { id: 'schedule', label: 'Project Plan', icon: HiClock }
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

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">
                Events for {new Date(selectedDate).toLocaleDateString()}
              </h4>
              
              {isLoading ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading events...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-6">
                  <HiCalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No events scheduled for this date</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{getEventIcon(event.subject)}</span>
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{event.subject}</h5>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <HiClock className="w-4 h-4" />
                              {formatEventTime(event)}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <HiMapPin className="w-4 h-4" />
                                {event.location.displayName}
                              </div>
                            )}
                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center gap-1">
                                <HiUsers className="w-4 h-4" />
                                {event.attendees.length} attendees
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'meetings' && (
          <div className="space-y-6">
            {/* Meeting Form */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Schedule Meeting</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    value={meetingForm.subject}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Meeting subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    value={meetingForm.time}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <select
                    value={meetingForm.duration}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, duration: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attendees (emails)</label>
                  <input
                    type="text"
                    value={meetingForm.attendees}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, attendees: e.target.value }))}
                    placeholder="email1@company.com, email2@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={meetingForm.isOnline}
                        onChange={(e) => setMeetingForm(prev => ({ ...prev, isOnline: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Online meeting (Teams)</span>
                    </label>
                  </div>
                </div>

                {!meetingForm.isOnline && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={meetingForm.location}
                      onChange={(e) => setMeetingForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Meeting location"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agenda</label>
                  <textarea
                    value={meetingForm.agenda}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, agenda: e.target.value }))}
                    placeholder="Meeting agenda..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <Button
                onClick={scheduleMeeting}
                disabled={isLoading}
                className="w-full"
              >
                <HiCalendarDays className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>

            {/* Inspection Form */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h4 className="text-lg font-medium text-gray-900">Schedule Inspection</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Title *</label>
                  <input
                    type="text"
                    value={inspectionForm.title}
                    onChange={(e) => setInspectionForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Equipment inspection"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={inspectionForm.date}
                    onChange={(e) => setInspectionForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    value={inspectionForm.time}
                    onChange={(e) => setInspectionForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inspector Email *</label>
                  <input
                    type="email"
                    value={inspectionForm.inspector}
                    onChange={(e) => setInspectionForm(prev => ({ ...prev, inspector: e.target.value }))}
                    placeholder="inspector@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={inspectionForm.location}
                    onChange={(e) => setInspectionForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Inspection location"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipment (comma-separated)</label>
                  <input
                    type="text"
                    value={inspectionForm.equipment}
                    onChange={(e) => setInspectionForm(prev => ({ ...prev, equipment: e.target.value }))}
                    placeholder="Pump 001, Valve 002, Tank 003"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <Button
                onClick={scheduleInspection}
                disabled={isLoading}
                className="w-full"
                variant="secondary"
              >
                <HiClock className="w-4 h-4 mr-2" />
                Schedule Inspection
              </Button>
            </div>
          </div>
        )}

        {/* Project Plan Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="text-lg font-medium text-gray-900 mb-2">Create Project Schedule</h4>
              <p className="text-gray-600 mb-6">
                Generate a complete project schedule with milestones and recurring meetings
              </p>
              
              {projectName && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <p className="text-blue-800">
                    <strong>Project:</strong> {projectName}
                  </p>
                </div>
              )}

              <Button
                onClick={createProjectSchedule}
                disabled={isLoading || !projectName}
                className="w-full"
              >
                <HiCalendarDays className="w-4 h-4 mr-2" />
                Create Complete Project Schedule
              </Button>

              {!projectName && (
                <p className="text-sm text-gray-500 mt-2">
                  Project information is required to create a schedule
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Quick Schedule Actions</h5>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => {
                    setActiveTab('meetings');
                    setMeetingForm(prev => ({
                      ...prev,
                      subject: `${projectName || 'Project'} Kickoff Meeting`,
                      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      duration: 90,
                      agenda: 'Project overview, team introductions, timeline review, Q&A'
                    }));
                  }}
                  className="p-3 text-left bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                >
                  <div className="font-medium">🚀 Project Kickoff</div>
                  <div className="text-sm opacity-80">Schedule initial project meeting</div>
                </button>
                
                <button
                  onClick={() => {
                    setActiveTab('meetings');
                    setInspectionForm(prev => ({
                      ...prev,
                      title: 'Initial Equipment Inspection',
                      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      equipment: 'All project equipment',
                      duration: 180
                    }));
                  }}
                  className="p-3 text-left bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
                >
                  <div className="font-medium">🔍 Equipment Inspection</div>
                  <div className="text-sm opacity-80">Schedule equipment inspection</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}