import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { holidayService } from '../../services/reportService';
import { Holiday } from '../../types';

export default function UpcomingHolidaysWidget() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    holidayService.getUpcoming()
      .then(setHolidays)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-bold text-gray-900">Upcoming Holidays</h2>
        <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M19 3v4M5 10h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      {loading ? (
        <div className="flex justify-center p-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
        </div>
      ) : holidays.length === 0 ? (
        <p className="text-sm text-gray-500">No upcoming holidays scheduled.</p>
      ) : (
        <div className="space-y-3">
          {holidays.slice(0, showAll ? holidays.length : 2).map(h => {
            const date = parseISO(h.date);
            const endDate = h.end_date ? parseISO(h.end_date) : null;
            return (
              <div key={h.id} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <span className="text-[10px] font-bold uppercase leading-none">{format(date, 'MMM')}</span>
                  <span className="text-sm font-black leading-none mt-0.5">{format(date, 'd')}</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{h.name}</h4>
                  <p className="text-xs text-gray-500">
                    {endDate ? `${format(date, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}` : format(date, 'MMMM d, yyyy')}
                    {h.type && ` • ${h.type.charAt(0).toUpperCase() + h.type.slice(1)}`}
                  </p>
                </div>
              </div>
            );
          })}
          {holidays.length > 2 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full pt-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              {showAll ? 'Show less' : `See all (${holidays.length})`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
