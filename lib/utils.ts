// Utility functions for SlopScore application

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes with proper precedence
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates a GitHub repository URL
 * @param url - The URL to validate
 * @returns true if the URL is a valid GitHub repository URL
 */
export function isValidGitHubUrl(url: string): boolean {
  const githubRepoRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
  return githubRepoRegex.test(url.trim());
}

/**
 * Extracts owner and repo name from a GitHub URL
 * @param url - The GitHub URL
 * @returns Object with owner and repo name, or null if invalid
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([\w-]+)\/([\w.-]+)/);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''), // Remove .git suffix if present
  };
}

/**
 * Generates a URL-safe slug from owner/repo
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns URL-safe slug
 */
export function generateRepoSlug(owner: string, repo: string): string {
  return `${owner}-${repo}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

/**
 * Gets color class based on slop score
 * @param score - Slop score (0-100)
 * @returns Tailwind color class
 */
export function getScoreColor(score: number): string {
  if (score <= 30) return 'text-green-600';
  if (score <= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Gets background color class based on slop score
 * @param score - Slop score (0-100)
 * @returns Tailwind background color class
 */
export function getScoreBgColor(score: number): string {
  if (score <= 30) return 'bg-green-50';
  if (score <= 60) return 'bg-yellow-50';
  return 'bg-red-50';
}

/**
 * Gets score label based on slop score
 * @param score - Slop score (0-100)
 * @returns Human-readable label
 */
export function getScoreLabel(score: number): string {
  if (score <= 30) return 'Clean Code';
  if (score <= 60) return 'Some Slop';
  return 'High Slop';
}

/**
 * Formats a number with commas
 * @param num - Number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Formats a date string to a human-readable format
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Gets a human-readable label for a slop signal type
 * @param signalType - The slop signal type
 * @returns Human-readable label
 */
export function getSignalTypeLabel(signalType: string): string {
  const labels: Record<string, string> = {
    verbose_naming: 'Verbose Naming',
    obvious_comments: 'Obvious Comments',
    defensive_checks: 'Defensive Checks',
    type_gymnastics: 'Type Gymnastics',
    generic_errors: 'Generic Errors',
    inconsistent_patterns: 'Inconsistent Patterns',
    safety_theater: 'Safety Theater',
  };

  return labels[signalType] || signalType;
}
