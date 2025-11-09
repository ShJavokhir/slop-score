# SlopScore

**Stop the slop. Measure what's real.**

SlopScore analyzes GitHub repositories to detect AI-generated code patterns, verify feature completeness, and expose projects that are more vapor than substance.

## What It Does

Give SlopScore a public GitHub repo URL. It returns a comprehensive analysis:

**README Reality Check** - Compares claimed features against actual implementation. Flags missing, incomplete, or misrepresented functionality.

**AI Detection** - Scans for telltale signs of AI-generated code: verbose naming, obvious comments, unnecessary defensive checks, type gymnastics, generic error handling, inconsistent patterns, and safety theater.

**Hardcode Analysis** - Identifies how much of the project relies on hardcoded values versus actual logic.

## Features

- **Simple Search** - Paste a GitHub URL, get instant analysis
- **Detailed Breakdown** - See exactly why a repo earned its slop score
- **Slop Leaderboard** - Browse the most egregious offenders

## Why This Matters

AI coding tools are flooding GitHub with repos that look impressive but collapse under scrutiny. SlopScore cuts through the noise to show what's actually been built versus what's been vibed into existence.

Perfect for evaluating:
- Hackathon submissions
- OSS contributions
- Job candidate portfolios
- Your own projects (before someone else does)

## Configuration

### Environment Variables

#### Database
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key for admin access

#### Gemini AI (Optional)
- `USE_GEMINI_AGENT` - Set to `1`, `true`, or `yes` to enable Gemini AI analysis (default: disabled, falls back to LoopAgent)
- `GEMINI_API_KEY` - Your Google Gemini API key
- `GEMINI_MODEL` - Model to use (default: `gemini-2.0-flash-exp`)
- `GEMINI_RPM` - Requests per minute rate limit (default: `10` for free tier)
- `GEMINI_MAX_RETRIES` - Maximum retry attempts for rate-limited requests (default: `3`)

#### Analysis Configuration
- `ENABLE_INTERACTIVE_SHELL` - Set to `1`, `true`, or `yes` to enable interactive Docker shell mode
- `LOG_LEVEL` - Logging verbosity: `DEBUG`, `INFO`, `WARNING`, `ERROR` (default: `INFO`)

#### AWS SQS (for background processing)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_DEFAULT_REGION` - AWS region (default: `us-east-1`)
- `SQS_QUEUE_URL` - SQS queue URL for job processing

### Rate Limiting

The system includes built-in rate limiting for Gemini API calls to prevent quota exhaustion:

- **Requests per minute**: Configurable via `GEMINI_RPM` (default: 10 for free tier)
- **Exponential backoff**: Automatic retry with increasing delays on rate limit errors
- **Jitter**: Random delay variation to prevent thundering herd problems
- **Fallback**: Automatic fallback to LoopAgent if Gemini consistently fails

Example `.env` file:
```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini AI (optional)
USE_GEMINI_AGENT=true
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_RPM=10
GEMINI_MAX_RETRIES=3

# Logging
LOG_LEVEL=INFO
```

---

*Built for a world drowning in slop code. Use responsibly.*