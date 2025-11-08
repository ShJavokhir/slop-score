# API Documentation

All endpoints require Clerk authentication.

## Endpoints

### POST /api/analyze

Batch analyze GitHub repositories. Creates background jobs for each repo.

**Request:**
```json
{
  "urls": [
    "https://github.com/owner/repo1",
    "https://github.com/owner/repo2"
  ]
}
```

**Response:**
```json
{
  "jobs": {
    "https://github.com/owner/repo1": "job_abc123",
    "https://github.com/owner/repo2": "job_def456"
  }
}
```

**Behavior:**
- Creates background job for each URL
- Saves/updates repo in database
- Re-analyzes if URL already exists
- Returns map of URL → job ID

**Errors:**
- `400` - Invalid URL format
- `401` - Unauthorized
- `429` - Rate limit exceeded

---

### GET /api/jobs/:id/status

Get status of background job.

**Response:**
```json
{
  "jobId": "job_abc123",
  "status": "processing",
  "currentStep": "Analyzing repository structure",
  "progress": 45,
  "createdAt": "2025-11-08T10:00:00Z",
  "updatedAt": "2025-11-08T10:02:30Z"
}
```

**Status values:**
- `pending` - Job queued
- `processing` - Analysis in progress
- `completed` - Analysis finished
- `failed` - Analysis failed

**Processing steps:**
- "Validating repository"
- "Cloning repository"
- "Analyzing repository structure"
- "Calculating slop score"
- "Saving results"

**Errors:**
- `404` - Job not found
- `401` - Unauthorized

---

### GET /api/jobs/:id/result

Get completed job result.

**Response:**
```json
{
  "jobId": "job_abc123",
  "status": "completed",
  "result": {
    "url": "https://github.com/owner/repo",
    "slopScore": 42.5,
    "notes": [
      "Excessive use of any type",
      "Missing documentation",
      "Inconsistent naming conventions"
    ],
    "analyzedAt": "2025-11-08T10:05:00Z"
  }
}
```

**Failed job response:**
```json
{
  "jobId": "job_abc123",
  "status": "failed",
  "error": {
    "message": "Repository not found or is private",
    "code": "REPO_NOT_ACCESSIBLE"
  }
}
```

**Errors:**
- `404` - Job not found
- `401` - Unauthorized
- `425` - Job not yet completed (use /status endpoint)

---

### GET /api/repos

List all analyzed repositories.

**Query Parameters:**
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)
- `sortBy` - Sort field: `score`, `date`, `url` (default: `date`)
- `sortOrder` - `asc` or `desc` (default: `desc`)
- `minScore` - Filter by minimum slop score
- `maxScore` - Filter by maximum slop score
- `search` - Search in URL (case-insensitive)

**Example Request:**
```
GET /api/repos?limit=10&offset=0&sortBy=score&sortOrder=desc&minScore=50
```

**Response:**
```json
{
  "repos": [
    {
      "id": "repo_123",
      "url": "https://github.com/owner/repo",
      "slopScore": 85.2,
      "notes": ["Critical issues found"],
      "analyzedAt": "2025-11-08T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

**Errors:**
- `400` - Invalid query parameters
- `401` - Unauthorized

---

## Data Models

### Repo
```typescript
{
  id: string;           // Unique identifier
  url: string;          // GitHub repository URL
  slopScore: number;    // 0-100 score (higher = more slop)
  notes: string[];      // AI-generated analysis notes
  analyzedAt: string;   // ISO 8601 timestamp
  userId: string;       // Owner (from Clerk)
}
```

### Job
```typescript
{
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentStep?: string;
  progress?: number;    // 0-100
  createdAt: string;
  updatedAt: string;
  result?: Repo;        // Present when status is 'completed'
  error?: {
    message: string;
    code: string;
  };
}
```

### User
- Managed by Clerk authentication
- All API requests scoped to authenticated user

---

## Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {}  // Optional additional context
  }
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid auth)
- `404` - Not Found
- `425` - Too Early (job not ready)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

---

## Authentication

All endpoints require Clerk session token in Authorization header:

```
Authorization: Bearer <clerk_session_token>
```

Requests are scoped to the authenticated user - users can only access their own repos and jobs.

---

## Notes

- **Duplicate URLs:** Re-analyzing a URL creates a new job and updates the existing repo
- **Job retention:** Jobs kept for 7 days after completion
- **Polling:** Use GET /api/jobs/:id/status to poll for updates (recommended: 2-5 second intervals)
- **Private repos:** Analysis fails if repo is private or inaccessible
