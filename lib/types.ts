// Shared types for SlopScore application

export type SlopSignalType =
  | 'verbose_naming'
  | 'obvious_comments'
  | 'defensive_checks'
  | 'type_gymnastics'
  | 'generic_errors'
  | 'inconsistent_patterns'
  | 'safety_theater';

export type AnalysisStatus = 'queued' | 'analyzing' | 'complete' | 'failed';

export type ImplementationStatus = 'missing' | 'incomplete' | 'complete' | 'overstated';

export interface Repository {
  id: string;
  github_url: string;
  owner: string;
  name: string;
  repo_name_slug: string;
  stars: number;
  primary_language: string;
  created_at: string;
}

export interface Analysis {
  id: string;
  repository_id: string;
  slop_score: number;
  status: AnalysisStatus;
  analysis_date: string;
  error_message?: string;
}

export interface AnalysisDetails {
  id: string;
  analysis_id: string;
  readme_accuracy_score: number;
  ai_slop_percentage: number;
  hardcode_percentage: number;
  total_files_analyzed: number;
  total_lines_analyzed: number;
}

export interface SlopSignal {
  id: string;
  analysis_id: string;
  signal_type: SlopSignalType;
  file_path: string;
  line_number?: number;
  code_snippet: string;
  description: string;
}

export interface ReadmeMismatch {
  id: string;
  analysis_id: string;
  claimed_feature: string;
  implementation_status: ImplementationStatus;
  explanation: string;
}

export interface RepositoryWithAnalysis {
  repository: Repository;
  analysis: Analysis;
  details?: AnalysisDetails;
  slop_signals?: SlopSignal[];
  readme_mismatches?: ReadmeMismatch[];
}
