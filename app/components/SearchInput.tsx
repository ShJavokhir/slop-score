'use client';

import React, { useState } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface SearchInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

export function SearchInput({ onSubmit, isLoading = false }: SearchInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const validateGitHubUrl = (url: string): boolean => {
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/i;
    return githubRegex.test(url.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    if (!validateGitHubUrl(url)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)');
      return;
    }

    setError('');
    onSubmit(url.trim());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            type="text"
            value={url}
            onChange={handleChange}
            placeholder="https://github.com/owner/repository"
            error={error}
            disabled={isLoading}
            icon={
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="whitespace-nowrap"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Repo'}
        </Button>
      </div>
    </form>
  );
}
