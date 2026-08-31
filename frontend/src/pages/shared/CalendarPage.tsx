import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { useAuth } from '../../contexts/AuthContext';

export default function CalendarPage() {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const { events, addEvent, editEvent, deleteEvent, categories, addCategory, editCategory, deleteCategory } = useCalendarEvents();
  const { user } = useAuth();
  const canManageCats = ['ceo', 'manager', 'tl'].includes(user?.role || '');

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFilters, setShowFilters] = useState(true);
  const [showDetails, setShowDetails] = useState(true);

  // Functional category filter — only the checked event types are shown.
  const [activeTypes, setActiveTypes] = useState<string[]>(() => {
    try {
      const c = localStorage.getItem('calendar_categories');
      return (c ? JSON.parse(c) : [{ key: 'talent' }, { key: 'dev' }, { key: 'engagement' }]).map((x: any) => x.key);
    } catch { return ['talent', 'dev', 'engagement']; }
  });
  const toggleType = (t: string) => setActiveTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const visibleEvents = events.filter(e => activeTypes.includes(e.type));
  const catOf = (type: string) => categories.find(c => c.key === type) || { key: type, label: 'General', color: '#94a3b8' };

  // Add-category form
  const [showAddCat, setShowAddCat] = useState(false);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#6366f1');
  const handleAddCategory = () => {
    if (!catName.trim()) return;
    const created = addCategory(catName, catColor);
    setActiveTypes(prev => [...prev, created.key]);
    setCatName(''); setCatColor('#6366f1'); setShowAddCat(false);
  };

  // Edit / delete category
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#6366f1');
  const startEditCat = (c: { key: string; label: string; color: string }) => { setEditingKey(c.key); setEditName(c.label); setEditColor(c.color); setShowAddCat(false); };
  const saveEditCat = () => { if (editingKey && editName.trim()) { editCategory(editingKey, editName, editColor); setEditingKey(null); } };
  const removeCat = (c: { key: string; label: string }) => {
    const used = events.filter(e => e.type === c.key).length;
    if (window.confirm(`Delete category "${c.label}"?${used ? ` ${used} event(s) will show as “General”.` : ''}`)) {
      deleteCategory(c.key);
      setActiveTypes(prev => prev.filter(k => k !== c.key));
    }
  };

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00 AM', type: 'talent', location: '', note: ''
  });

  const handlePrevMonth = () => setCalendarDate(subMonths(calendarDate, 1));
  const handleNextMonth = () => setCalendarDate(addMonths(calendarDate, 1));

  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setNewEvent({ title: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00 AM', type: 'talent', location: '', note: '' });
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      editEvent(editingId, newEvent);
    } else {
      addEvent(newEvent);
    }
    handleCloseModal();
  };

  const handleEditEvent = (id: number) => {
    const ev = events.find(e => e.id === id);
    if (ev) {
      setNewEvent(ev as any);
      setEditingId(id);
      setIsModalOpen(true);
    }
  };

  const handleDeleteEvent = (id: number) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      deleteEvent(id);
    }
  };

  const selectedDateEvents = visibleEvents.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-4 sm:p-6 lg:p-8 font-sans text-gray-900">
      {/* Page Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-sm text-emerald-600 font-medium">Dashboard <span className="text-gray-400">/ Calendar</span></p>
      </header>

      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-2xl p-4 flex items-center justify-between shadow-sm border border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <span className="text-sm font-semibold text-emerald-800 leading-tight">Total All<br/>Schedules</span>
          </div>
          <span className="text-3xl font-bold text-emerald-900">{events.length}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <span className="text-sm font-semibold text-gray-700 leading-tight">Talent<br/>Acquisition</span>
          </div>
          <span className="text-3xl font-bold text-gray-900">{events.filter(e => e.type === 'talent').length}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <span className="text-sm font-semibold text-gray-700 leading-tight">Employee<br/>Development</span>
          </div>
          <span className="text-3xl font-bold text-gray-900">{events.filter(e => e.type === 'dev').length}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <span className="text-sm font-semibold text-gray-700 leading-tight">Workplace<br/>Engagement</span>
          </div>
          <span className="text-3xl font-bold text-gray-900">{events.filter(e => e.type === 'engagement').length}</span>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Left Sidebar */}
        <div className={`${showFilters ? 'block' : 'hidden'} w-full xl:w-64 flex-shrink-0 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-fit`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Filter</h3>
            <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-sm text-gray-800">Categories</h4>
              <button onClick={() => setActiveTypes(activeTypes.length === 3 ? [] : ['talent', 'dev', 'engagement'])} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                {activeTypes.length === 3 ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-3">
              {categories.map(cat => {
                const on = activeTypes.includes(cat.key);
                const count = events.filter(e => e.type === cat.key).length;
                if (editingKey === cat.key) {
                  return (
                    <div key={cat.key} className="flex items-center gap-2">
                      <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-8 h-8 shrink-0 rounded cursor-pointer border border-gray-200 bg-white p-0.5" />
                      <input value={editName} onChange={e => setEditName(e.target.value)} className="min-w-0 flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                      <button onClick={saveEditCat} className="p-1 text-emerald-600 hover:text-emerald-700" title="Save"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                      <button onClick={() => setEditingKey(null)} className="p-1 text-gray-400 hover:text-gray-600" title="Cancel">✕</button>
                    </div>
                  );
                }
                return (
                  <div key={cat.key} className="group flex items-center gap-2">
                    <label className="flex min-w-0 flex-1 items-center gap-3 cursor-pointer select-none">
                      <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 border" style={on ? { backgroundColor: cat.color, borderColor: cat.color } : { borderColor: '#d1d5db' }}>
                        {on && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={`text-sm font-medium flex-1 truncate ${on ? 'text-gray-700' : 'text-gray-400'}`}>{cat.label}</span>
                      <input type="checkbox" className="hidden" checked={on} onChange={() => toggleType(cat.key)} />
                    </label>
                    <span className="text-xs font-semibold text-gray-400">{count}</span>
                    {canManageCats && (
                      <div className="relative flex items-center">
                        <button onClick={() => setOpenMenuKey(openMenuKey === cat.key ? null : cat.key)} className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none" title="Options">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                        </button>
                        
                        {openMenuKey === cat.key && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuKey(null)}></div>
                            <div className="absolute right-0 top-full mt-1 w-28 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                              <button
                                onClick={() => { setOpenMenuKey(null); startEditCat(cat); }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => { setOpenMenuKey(null); removeCat(cat); }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                              >
                                <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {canManageCats && (showAddCat ? (
              <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                <div className="flex items-center gap-2">
                  <input type="color" value={catColor} onChange={e => setCatColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer border border-gray-200 bg-white p-0.5" title="Pick a colour" />
                  <button onClick={handleAddCategory} disabled={!catName.trim()} className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50">Add</button>
                  <button onClick={() => { setShowAddCat(false); setCatName(''); }} className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddCat(true)} className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add category
              </button>
            ))}

            <p className="mt-4 text-[11px] text-gray-400 leading-relaxed">Toggle a category to show or hide its events on the calendar.</p>
          </div>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 min-w-0 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
          {/* Calendar Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-2"><button onClick={handlePrevMonth} className="rounded-lg px-2 py-1 text-lg text-gray-500 hover:bg-gray-100">‹</button><h2 className="text-xl font-bold">{format(calendarDate, 'MMMM yyyy')}</h2><button onClick={handleNextMonth} className="rounded-lg px-2 py-1 text-lg text-gray-500 hover:bg-gray-100">›</button></div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setShowFilters(value => !value)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold ">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                Filter <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              <button onClick={() => setCalendarDate(new Date())} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold ">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Month <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              <button 
                onClick={() => {
                  setEditingId(null);
                  setNewEvent({ title: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00 AM', type: 'talent', location: '', note: '' });
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
              >
                + New Agenda
              </button>
            </div>
          </div>
          
          {/* Calendar Grid */}
          <div className="flex-1 border border-gray-100 rounded-xl overflow-x-auto flex flex-col">
            <div className="min-w-[700px] grid grid-cols-7 border-b border-gray-100 bg-white">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-3 text-center text-xs font-bold text-gray-700">{day}</div>
              ))}
            </div>
            
            <div className="min-w-[700px] flex-1 grid grid-cols-7 grid-rows-5 bg-gray-50 gap-[1px]">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, monthStart);
                const dayStr = format(day, 'yyyy-MM-dd');
                const isSelected = format(selectedDate, 'yyyy-MM-dd') === dayStr;
                const dayNum = format(day, 'd');
                
                const dayEvents = visibleEvents.filter(e => e.date === dayStr);

                return (
                  <div 
                    key={idx} 
                    onClick={() => { setSelectedDate(day); setShowDetails(true); }}
                    className={`bg-white p-2 min-h-[100px] flex flex-col gap-1 cursor-pointer hover:bg-gray-50 transition-colors ${!isCurrentMonth ? 'opacity-40' : ''}`}
                  >
                    <div className="text-right">
                      <span className={`text-sm font-medium flex items-center justify-end ${isSelected && isCurrentMonth ? 'text-emerald-500' : 'text-gray-500'}`}>
                        {isSelected && isCurrentMonth ? (
                          <div className="w-6 h-6 flex items-center justify-center rounded-md border border-emerald-500 text-emerald-500">{dayNum}</div>
                        ) : dayNum}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                      {dayEvents.map(ev => { const c = catOf(ev.type); return (
                        <div key={ev.id} className="p-1.5 rounded-md text-[10px] flex flex-col gap-0.5 border-l-2 text-gray-700" style={{ borderLeftColor: c.color, backgroundColor: `${c.color}1a` }}>
                           <span className="font-bold truncate leading-tight">{ev.title}</span>
                           <span className="opacity-80 flex justify-between items-center">
                             {ev.time}
                             <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.color }}></span>
                           </span>
                        </div>
                      ); })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Details */}
        <div className={`${showDetails ? 'block' : 'hidden'} w-full xl:w-80 flex-shrink-0 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-fit`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg">Details Schedule</h3>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">{format(selectedDate, 'dd MMMM yyyy')}</p>
            </div>
            <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          
          <div className="space-y-4">
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-gray-500 italic text-center py-4">No events scheduled for this day.</p>
            ) : (
              selectedDateEvents.map(ev => (
                <DetailCard
                  key={ev.id}
                  category={catOf(ev.type).label}
                  title={ev.title}
                  time={ev.time}
                  location={ev.location}
                  note={ev.note}
                  color={catOf(ev.type).color}
                  canEdit={ev.created_by === user?.id}
                  onEdit={() => handleEditEvent(ev.id)}
                  onDelete={() => handleDeleteEvent(ev.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">{editingId ? 'Edit Agenda' : 'Add New Agenda'}</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input required type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Event title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input required type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input required type="time" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                  {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input required type="text" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Room or link" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={3} value={newEvent.note} onChange={e => setNewEvent({...newEvent, note: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" placeholder="Any additional notes" />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="px-5 py-2 rounded-xl text-gray-600 font-semibold ">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700">
                  {editingId ? 'Save Changes' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCard({ category, title, time, location, note, color, onEdit, onDelete, canEdit }: any) {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div className="p-4 rounded-2xl flex flex-col gap-3 group relative" style={{ backgroundColor: `${color}1a` }}>
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold px-2 py-1 bg-white/60 rounded w-fit" style={{ color }}>{category}</span>
        {canEdit && <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-gray-500 hover:text-gray-700 rounded focus:outline-none" title="Options">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
              <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                <button
                  onClick={() => { setShowMenu(false); onEdit(); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => { setShowMenu(false); onDelete(); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>}
      </div>
      <h4 className="font-bold text-sm text-gray-900 leading-snug">{title}</h4>
      <div className="grid grid-cols-[60px_1fr] gap-x-2 gap-y-2 text-xs font-medium">
        <span className="text-gray-500">Time</span>
        <span className="text-gray-900 font-semibold">{time}</span>
        <span className="text-gray-500">Location</span>
        <span className="text-gray-900 font-semibold break-words">{location}</span>
        <span className="text-gray-500">Note</span>
        <span className="text-gray-900 font-semibold leading-relaxed break-words">{note}</span>
      </div>
    </div>
  );
}
