'use client';

import { useState, FormEvent } from 'react';
import { isValidGitHubUrl } from '@/lib/utils';

interface SearchInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export default function SearchInput({
  onSubmit,
  isLoading = false,
  placeholder = 'https://github.com/facebook/react'
}: SearchInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!url.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    if (!isValidGitHubUrl(url)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)');
      return;
    }

    setError('');
    onSubmit(url.trim());
  };

  const handleChange = (value: string) => {
    setUrl(value);
    if (touched && error) {
      // Clear error if user starts typing after seeing an error
      if (isValidGitHubUrl(value)) {
        setError('');
      }
    }
  };

  const showError = touched && Boolean(error);

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={url}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={placeholder}
              disabled={isLoading}
              className={`w-full px-4 py-3 rounded-lg border ${
                showError
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'
              } focus:outline-none focus:ring-2 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed`}
              aria-label="GitHub repository URL"
              aria-invalid={showError}
              aria-describedby={showError ? 'url-error' : undefined}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        {showError && (
          <p id="url-error" className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
