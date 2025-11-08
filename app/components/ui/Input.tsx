'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className = '', id, ...props }: InputProps) {
  const inputId = id || `input-${React.useId()}`;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={errorId}
          className={`
            w-full rounded-lg border border-gray-300
            ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5
            text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
