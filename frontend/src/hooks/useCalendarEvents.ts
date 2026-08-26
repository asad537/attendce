import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export interface CalendarEvent {
  id: number;
  date: string;
  type: string;
  title: string;
  time: string;
  location: string;
  note: string;
}

const defaultEvents = () => {
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  return [
    { id: 1, date: `${currentMonthStr}-04`, type: 'talent', title: 'Interview – Product Design...', time: '09:00 AM', location: 'Meeting Room C', note: 'Bring portfolio' },
    { id: 2, date: `${currentMonthStr}-04`, type: 'engagement', title: 'Quarterly Policy Review...', time: '03:00 PM', location: 'Conference Room 1A', note: 'All staff required' },
    { id: 3, date: `${currentMonthStr}-06`, type: 'dev', title: 'Team Communication Workshop', time: '02:00 PM', location: 'Zoom', note: 'Link in email' },
    { id: 4, date: `${currentMonthStr}-07`, type: 'talent', title: 'Onboarding Session - New...', time: '10:00 AM', location: 'HR Room 2B', note: 'Prepare welcome kits' },
    { id: 5, date: `${currentMonthStr}-21`, type: 'talent', title: 'New Recruit Introduction', time: '09:00 AM', location: 'HR Room 2B', note: 'Prepare welcome kits and ID cards' },
    { id: 6, date: `${currentMonthStr}-21`, type: 'dev', title: 'Personal Growth Session...', time: '02:00 PM', location: 'Zoom', note: 'Attendees must complete pre-survey' },
  ];
};

export function useCalendarEvents() {
  const [events, setEventsState] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('calendar_events');
    if (stored) {
      setEventsState(JSON.parse(stored));
    } else {
      setEventsState(defaultEvents());
    }
  }, []);

  const setEvents = (newEvents: CalendarEvent[]) => {
    setEventsState(newEvents);
    localStorage.setItem('calendar_events', JSON.stringify(newEvents));
  };

  const addEvent = (event: Omit<CalendarEvent, 'id'>) => {
    setEvents([...events, { ...event, id: Date.now() }]);
  };

  const editEvent = (id: number, updatedEvent: Omit<CalendarEvent, 'id'>) => {
    setEvents(events.map(ev => ev.id === id ? { ...updatedEvent, id } : ev));
  };

  const deleteEvent = (id: number) => {
    setEvents(events.filter(ev => ev.id !== id));
  };

  return { events, addEvent, editEvent, deleteEvent };
}
