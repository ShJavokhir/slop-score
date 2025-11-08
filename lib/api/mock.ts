/**
 * Generate deterministic mock analysis data for development.
 * Same URL always returns same score.
 */
export function generateMockAnalysis(repoUrl: string): {
  slopScore: number;
  notes: string[];
} {
  const score = hashToScore(repoUrl);
  const noteCount = 3 + (hashToNumber(repoUrl) % 3); // 3-5 notes

  const allNotes = [
    'Excessive use of any type',
    'Missing documentation',
    'Inconsistent naming conventions',
    'Large files that should be split',
    'Commented-out code blocks',
    'Magic numbers without constants',
    'Incomplete error handling',
    'Deep nesting in functions',
  ];

  // Select deterministic subset of notes based on URL
  const notes: string[] = [];
  for (let i = 0; i < noteCount; i++) {
    const index = (hashToNumber(repoUrl) + i) % allNotes.length;
    if (!notes.includes(allNotes[index])) {
      notes.push(allNotes[index]);
    }
  }

  return { slopScore: score, notes };
}

/** Hash string to score in range 20-90 */
function hashToScore(str: string): number {
  const hash = hashToNumber(str);
  return 20 + (hash % 71); // Range: 20-90
}

/** Simple hash function for deterministic number generation */
function hashToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
