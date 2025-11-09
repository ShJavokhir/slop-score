#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Loop Agent: Automated repository analyzer that learns the project structure
and produces a comprehensive output.md using robust Unix tooling.
"""

import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class LoopAgent:
    """
    Executes a robust, command-driven analysis inside the existing Alpine Docker container.
    Produces /repo/output.md with a structured overview of the project and key file insights.
    """

    def __init__(self, repo_dir: str = "/repo"):
        self.repo_dir = repo_dir
        self.output_path = "{}/output.md".format(self.repo_dir)

        # System prompt captured for traceability and future reproducibility
        self.system_prompt = """# Hackathon Project Integrity Analyzer

You are an expert code review agent designed to assist hackathon judges by analyzing submitted projects for authenticity and real-world viability. Your primary mission is to identify hardcoded elements, demo-only implementations, and shortcuts that make projects appear functional but wouldn't work in production scenarios.

## Core Responsibilities
1. Detect Hardcoded/Mock Implementations: Identify code that only works for specific demo cases
2. Verify Real Functionality: Distinguish between actual working features and simulated ones
3. Assess Production Readiness: Evaluate if the solution could work with real data and users
4. Document Findings: Provide clear, evidence-based reports of any concerns

## Systematic Review Process
### Phase 1: Project Overview
1. Start with README.md or documentation files to understand claimed features
2. Identify the tech stack and project type (Next.js, React, Python, etc.)
3. Check package.json, requirements.txt, or equivalent for dependencies
4. Review .env.example or configuration files for expected environment variables
5. Examine the project structure to understand the architecture

### Phase 2: Entry Point Analysis
For Web Applications (Next.js, React, Vue, etc.):
- Start from pages/ or app/ directory (Next.js)
- Check src/App.js or src/main.js (React/Vue)
- Follow the routing structure to understand user flows
- Trace data flow from UI components to backend calls

For Backend Services:
- Start from main.py, app.py, index.js, or server.js
- Check API route definitions
- Follow request handlers to data sources

For Full-Stack Applications:
- Review both frontend and backend entry points
- Pay special attention to API integration points

### Phase 3: Deep Code Inspection

## Red Flags to Detect
### 1. Hardcoded Data
```javascript
// RED FLAG: Hardcoded user data
const users = [
  {id: 1, name: "John Doe", email: "john@demo.com"},
  {id: 2, name: "Jane Smith", email: "jane@demo.com"}
];
// RED FLAG: Fixed responses
const getWeather = () => {
  return { temp: 72, condition: "Sunny" }; // Always returns same data
}
```

### 2. Fake API Calls
```javascript
// RED FLAG: setTimeout instead of real API
const fetchData = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockData);
    }, 1000);
  });
}
// RED FLAG: Commented out real implementation
// const response = await fetch(API_URL);
const response = { data: demoData };
```

### 3. Demo-Only Logic
```python
# RED FLAG: Hardcoded conditions
def authenticate_user(username, password):
    if username == "demo" and password == "demo123":
        return True
    return False
# RED FLAG: Fixed random values
import random
random.seed(42)  # Always produces same "random" results
```

### 4. Missing Error Handling
```javascript
// RED FLAG: No error handling for production scenarios
try {
  const data = await fetchAPI();
} catch(e) {
  // Empty catch block or only console.log
  console.log(e);
}
```

### 5. Environment/Configuration Issues
- Hardcoded API keys, URLs, or credentials in source code
- Missing or fake .env configurations
- Local file paths that won't work in production
- Database connections pointing to local/mock databases

### 6. Suspicious Patterns
- Data that's too perfect (sequential IDs, round numbers, demo names)
- Features that only work with specific inputs
- Commented-out code showing real implementation attempts
- Git history showing last-minute replacements of real code with mocks
- Inconsistent data formats between different parts of the application

## Investigation Commands
Use these Unix commands to investigate:
```bash
# Search for common hardcoded patterns
grep -r "localhost" --exclude-dir=node_modules
grep -r "123456\\|password\\|demo\\|test" --exclude-dir=node_modules
grep -r "setTimeout\\|setInterval" --include="*.js" --include="*.jsx"
grep -r "TODO\\|FIXME\\|HACK\\|XXX" --exclude-dir=node_modules

# Find commented code blocks
grep -r "^[[:space:]]*//.*fetch\\|^[[:space:]]*//.*api" --include="*.js"
grep -r "^[[:space:]]*#.*request\\|^[[:space:]]*#.*database" --include="*.py"

# Check for mock/test files in production code
find . -name "*mock*" -o -name "*test*" -o -name "*demo*" | grep -v node_modules

# Analyze git history for suspicious changes
git log --oneline -n 20
git diff HEAD~5 --stat
git log -p -S "mock\\|fake\\|demo\\|hardcode"

# Check file modification times (very recent changes might indicate last-minute hacks)
find . -type f -mmin -60 -not -path "./node_modules/*"
```

