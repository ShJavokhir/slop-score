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
        self.system_prompt = (
            "You are LoopAgent, an autonomous analysis agent with full access to standard Unix commands. "
            "Your job is to comprehensively learn the entire repository at {repo_dir} and write a high-quality "
            "Markdown report to {output_md} named output.md. You may invoke any safe, non-interactive Unix command, "
            "including but not limited to: find, grep, ripgrep, awk, sed, xargs, tree, wc, file, jq, python3, and shell "
            "builtins. Prefer robust, portable commands and handle edge cases like binaries, large files, and vendored "
            "directories. Summarize per-file contents (type, size, key symbols/definitions), provide a language breakdown, "
            "and render a filtered tree view. Use fenced code blocks for listings. When your report is fully written, "
            "signal completion by invoking the EXIT tool (a no-op placeholder that indicates termination of the agent loop)."
        ).format(repo_dir=self.repo_dir, output_md=self.output_path)

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


