import { pgTable, text, uuid, timestamp, pgEnum, integer, decimal, uniqueIndex, index } from 'drizzle-orm/pg-core';

// Job status enum: pending, processing, completed, failed
export const jobStatusEnum = pgEnum('job_status', ['pending', 'processing', 'completed', 'failed']);

// repositories table
export const repositories = pgTable('repositories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  githubUrl: text('github_url').notNull(),
  owner: text('owner').notNull(),
  name: text('name').notNull(),
  stars: integer('stars'),
  primaryLanguage: text('primary_language'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Unique constraint on githubUrl
  githubUrlIdx: uniqueIndex('github_url_idx').on(table.githubUrl),
  // Index on userId for user isolation queries
  userIdIdx: index('repositories_user_id_idx').on(table.userId),
}));

// jobs table
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id),
  status: jobStatusEnum('status').notNull().default('pending'),
  currentStep: text('current_step'),
  progress: integer('progress').default(0),
  errorMessage: text('error_message'),
  errorCode: text('error_code'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Index on userId for user isolation queries
  userIdIdx: index('jobs_user_id_idx').on(table.userId),
  // Index on status for job queue queries
  statusIdx: index('jobs_status_idx').on(table.status),
}));

// analyses table
export const analyses = pgTable('analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().unique().references(() => jobs.id),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id),
  slopScore: decimal('slop_score', { precision: 5, scale: 2 }).notNull(),
  analyzedAt: timestamp('analyzed_at').notNull().defaultNow(),
}, (table) => ({
  // Index on slopScore for sorting/filtering by score
  slopScoreIdx: index('analyses_slop_score_idx').on(table.slopScore),
}));

// slop_notes table
export const slopNotes = pgTable('slop_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').notNull().references(() => analyses.id),
  note: text('note').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
