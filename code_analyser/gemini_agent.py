#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GeminiToolAgent: LLM-driven integrity analyzer that can run shell commands
inside the Docker container via DockerRunner. The agent reads its system prompt
from code_analyser/prompts/hackathon_integrity.md (not hardcoded) and follows
an iterative tool-using loop until it produces a final Markdown report.
"""

import json
import os
import logging
from typing import Dict, Any, Optional, List
from rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

class GeminiToolAgent:
    """
    LLM agent using Gemini models with a simple, reliable tool protocol:
    - When the model needs to run a command, it emits a single JSON object:
      {"tool": "run_command", "command": "...", "cwd": "/repo"}
    - The agent executes the command via DockerRunner and returns a JSON tool-result:
      {"tool_result": "run_command", "exit_code": 0, "stdout": "...", "stderr": "...", "truncated": false}
    - The model continues planning and tool-using until it returns the final report.

    Finalization rule:
    - The conversation ends when the model returns a message starting with
      "# Project Integrity Analysis Report" (Markdown).
    """

    def __init__(
        self,
        repo_dir: str = "/repo",
        prompt_path: Optional[str] = None,
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
        max_steps: int = 25,
        max_output_chars: int = 200_000,
        requests_per_minute: Optional[int] = None,
        max_retries: int = 3,
    ):
        self.repo_dir = repo_dir
        self.prompt_path = prompt_path or os.path.join(
            os.path.dirname(__file__), "prompts", "hackathon_integrity.md"
        )
        self.model_name = model_name or os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.max_steps = max_steps
        self.max_output_chars = max_output_chars
        self.max_retries = max_retries

        # Configure rate limiter
        rpm = requests_per_minute or int(os.getenv("GEMINI_RPM", "10"))
        self.rate_limiter = RateLimiter(requests_per_minute=rpm)

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is required in environment or passed explicitly")

        # Lazy import to avoid linter/import issues when not used
        try:
            import google.generativeai as genai  # type: ignore
        except Exception as e:
            raise ImportError(
                "google-generativeai is not installed or failed to import: {}".format(e)
            )

        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)
        self.chat = self.model.start_chat(history=[])

        self.system_prompt = self._read_system_prompt()

        logger.info("GeminiToolAgent initialized with rate limit: {} RPM, max retries: {}".format(
            rpm, max_retries))

    def _read_system_prompt(self) -> str:
        try:
            with open(self.prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            logger.error("Failed to read system prompt at {}: {}".format(self.prompt_path, e))
            raise

    def _is_final_report(self, text: str) -> bool:
        return text.strip().startswith("# Project Integrity Analysis Report")

    def _truncate(self, s: str, limit: int) -> str:
        if len(s) <= limit:
            return s
        tail_note = "\n... [truncated: {} chars omitted]".format(len(s) - limit)
        return s[:limit] + tail_note

    def _send_message_with_rate_limit(self, message: str):
        """
        Send a message to the Gemini API with rate limiting and retry logic.

        Args:
            message: The message to send

        Returns:
            The API response

        Raises:
            Exception: If all retries fail
        """
        logger.info("=== GEMINI API REQUEST ===")
        logger.info("Sending message to Gemini API (length: {} chars)".format(len(message)))

        # Log the actual message content (truncated for readability)
        truncated_msg = message[:1000] + "..." if len(message) > 1000 else message
        logger.info("Message content (truncated): {}".format(truncated_msg))

        def _send_message():
            logger.debug("Making actual API call to Gemini...")
            return self.chat.send_message(message)

        try:
            response = self.rate_limiter.call_with_retry(
                _send_message,
                max_retries=self.max_retries,
                retry_on_exceptions=(Exception,)
            )

            logger.info("=== GEMINI API RESPONSE ===")
            response_text = getattr(response, "text", None) or ""
            logger.info("Received response from Gemini API (length: {} chars)".format(len(response_text)))

            # Log response content (truncated for readability)
            truncated_response = response_text[:1000] + "..." if len(response_text) > 1000 else response_text
            logger.info("Response content (truncated): {}".format(truncated_response))

            return response
        except Exception as e:
            logger.error("=== GEMINI API ERROR ===")
            logger.error("Failed to send message to Gemini API after {} retries: {}".format(self.max_retries, str(e)))
            raise

    def _maybe_parse_tool_request(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Try to parse a single-line or fenced JSON tool request emitted by the model.
        The expected shape is: {"tool": "run_command", "command": "...", "cwd": "/repo"}
        """
        candidate = text.strip()
        # Strip common code fencing
        if candidate.startswith("```"):
            candidate = candidate.strip("` \n")
            # After stripping backticks, candidate may still include a lang tag
            if "\n" in candidate:
                candidate = candidate.split("\n", 1)[1]
        try:
            obj = json.loads(candidate)
            if isinstance(obj, dict) and obj.get("tool") == "run_command" and "command" in obj:
                return obj
        except Exception:
            pass
        return None

    def _execute_tool(self, runner, request: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("=== TOOL EXECUTION REQUEST ===")
        logger.info("Tool request: {}".format(json.dumps(request, indent=2)))

        command = request.get("command", "")
        cwd = request.get("cwd") or self.repo_dir

        if not isinstance(command, str) or not command.strip():
            logger.warning("Invalid command in tool request: '{}'".format(command))
            return {
                "tool_result": "run_command",
                "exit_code": -1,
                "stdout": "",
                "stderr": "Invalid command",
                "truncated": False,
            }

        # Ensure we run inside the requested directory
        full_cmd = 'cd "{}" && {}'.format(cwd.replace('"', '\\"'), command)
        logger.info("Executing command in Docker container:")
        logger.info("  Working directory: {}".format(cwd))
        logger.info("  Command: {}".format(command))
        logger.info("  Full command: {}".format(full_cmd))

        result = runner.execute_command(full_cmd)
        stdout = self._truncate(result.get("output") or "", self.max_output_chars)
        exit_code = result.get("exit_code", 1)

        logger.info("=== TOOL EXECUTION RESULT ===")
        logger.info("Command execution result:")
        logger.info("  Exit code: {}".format(exit_code))
        logger.info("  Success: {}".format(result.get("success", False)))
        logger.info("  Output length: {} chars".format(len(stdout)))
        logger.info("  Truncated: {}".format(len(stdout) >= self.max_output_chars))

        # Log truncated output for debugging
        truncated_output = stdout[:500] + "..." if len(stdout) > 500 else stdout
        logger.info("Output (truncated): {}".format(repr(truncated_output)))

        tool_result = {
            "tool_result": "run_command",
            "exit_code": exit_code,
            "stdout": stdout,
            "stderr": "",
            "truncated": len(stdout) >= self.max_output_chars,
        }

        logger.info("Tool result JSON: {}".format(json.dumps(tool_result, indent=2)))
        return tool_result

    def run(self, runner) -> Dict[str, Any]:
        """
        Runs the LLM-driven loop. Returns {"success": bool, "output_md": str, "system_prompt": str}
        """
        intro = (
            self.system_prompt
            + "\n\n"
            + "Tool usage protocol:\n"
            + "- When you need to run a shell command in the analysis container, output ONLY a JSON object on a single line:\n"
            + '  {\"tool\": \"run_command\", \"command\": \"<non-interactive shell command>\", \"cwd\": \"/repo\"}\n'
            + "- Do not include any other text with the tool request.\n"
            + "- After receiving tool results, continue your analysis. Repeat as needed.\n"
            + "- When you are finished, output the final report in Markdown starting with:\n"
            + "  # Project Integrity Analysis Report\n"
        )

        # Prime the chat
        logger.info("Priming Gemini chat with system prompt...")
        logger.info("System prompt length: {} chars".format(len(self.system_prompt)))
        logger.info("Tool protocol instructions length: {} chars".format(len(intro) - len(self.system_prompt)))
        logger.info("Total priming message length: {} chars".format(len(intro)))
        self._send_message_with_rate_limit(intro)

        output_md = ""
        for step in range(1, self.max_steps + 1):
            logger.info("Step {}/{}: Requesting next analysis step...".format(step, self.max_steps))
            response = self._send_message_with_rate_limit("Proceed with the integrity analysis.")
            text = (getattr(response, "text", None) or "").strip()
            if not text:
                # If the library returns structured parts without .text, try to stringify
                try:
                    text = str(response)
                except Exception:
                    text = ""

            if not text:
                logger.warning("Empty model response at step {}".format(step))
                continue

            # Check for final report
            if self._is_final_report(text):
                logger.info("=== FINAL REPORT DETECTED ===")
                logger.info("Final report detected at step {}".format(step))
                logger.info("Report starts with: {}".format(text[:200] + "..." if len(text) > 200 else text))
                output_md = text
                break

            # Otherwise, check for a tool call
            tool_req = self._maybe_parse_tool_request(text)
            if tool_req:
                logger.info("=== TOOL REQUEST DETECTED ===")
                logger.info("Tool request detected at step {}: {}".format(step, tool_req.get('command', '')))
                tool_result = self._execute_tool(runner, tool_req)
                # Return tool result as compact JSON so the model can parse it deterministically
                tool_result_json = json.dumps(tool_result, ensure_ascii=False)
                logger.info("Sending tool result back to Gemini (length: {} chars)".format(len(tool_result_json)))
                self._send_message_with_rate_limit(tool_result_json)
                continue

            # If neither tool nor final report, remind the model of the protocol briefly
            logger.info("=== PROTOCOL REMINDER ===")
            logger.info("Neither tool nor final report detected at step {}, sending reminder".format(step))
            logger.info("Response content that triggered reminder: {}".format(text[:500] + "..." if len(text) > 500 else text))
            self._send_message_with_rate_limit(
                "Reminder: Use the tool protocol JSON to run commands, or produce the final Markdown report when ready."
            )

        if not output_md:
            # As a fallback, ask once more for the report
            logger.info("=== FALLBACK REPORT REQUEST ===")
            logger.info("No final report after {} steps, requesting fallback report...".format(self.max_steps))
            response = self._send_message_with_rate_limit(
                "Please produce the final Markdown report now, starting with '# Project Integrity Analysis Report'."
            )
            maybe = (getattr(response, "text", None) or "").strip()
            if self._is_final_report(maybe):
                logger.info("Fallback report accepted - final report received")
                output_md = maybe
            else:
                logger.warning("Fallback report was not in correct format")
                logger.warning("Fallback response content: {}".format(maybe[:500] + "..." if len(maybe) > 500 else maybe))

        if not output_md:
            return {
                "success": False,
                "output_md": "",
                "system_prompt": self.system_prompt,
                "error": "Agent did not produce a final report within step limit",
            }

        return {"success": True, "output_md": output_md, "system_prompt": self.system_prompt}


