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

export interface CalendarCategory {
  key: string;
  label: string;
  color: string; // hex
}

const defaultCategories = (): CalendarCategory[] => [
  { key: 'talent', label: 'Talent Acquisition', color: '#2bb48c' },
  { key: 'dev', label: 'Employee Development', color: '#f5a623' },
  { key: 'engagement', label: 'Workplace Engagement', color: '#94a3b8' },
];

const defaultEvents = () => {
  return [];
};

export function useCalendarEvents() {
  const [events, setEventsState] = useState<CalendarEvent[]>([]);
  const [categories, setCategoriesState] = useState<CalendarCategory[]>(defaultCategories);

  useEffect(() => {
    const stored = localStorage.getItem('calendar_events');
    setEventsState(stored ? JSON.parse(stored) : defaultEvents());
    const storedCats = localStorage.getItem('calendar_categories');
    if (storedCats) setCategoriesState(JSON.parse(storedCats));
  }, []);

  const setEvents = (newEvents: CalendarEvent[]) => {
    setEventsState(newEvents);
    localStorage.setItem('calendar_events', JSON.stringify(newEvents));
  };

  const addCategory = (label: string, color: string): CalendarCategory => {
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
    const next = [...categories, { key, label: label.trim(), color }];
    setCategoriesState(next);
    localStorage.setItem('calendar_categories', JSON.stringify(next));
    return next[next.length - 1];
  };

  const editCategory = (key: string, label: string, color: string) => {
    const next = categories.map(c => c.key === key ? { ...c, label: label.trim(), color } : c);
    setCategoriesState(next);
    localStorage.setItem('calendar_categories', JSON.stringify(next));
  };

  const deleteCategory = (key: string) => {
    const next = categories.filter(c => c.key !== key);
    setCategoriesState(next);
    localStorage.setItem('calendar_categories', JSON.stringify(next));
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

  return { events, addEvent, editEvent, deleteEvent, categories, addCategory, editCategory, deleteCategory };
}
