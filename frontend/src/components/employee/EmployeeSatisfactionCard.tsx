import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { PageLoader } from '../common/LoadingSpinner';

interface SatisfactionData {
  average_overall: number;
  overall_percentage: number;
  compensation_benefits: number;
  work_culture: number;
  work_life_balance: number;
  career_growth: number;
  total_ratings: number;
}

interface Props {
  userId?: number;
}

const Star = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const StarHalf = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <linearGradient id="half-star-gradient">
        <stop offset="50%" stopColor="currentColor" />
        <stop offset="50%" stopColor="transparent" stopOpacity="1" />
      </linearGradient>
    </defs>
    <polygon fill="url(#half-star-gradient)" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const StarRating = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center space-x-1">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className="w-4 h-4 text-yellow-400" />
      ))}
      {hasHalfStar && <StarHalf className="w-4 h-4 text-yellow-400" />}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      ))}
    </div>
  );
};

export default function EmployeeSatisfactionCard() {
  const [data, setData] = useState<SatisfactionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const response = await api.get(`/satisfaction-ratings/company-overall`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching satisfaction ratings', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRatings();
  }, []);

  useEffect(() => {
    if (data) {
      // Small delay to ensure the browser paints the initial 0 state before transitioning
      const timer = setTimeout(() => {
        setAnimatedPercentage(data.overall_percentage);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (isLoading) return <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 min-h-[300px] flex items-center justify-center"><PageLoader /></div>;
  if (!data || data.total_ratings === 0) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[300px] text-gray-500">
        <p>No satisfaction ratings available yet.</p>
      </div>
    );
  }

  const renderCategory = (title: string, rating: number) => {
    const percentage = Math.round((rating / 5) * 100);
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
          <p className="text-xs text-gray-400 mt-0.5">{percentage}% Satisfaction</p>
        </div>
        <div className="flex items-center space-x-3">
          <StarRating rating={rating} />
          <span className="text-sm font-bold text-gray-800 min-w-[36px] text-right">{rating.toFixed(1)}/5</span>
        </div>
      </div>
    );
  };

  // SVG Gauge Calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  // Let's make it a semi-circle like a gauge
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * (circumference / 2);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-lg w-full font-sans">
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-xl font-bold text-gray-900">Employee Satisfaction</h3>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-4xl font-extrabold text-gray-900 mb-1">{data.overall_percentage}%</div>
          <div className="text-sm text-gray-500 font-medium mb-2">Employee Satisfied</div>
          <div className="flex items-center space-x-2">
            <StarRating rating={data.average_overall} />
            <span className="text-sm font-bold text-gray-900">{data.average_overall.toFixed(1)}/5</span>
          </div>
        </div>

        {/* Circular Gauge */}
        <div className="relative w-32 h-20 overflow-hidden flex justify-center">
          <svg className="w-32 h-32 transform -rotate-180" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              className="text-gray-100"
              strokeWidth="12"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="50"
              cy="50"
              strokeDasharray={circumference}
              strokeDashoffset={circumference / 2}
              strokeLinecap="round"
            />
            {/* Value Track */}
            <circle
              className="text-emerald-400 transition-all duration-1000 ease-out"
              strokeWidth="12"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="50"
              cy="50"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          {/* Needle for gauge */}
          <div
            className="absolute bottom-0 left-1/2 w-2 h-12 bg-gray-800 rounded-t-full origin-bottom transform transition-transform duration-1000 ease-out"
            style={{ 
              transform: `translateX(-50%) rotate(${((animatedPercentage / 100) * 180) - 90}deg)`,
              transformOrigin: 'bottom center'
            }}
          >
            {/* Needle Pivot Circle */}
            <div className="absolute -bottom-2 -left-1.5 w-5 h-5 bg-gray-800 rounded-full border-4 border-white shadow-sm"></div>
          </div>
        </div>
      </div>

      <div className="bg-emerald-50 text-emerald-700 text-sm font-medium px-4 py-3 rounded-lg mb-6">
        Based on {data.total_ratings} {data.total_ratings === 1 ? 'rating' : 'ratings'} from employees
      </div>

      <div className="space-y-1 divide-y divide-gray-50">
        {renderCategory('Compensation & Benefits', data.compensation_benefits)}
        {renderCategory('Work Culture', data.work_culture)}
        {renderCategory('Work-Life Balance', data.work_life_balance)}
        {renderCategory('Career Growth Opportunities', data.career_growth)}
      </div>
    </div>
  );
}
