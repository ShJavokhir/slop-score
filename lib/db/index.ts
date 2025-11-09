import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create postgres client
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(connectionString);

// Export drizzle client
export const db = drizzle(client, { schema });

// Export all schema tables for queries
export { repositories, jobs, analyses, slopNotes, features, jobStatusEnum } from './schema';