## Framework-Specific Checks
### Next.js Projects
1. Check /pages/api or /app/api for actual API implementations vs mock returns
2. Verify getServerSideProps/getStaticProps actually fetch data
3. Check if API routes connect to real databases or services
4. Look for hardcoded data in React components
5. Verify environment variables in next.config.js

### React Projects
1. Check if Redux/Context stores have hardcoded initial states
2. Verify API calls in useEffect hooks are real
3. Look for mock service workers or interceptors
4. Check if components handle loading/error states properly

### Python Projects
1. Check database models vs actual database connections
2. Verify API endpoints return real data
3. Look for pickle files or JSON files with demo data
4. Check if ML models are actually trained or just return fixed predictions

### Node.js/Express Projects
1. Verify database middleware is properly configured
2. Check if routes actually process data vs returning static responses
3. Look for proper async/await handling vs fake delays
4. Verify authentication/authorization is real

## Reporting Format
After analysis, provide a structured report:
```markdown
# Project Integrity Analysis Report
## Project: [Project Name]
## Technology Stack: [List technologies]
## Summary
[Brief overview of findings]
## Critical Issues Found
1. **[Issue Type]**: [Description]
   - Location: `[file:line]`
   - Evidence: [Code snippet or explanation]
   - Impact: [Why this is problematic]
## Suspicious Patterns
- [List patterns that suggest demo-only implementation]
## Verification Tests Performed
- [List specific checks you ran]
## Recommendation
[GENUINE / DEMO-ONLY / PARTIALLY-FUNCTIONAL]
## Detailed Explanation
[Comprehensive explanation of your conclusion]
```

## Important Reminders
1. Be Thorough: Don't just check main files; follow the entire data flow
2. Check Dependencies: Verify that imported modules and packages are actually used
3. Test Claimed Features: If they claim real-time updates, check WebSocket implementation
4. Verify External Services: Check if APIs, databases, and third-party services are real
5. Look for Patterns: Multiple small issues often indicate systematic corner-cutting
6. Check Edge Cases: See if the code handles errors, empty states, and invalid inputs
7. Review Git History: Last-minute commits often reveal hardcoding additions
8. Consider Time Constraints: Be fair but thorough; hackathons have time limits but integrity matters

## Decision Framework
Rate the project on these criteria:
- Functionality: Does it actually work or just appear to work?
- Data Authenticity: Is data dynamically generated/fetched or hardcoded?
- Error Handling: Are edge cases and errors properly handled?
- Scalability: Would this work with 100x more data/users?
- Security: Are there obvious security shortcuts for the demo?

Remember: Your role is to ensure fairness in judging by identifying projects that took shortcuts to appear more complete than they actually are. Be meticulous but fair, and always provide evidence for your findings.
"""

    def get_system_prompt(self) -> str:
        return self.system_prompt

    def _install_packages(self, runner) -> None:
        """
        Install robust set of analysis tools inside the Alpine container.
        Safe to re-run; uses --no-cache and idempotent checks.
        """
        # Update index first to reduce transient failures
        update_result = runner.execute_command("apk update")
        if not update_result["success"]:
            # Not fatal on some minimal images, continue and try adds
            logger.warning("apk update failed: {}".format(update_result["output"]))

        # Required tools for analysis (must succeed)
        required_packages = [
            "coreutils",
            "findutils",
            "grep",
            "sed",
            "tree",
            "jq",
            "file",
        ]
        for pkg in required_packages:
            res = runner.execute_command("apk add --no-cache {}".format(pkg))
            if not res["success"]:
                raise RuntimeError("Failed to install required package {}: {}".format(pkg, res["output"]))

        # Optional tools (best-effort, continue on failure)
        optional_packages = [
            "ripgrep",        # may not exist in some repositories
            "gawk",           # enhanced awk; busybox awk usually present
            "python3",
            "py3-pip",
            "busybox-extras",
        ]
        for pkg in optional_packages:
            res = runner.execute_command("apk add --no-cache {}".format(pkg))
            if not res["success"]:
                logger.warning("Optional package {} not installed: {}".format(pkg, res["output"]))

    def _write_analysis_script(self, runner) -> None:
        """
        Write a POSIX sh-compatible analysis script to /tmp/analyze_repo.sh
        that generates the output markdown in {repo_dir}/output.md.
        """
        script = r"""
set -eu

REPO_DIR="{repo_dir}"
OUTPUT="$REPO_DIR/output.md"
TMP_DIR="/tmp/loop_agent"
FILES="$TMP_DIR/files.txt"
LANGS="$TMP_DIR/langs.txt"
DEFINES_TMP="$TMP_DIR/defines.txt"

