import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types';
import toast from 'react-hot-toast';

const Star = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

export default function RateEmployeesPage() {
  const { user: authUser } = useAuth();
  
  const [ratings, setRatings] = useState({
    compensation_benefits: 0,
    work_culture: 0,
    work_life_balance: 0,
    career_growth: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = (category: keyof typeof ratings, val: number) => {
    setRatings(prev => ({ ...prev, [category]: val }));
  };

  const handleSubmit = async () => {
    if (Object.values(ratings).some(r => r === 0)) {
      toast.error('Please provide a rating for all categories.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/satisfaction-ratings', ratings);
      toast.success('Rating submitted successfully!');
      setRatings({ compensation_benefits: 0, work_culture: 0, work_life_balance: 0, career_growth: 0 });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarInput = ({ category, label }: { category: keyof typeof ratings, label: string }) => {
    return (
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between">
        <label className="text-sm font-semibold text-gray-700 mb-2 sm:mb-0">{label}</label>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map(val => (
            <button
              key={val}
              type="button"
              onClick={() => handleRatingChange(category, val)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none"
            >
              <Star
                className={`w-6 h-6 ${val <= ratings[category] ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 font-sans text-gray-900 w-full max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Company Satisfaction Rating</h1>
        <p className="text-sm text-gray-500 mt-1">Provide anonymous feedback on the company to help improve our work environment.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animation-fade-in">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg overflow-hidden">
             🏢
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Rate Our Company
            </h3>
            <p className="text-sm text-gray-500">
              Provide your feedback about the workplace
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <StarInput category="compensation_benefits" label="Compensation & Benefits" />
          <StarInput category="work_culture" label="Work Culture" />
          <StarInput category="work_life_balance" label="Work-Life Balance" />
          <StarInput category="career_growth" label="Career Growth Opportunities" />
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl  transition-colors shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
}
