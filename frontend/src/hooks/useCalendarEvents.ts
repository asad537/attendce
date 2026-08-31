import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../services/api';

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
    api.get('/calendar-events').then(response => setEventsState(response.data.events || [])).catch(() => setEventsState(defaultEvents()));
    const storedCats = localStorage.getItem('calendar_categories');
    if (storedCats) setCategoriesState(JSON.parse(storedCats));
  }, []);

  const setEvents = (newEvents: CalendarEvent[]) => setEventsState(newEvents);

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

  const addEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    const response = await api.post('/calendar-events', event);
    setEvents([...events, response.data.event]);
  };

  const editEvent = async (id: number, updatedEvent: Omit<CalendarEvent, 'id'>) => {
    const response = await api.put(`/calendar-events/${id}`, updatedEvent);
    setEvents(events.map(ev => ev.id === id ? response.data.event : ev));
  };

  const deleteEvent = async (id: number) => {
    await api.delete(`/calendar-events/${id}`);
    setEvents(events.filter(ev => ev.id !== id));
  };

  return { events, addEvent, editEvent, deleteEvent, categories, addCategory, editCategory, deleteCategory };
}