mkdir -p "$TMP_DIR"

# Build a filtered list of files (exclude large/vendor/irrelevant directories)
find "$REPO_DIR" \
  -type d \( \
    -name .git -o -name node_modules -o -name dist -o -name build -o -name .next -o \
    -name .venv -o -name venv -o -name __pycache__ -o -name .cache -o -name target -o \
    -name out -o -name .turbo \
  \) -prune -o -type f -print > "$FILES"

# Language detection by extension (simple but robust)
rm -f "$LANGS"
touch "$LANGS"
while IFS= read -r f; do
  b="$(basename "$f")"
  # Normalize Dockerfile naming
  case "$b" in
    Dockerfile|dockerfile) ext="dockerfile" ;;
    *) ext="${{b##*.}}" ;;
  esac
  case "$ext" in
    py) lang="Python" ;;
    js) lang="JavaScript" ;;
    jsx) lang="React JSX" ;;
    ts) lang="TypeScript" ;;
    tsx) lang="React TSX" ;;
    go) lang="Go" ;;
    rs) lang="Rust" ;;
    java) lang="Java" ;;
    kt) lang="Kotlin" ;;
    swift) lang="Swift" ;;
    cs) lang="C#" ;;
    c) lang="C" ;;
    cc|cpp|cxx|c++) lang="C++" ;;
    rb) lang="Ruby" ;;
    php) lang="PHP" ;;
    sh|bash|zsh) lang="Shell" ;;
    md) lang="Markdown" ;;
    yml|yaml) lang="YAML" ;;
    json) lang="JSON" ;;
    toml) lang="TOML" ;;
    ini|cfg|conf) lang="Config" ;;
    sql) lang="SQL" ;;
    dockerfile) lang="Dockerfile" ;;
    *) lang="Other" ;;
  esac
  printf "%s\n" "$lang" >> "$LANGS"
done < "$FILES"

TOTAL_FILES="$(wc -l < "$FILES" | tr -d '[:space:]' || echo 0)"
TOTAL_LINES="$(xargs -a "$FILES" -r wc -l 2>/dev/null | tail -n1 | awk '{{print $1}}' || echo 0)"

# Start the markdown report
cat > "$OUTPUT" <<'EOF'
# Project Technical Overview

This document was generated automatically by LoopAgent using Unix command-line analysis.

## Summary
EOF

echo "" >> "$OUTPUT"
echo "- Files analyzed: $TOTAL_FILES" >> "$OUTPUT"
echo "- Total lines (approx): $TOTAL_LINES" >> "$OUTPUT"

echo "" >> "$OUTPUT"
echo "## Language Breakdown" >> "$OUTPUT"
echo "" >> "$OUTPUT"
if [ -s "$LANGS" ]; then
  sort "$LANGS" | uniq -c | sort -nr | awk '{{printf "- %s: %s\n", $2, $1}}' >> "$OUTPUT"
else
  echo "_No language-detectable files found._" >> "$OUTPUT"
fi

echo "" >> "$OUTPUT"
echo "## Repository Tree (filtered)" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo '```' >> "$OUTPUT"
# Tree view with common ignores
tree -a -I ".git|node_modules|dist|build|.next|.venv|venv|__pycache__|.cache|target|out|.turbo" "$REPO_DIR" \
  | sed "1s|$REPO_DIR|.|" >> "$OUTPUT" || true
echo '```' >> "$OUTPUT"

echo "" >> "$OUTPUT"
echo "## Key Top-level Files" >> "$OUTPUT"
echo "" >> "$OUTPUT"
# Show README and primary manifest files if present
for k in README.md README README.MD readme.md package.json pyproject.toml requirements.txt Cargo.toml go.mod composer.json Pipfile pnpm-lock.yaml yarn.lock bun.lockb Dockerfile docker-compose.yml .env .env.example; do
  if [ -f "$REPO_DIR/$k" ]; then
    echo "### \`$k\`" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    head -n 100 "$REPO_DIR/$k" >> "$OUTPUT" || true
    echo '```' >> "$OUTPUT"
    echo "" >> "$OUTPUT"
  fi
done

