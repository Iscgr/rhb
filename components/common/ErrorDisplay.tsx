import React from 'react';
import { ErrorIcon } from './Icons';

interface ErrorDisplayProps {
  message: string;
  onClear: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onClear }) => {
  if (!message) return null;

  return (
    <div 
      className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-start gap-4 animate-fade-in-up" 
      role="alert"
      style={{ animationDuration: '0.3s' }}
    >
      <div className="flex-shrink-0 pt-0.5">
        <ErrorIcon className="w-6 h-6 text-red-400" />
      </div>
      <div className="flex-1">
        <strong className="font-bold block">خطای عملیات</strong>
        <span className="block mt-1 text-red-200">{message}</span>
      </div>
      <button 
        onClick={onClear} 
        className="p-1 rounded-full hover:bg-red-800/50 transition-colors -m-1"
        aria-label="بستن خطا"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default ErrorDisplay;
