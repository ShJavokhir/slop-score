# SlopScore Project Plan

## Master Task List

### **Track 1: UI/UX Foundation** (Designer/Frontend-focused)

**Task 1.1: Design System Setup**
- Define typography scale (inspired by deepwiki's clean hierarchy)
- Create color palette: semantic colors for score ranges (0-30 green, 31-60 yellow, 61-100 red), neutral grays
- Define spacing system and layout grid
- Create component primitives: buttons, input fields, cards, badges, score gauges
- Build reusable TailwindCSS utility classes

**Task 1.2: Component Library**
- Search input component with loading states and URL validation feedback
- Score gauge component (circular or horizontal bar showing 0-100)
- Metric card component (individual slop metrics with icons)
- Repository card component for leaderboard (repo name, slop score, analysis date, stars)
- Slop signal detail card (shows specific code issues with file/line references)
- Empty states and error states
- Loading skeletons

**Task 1.3: Visual Design Mockups**
- Homepage: hero section, search box, "Recent High Slopers" preview
- Analysis page: score hero, tabbed breakdown (Overview, AI Slop Details, README Check, Hardcode Analysis)
- Leaderboard page: clean table/grid with sort by score
- Mobile responsive layouts

---

### **Track 2: Frontend Architecture** (Frontend Engineer)

**Task 2.1: Next.js App Structure**
- Setup Next.js 14+ with App Router
- Configure TypeScript strict mode
- Setup TailwindCSS with deepwiki-inspired configuration (focus on readability)
- Create base layout with minimal header (logo, search, leaderboard link)
- Setup environment variables for Supabase
- Configure error boundaries

**Task 2.2: Page Scaffolding**
- `/` - Homepage with search and recent high-slop preview
- `/[repo-name]` - Detailed analysis results (e.g., `/facebook-react`, `/vercel-next.js`)
- `/leaderboard` - Top 100 sloppiest repos
- Handle URL encoding for repo names with special characters
- Setup dynamic metadata for SEO and social sharing

**Task 2.3: Client-Side Logic**
- Setup SWR for data fetching and caching
- Custom hook for analysis status polling (queued → analyzing → complete)
- GitHub URL validation (regex for github.com/owner/repo format)
- Optimistic UI for analysis submission
- Client-side navigation between pages
- Copy-to-clipboard for share URLs

**Task 2.4: API Route Layer**
- `POST /api/analyze` - Submit repo URL, check if cached, return existing or queue new analysis
- `GET /api/analysis/[repoName]` - Fetch complete analysis results
- `GET /api/status/[jobId]` - Poll job status while analyzing
- `GET /api/leaderboard` - Fetch top 100 repos by slop score
- Standard error responses and logging

---

### **Track 3: Database & Backend** (Backend Engineer)

**Task 3.1: Supabase Schema Design**

**Tables:**
```
repositories
- id (uuid, primary key)
- github_url (text, unique)
- owner (text)
- name (text)
- repo_name_slug (text, unique) - for URL routing (e.g., "facebook-react")
- stars (int)
- primary_language (text)
- created_at (timestamp)

analyses
- id (uuid, primary key)
- repository_id (uuid, foreign key)
- slop_score (int) - 0-100
- status (enum: queued, analyzing, complete, failed)
- analysis_date (timestamp)
- error_message (text, nullable)

analysis_details
- id (uuid, primary key)
- analysis_id (uuid, foreign key)
- readme_accuracy_score (int) - 0-100
- ai_slop_percentage (float)
- hardcode_percentage (float)
- total_files_analyzed (int)
- total_lines_analyzed (int)

slop_signals
- id (uuid, primary key)
- analysis_id (uuid, foreign key)
- signal_type (enum: verbose_naming, obvious_comments, defensive_checks, type_gymnastics, generic_errors, inconsistent_patterns, safety_theater)
- file_path (text)
- line_number (int, nullable)
- code_snippet (text)
- description (text)

readme_mismatches
- id (uuid, primary key)
- analysis_id (uuid, foreign key)
- claimed_feature (text)
- implementation_status (enum: missing, incomplete, complete, overstated)
- explanation (text)
```

**Indexes:**
- `repositories.repo_name_slug` (for fast URL lookups)
- `repositories.github_url` (for duplicate checking)
- `analyses.slop_score DESC` (for leaderboard)
- `analyses.repository_id` (for fetching repo analyses)

**Task 3.2: Supabase Edge Functions Setup**
- Function to check if repo already analyzed (by github_url)
- Function to create new analysis job
- Function to update analysis status and results
- Function to fetch leaderboard with repo joins

**Task 3.3: GitHub Metadata Integration**
- Setup GitHub API client (no auth needed for public repos)
- Fetch repository metadata (stars, language, description)
- Generate repo_name_slug from owner/name (handle special characters)
- Extract README URL for content fetching

---

### **Track 4: Analysis Engine** (Backend Engineer)

**Task 4.1: gitingest Integration**
- Setup gitingest to clone and parse repository structure
- Configure to output markdown digest of codebase
- Handle large repos gracefully (gitingest has size limits)
- Extract file tree and identify project-specific code paths

**Task 4.2: Intelligent File Filtering**
- Identify entry points (package.json scripts, main files from gitingest)
- Crawl dependency graph from entry points
- Exclude: node_modules, .git, dist, build, coverage, vendor directories
- Exclude: lock files, config boilerplate (default create-react-app, vite configs)
- Focus on: src/, lib/, components/, pages/, api/, custom config files
- Calculate token budget per file based on project size

**Task 4.3: README Feature Extraction**
- Fetch README.md content
- Use Gemini to extract list of claimed features/functionality
- Identify feature categories (authentication, database, API, UI components, etc.)
- Create structured list for verification (max 10-15 key features)
- Handle repos without meaningful READMEs (return N/A score)

**Task 4.4: AI Slop Detection Module**

For each of the 7 slop signals, analyze filtered codebase:

**Verbose Naming Analysis:**
- Identify function/variable names exceeding reasonable length
- Compare naming patterns across project
- Flag redundant prefixes/suffixes

**Obvious Comments Analysis:**
- Parse comments from code
- Use Gemini to classify: obvious vs. meaningful
- Calculate ratio

**Defensive Checks Analysis:**
- Identify try/catch blocks
- Cross-reference with TypeScript type definitions
- Flag unnecessary null checks on typed parameters

**Type Gymnastics Analysis:**
- Scan for `as any`, `any`, `@ts-ignore`, `@ts-expect-error`
- Identify type assertion chains
- Count occurrences per file

**Generic Error Handling Analysis:**
- Pattern match for generic catch blocks
- Identify empty error messages
- Flag `console.error` without context

**Inconsistent Patterns Analysis:**
- Analyze async patterns per file (await vs .then)
- Check indentation consistency
- Detect mixed error handling styles within files

**Safety Theater Analysis:**
- Find redundant input validation on typed functions
- Identify typeof checks in TypeScript strict mode
- Flag defensive checks on trusted code paths

**Output:** Generate slop_signals records with file paths, line numbers, and explanations

**Task 4.5: Hardcode Detection Module**
- Scan for hardcoded values: strings, numbers, URLs, API endpoints
- Distinguish configuration from logic (exclude constants files)
- Flag suspicious patterns: hardcoded tokens, test data in source
- Calculate ratio of hardcoded vs. parameterized values
- Generate explanation of hardcode concentration

**Task 4.6: README Verification Module**
- For each claimed feature from Task 4.3:
  - Search codebase for implementation evidence
  - Use Gemini to assess completeness (0-100%)
  - Generate implementation_status (missing, incomplete, complete, overstated)
  - Create natural language explanation
- Calculate overall README accuracy score (average of feature completeness)
- Store results in readme_mismatches table

**Task 4.7: Score Aggregation Algorithm**

**Weighted formula:**
- README accuracy: 35% (inverted: lower accuracy = higher slop)
- AI slop percentage: 40% (higher AI signals = higher slop)
- Hardcode percentage: 25% (higher hardcoding = higher slop)

**Calculation:**
```
slop_score = 
  (100 - readme_accuracy) * 0.35 +
  (ai_slop_percentage) * 0.40 +
  (hardcode_percentage) * 0.25
```

Result: 0-100 score where higher = more slop

**Task 4.8: Gemini API Integration**
- Design prompts for each analysis type (feature extraction, slop detection, README verification)
- Implement token-efficient chunking strategy
- Use streaming for long responses
- Handle rate limits and retries
- Log token usage per analysis for cost tracking
- Return structured JSON responses from Gemini

**Task 4.9: Analysis Job Queue**
- Implement background job processor (Supabase Edge Functions or separate worker)
- Queue management: queued → analyzing → complete/failed
- Update database with progress
- Store results atomically
- Handle failures gracefully (store error_message, set status to failed)

---

### **Track 5: Integration & Polish** (Full-stack)

**Task 5.1: End-to-End Flow**
- User submits GitHub URL → Check cache in DB
- If cached: redirect to `/[repo-name]` immediately
- If new: create job → queue analysis → redirect to `/[repo-name]` with loading state
- Frontend polls `/api/status/[jobId]` until complete
- Display results when ready

**Task 5.2: Analysis Results Page Implementation**
- Hero section: Repository name, slop score gauge, stars, language
- Overview tab: Score breakdown (README accuracy, AI slop %, Hardcode %)
- AI Slop Details tab: Grouped by signal type, expandable file listings
- README Check tab: Feature-by-feature comparison table
- Hardcode Analysis tab: Hardcode concentration visualization
- Link to GitHub repo
- Share button (copy URL)

**Task 5.3: Leaderboard Implementation**
- Fetch top 100 repos sorted by slop_score DESC
- Display as clean table: Rank, Repo Name, Slop Score, Stars, Date Analyzed
- Click row to navigate to `/[repo-name]`
- Simple styling consistent with deepwiki aesthetic

**Task 5.4: Homepage Polish**
- Hero: "Stop the slop. Measure what's real."
- Search box with placeholder examples
- "Recent High Slopers" section: Show 3-5 recently analyzed high-scoring repos
- Link to leaderboard
- Brief explanation of what SlopScore does

**Task 5.5: Performance & Error Handling**
- Cache analysis results with Next.js ISR (revalidate: false since no re-analysis)
- Optimize Gemini calls with batching where possible
- Handle edge cases: 404 repos, private repos, empty repos, non-code repos
- Error logging (console or simple service)
- Loading states for all async operations
- 404 page for non-existent repo analyses

---

## Suggested Task Dependencies

**Can start immediately (parallel):**
- Track 1 (all UI/UX tasks)
- Track 2.1 (App structure)
- Track 3.1 (Database schema)
- Track 4.1-4.8 (Analysis engine modules - develop with mock repos)

**Requires completion:**
- Track 2.3 depends on Track 3.1 (need schema)
- Track 2.4 depends on Track 3.2 and Track 4.9 (need backend functions)
- Track 5 depends on all previous tracks

**Critical path:** Track 4 (Analysis Engine) is most complex. Start earliest.