echo "" >> "$OUTPUT"
echo "## File-by-File Overview" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Helper: emit safe markdown heading for a file
emit_file_section() {{
  fp="$1"
  rel="${{fp#"$REPO_DIR"/}}"
  [ "$rel" = "$REPO_DIR" ] && rel="$(basename "$fp")"

  # Basic metadata
  mime="$(file -b --mime-type "$fp" 2>/dev/null || echo "unknown")"
  lines="$(wc -l < "$fp" 2>/dev/null || echo 0)"
  size="$(wc -c < "$fp" 2>/dev/null || echo 0)"

  echo "### \`$rel\`" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  echo "- Type: $mime" >> "$OUTPUT"
  echo "- Lines: $lines" >> "$OUTPUT"
  echo "- Size (bytes): $size" >> "$OUTPUT"

  # Extract brief header comments or docstrings heuristically
  echo "" >> "$OUTPUT"
  echo "**Header/Docs (first 40 lines):**" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  head -n 40 "$fp" >> "$OUTPUT" || true
  echo '```' >> "$OUTPUT"

  # List key definitions via ripgrep if available
  echo "" >> "$OUTPUT"
  echo "**Key definitions:**" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  : > "{defs}"
  # Generic patterns across popular languages
  if command -v rg >/dev/null 2>&1; then
    rg -n "^(class|def)\\s" "$fp" >> "{defs}" 2>/dev/null || true              # Python
    rg -n "^(export\\s+)?(class|function)\\s+\\w+" "$fp" >> "{defs}" 2>/dev/null || true  # JS/TS
    rg -n "^(const|let|var)\\s+\\w+\\s*=\\s*(\\(.*\\)\\s*=>|function\\s*\\()" "$fp" >> "{defs}" 2>/dev/null || true
    rg -n "^(pub\\s+)?(struct|enum|trait|fn)\\s+\\w+" "$fp" >> "{defs}" 2>/dev/null || true  # Rust
    rg -n "^(type|func)\\s+\\w+" "$fp" >> "{defs}" 2>/dev/null || true          # Go
    rg -n "^(public|private|protected)\\s+(class|interface|enum|void|[A-Za-z_][A-Za-z0-9_]*)\\b" "$fp" >> "{defs}" 2>/dev/null || true # Java/C#
  else
    grep -nE "^(class|def)\\s" "$fp" >> "{defs}" 2>/dev/null || true
  fi
  if [ -s "{defs}" ]; then
    echo '```' >> "$OUTPUT"
    head -n 30 "{defs}" >> "$OUTPUT" || true
    echo '```' >> "$OUTPUT"
  else
    echo "_No obvious top-level definitions detected._" >> "$OUTPUT"
  fi

  echo "" >> "$OUTPUT"
}}

# Iterate files and emit sections (limit excessively large sets for practicality)
count=0
max_files=2000
while IFS= read -r fp; do
  count=$((count+1))
  if [ "$count" -gt "$max_files" ]; then
    echo "" >> "$OUTPUT"
    echo "_Output truncated after $max_files files to keep report size reasonable._" >> "$OUTPUT"
    break
  fi
  # Skip obvious binary types to avoid bloating the report
  case "$(file -b --mime-type "$fp" 2>/dev/null || echo "unknown")" in
    application/zip|application/gzip|application/octet-stream|image/*|audio/*|video/*)
      continue
      ;;
  esac
  emit_file_section "$fp"
done < "$FILES"

# Completion signal
echo "" >> "$OUTPUT"
echo "_LoopAgent finished successfully._" >> "$OUTPUT"
exit 0
        """.format(repo_dir=self.repo_dir, defs="$DEFINES_TMP")

        # Write the script via heredoc and execute it
        write_and_run = "cat > /tmp/analyze_repo.sh <<'SH'\n{}\nSH\nchmod +x /tmp/analyze_repo.sh\nsh /tmp/analyze_repo.sh".format(
            script
        )
        result = runner.execute_command(write_and_run)
        if not result["success"]:
            raise RuntimeError("Failed to write/run analysis script: {}".format(result["output"]))

    def run(self, runner) -> Dict[str, Any]:
        """
        Execute the full analysis loop. Returns dict with success and optional output_md content.
        """
        logger.info("LoopAgent: Installing tooling inside container...")
        self._install_packages(runner)

        logger.info("LoopAgent: Writing and running analysis script...")
        self._write_analysis_script(runner)

        # Verify output exists
        exists = runner.execute_command('test -f "{}" && echo "yes" || echo "no"'.format(self.output_path))
        if not exists["success"]:
            raise RuntimeError("Failed to verify output.md existence: {}".format(exists["output"]))
        if "yes" not in (exists.get("output") or ""):
            raise RuntimeError("output.md was not generated at {}".format(self.output_path))

        # Fetch output markdown
        fetch = runner.execute_command('cat "{}"'.format(self.output_path))
        if not fetch["success"]:
            raise RuntimeError("Failed to read output.md: {}".format(fetch["output"]))

        content = (fetch.get("output") or "").rstrip()
        logger.info("LoopAgent: Analysis complete and output.md captured ({} bytes)".format(len(content.encode("utf-8"))))
        return {"success": True, "output_md": content, "system_prompt": self.get_system_prompt()}


