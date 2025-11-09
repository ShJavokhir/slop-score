#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced SQS Listener for GitHub Repository Analysis
Receives job_id, fetches from Supabase, spins up Docker container, and runs analysis.
"""

import json
import logging
import os
import time
from dotenv import load_dotenv
from sqs_listener import SQSListener
from docker_runner import DockerRunner
from loop_agent import LoopAgent

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configure logging
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
log_file = os.path.join(os.path.dirname(__file__), 'slop_score.log')

# Create logger
logger = logging.getLogger(__name__)
logger.setLevel(getattr(logging, log_level, logging.INFO))

# Remove any existing handlers to avoid duplicates
for handler in logger.handlers[:]:
    logger.removeHandler(handler)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(getattr(logging, log_level, logging.INFO))
console_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
console_handler.setFormatter(console_formatter)

# File handler - continuous logging
file_handler = logging.FileHandler(log_file, mode='a', encoding='utf-8')
file_handler.setLevel(logging.DEBUG)  # File gets all logs regardless of console level
file_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s')
file_handler.setFormatter(file_formatter)

# Add handlers to logger
logger.addHandler(console_handler)
logger.addHandler(file_handler)

# Also configure root logger for other modules
root_logger = logging.getLogger()
if not root_logger.handlers:
    root_logger.setLevel(logging.DEBUG)
    root_logger.addHandler(file_handler)

# Import Supabase client
try:
    from supabase import create_client
except ImportError:
    logger.error("Supabase client not installed. Run: pip install supabase")
    raise


class SimpleListener(SQSListener):
    """Enhanced listener that fetches jobs from Supabase and processes them in Docker"""

    def __init__(self):
        super().__init__()
        self._init_supabase()

    def _init_supabase(self):
        """Initialize Supabase client"""
        try:
            url = os.getenv('SUPABASE_URL')
            key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

            if not url or not key:
                raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")

            self.supabase = create_client(url, key)
            logger.info("Supabase client initialized")
        except Exception as e:
            logger.error("Failed to initialize Supabase: {}".format(e))
            raise

    def fetch_job_and_repo(self, job_id):
        """Fetch job and associated repo from Supabase"""
        try:
            logger.info("Querying Supabase for job {} and repository data...".format(job_id))
            # Query jobs table with repository relationship
            response = self.supabase.table('jobs').select(
                '*, repositories(*)'
            ).eq('id', job_id).single().execute()

            logger.debug("Supabase query response received - has_data: {}".format(bool(response.data)))

            if not response.data:
                logger.error("No data returned from Supabase for job {}".format(job_id))
                raise ValueError("Job not found: {}".format(job_id))

            job = response.data
            repo = job.get('repositories')

            logger.info("Job data retrieved - status: {}, created_at: {}".format(
                job.get('status'), job.get('created_at')))

            if not repo:
                logger.error("No repository relationship found in job data for job {}".format(job_id))
                raise ValueError("Repo not found for job: {}".format(job_id))

            logger.info("Repository data retrieved - URL: {}, ID: {}".format(
                repo.get('github_url'), repo.get('id')))
            return job, repo

        except Exception as e:
            logger.error("Error fetching job {} from Supabase: {} ({})".format(job_id, e, type(e).__name__))
            raise

    def update_job_status(self, job_id, status, current_step=None, progress=None, error=None):
        """Update job status in Supabase"""
        try:
            update_data = {
                'status': status,
                'updated_at': 'now()'
            }

            if current_step:
                update_data['current_step'] = current_step
            if progress is not None:
                update_data['progress'] = progress
            if error:
                update_data['error_message'] = error.get('message', '')
                update_data['error_code'] = error.get('code', '')

            logger.info("Updating job {} status to '{}' (step: '{}', progress: {})".format(
                job_id, status, current_step, progress))
            logger.debug("Update payload: {}".format(update_data))

            response = self.supabase.table('jobs').update(update_data).eq('id', job_id).execute()
            logger.info("Job {} status update completed - affected rows: {}".format(
                job_id, len(response.data) if response.data else 0))

        except Exception as e:
            logger.error("Error updating job {} status to '{}': {} ({})".format(
                job_id, status, e, type(e).__name__))

    def _chunk_text(self, text, chunk_size=8000):
        """Yield fixed-size chunks from text for safe DB insertion."""
        for i in range(0, len(text), chunk_size):
            yield text[i:i+chunk_size]

    def persist_output_document(self, job_id, repository_id, analysis_id, output_md, system_prompt):
        """
        Save output.md content into Supabase.
        Primary: insert into analysis_documents.
        Fallback: chunk into slop_notes if analysis_id is available.
        """
        logger.info("Starting output document persistence - job: {}, analysis: {}, content_length: {}".format(
            job_id, analysis_id, len(output_md or '')))

        # Try primary table
        try:
            logger.info("Attempting to save to analysis_documents table...")
            payload = {
                'job_id': job_id,
                'repository_id': repository_id,
                'document_type': 'output_md',
                'content': output_md,
                'system_prompt': system_prompt,
                'created_at': 'now()'
            }
            if analysis_id:
                payload['analysis_id'] = analysis_id

            logger.debug("analysis_documents payload size: {} chars".format(len(str(payload))))
            response = self.supabase.table('analysis_documents').insert(payload).execute()
            logger.info("Successfully saved output.md to analysis_documents - response: {}".format(
                len(response.data) if response.data else 'no data'))
            return True
        except Exception as e:
            logger.warning("analysis_documents insert failed ({}). Falling back to slop_notes if possible.".format(e))

        # Fallback to slop_notes if we have an analysis_id
        if not analysis_id:
            logger.warning("Cannot fallback to slop_notes: missing analysis_id")
            return False

        try:
            logger.info("Falling back to slop_notes - creating {} chunks".format(
                len(list(self._chunk_text(output_md or '', 8000))) or 1))

            # Store system prompt first
            logger.debug("Inserting system prompt note...")
            self.supabase.table('slop_notes').insert({
                'analysis_id': analysis_id,
                'note': 'LoopAgent system prompt: {}'.format(system_prompt or '')
            }).execute()

            chunks = list(self._chunk_text(output_md or '', 8000))
            total = len(chunks)
            if total == 0:
                chunks = ['(empty output.md)']
                total = 1

            logger.info("Inserting {} output.md chunks to slop_notes...".format(total))
            for idx, chunk in enumerate(chunks, start=1):
                chunk_payload = {
                    'analysis_id': analysis_id,
                    'note': '[output.md chunk {}/{}]\n{}'.format(idx, total, chunk)
                }
                self.supabase.table('slop_notes').insert(chunk_payload).execute()
                logger.debug("Inserted chunk {}/{}".format(idx, total))

            logger.info("Successfully saved output.md in {} slop_notes chunks".format(total))
            return True
        except Exception as e:
            logger.error("Failed to persist output.md via slop_notes: {} ({})".format(e, type(e).__name__))
            return False

    def interactive_command_loop(self, runner):
        """Prompt user for commands to run inside the Docker container"""
        logger.info("Starting interactive Docker command loop")
        print("\nInteractive Docker command shell. Type 'exit' to finish.\n")

        current_dir = "/"  # Start in root directory
        command_count = 0

        while True:
            try:
                user_input = input("docker> ").strip()
            except EOFError:
                print()  # move to next line for clean prompt exit
                logger.info("EOF received, exiting interactive command loop (total commands: {})".format(command_count))
                break
            except KeyboardInterrupt:
                print()  # ensure prompt appears on next line
                logger.info("KeyboardInterrupt received, exiting interactive command loop (total commands: {})".format(command_count))
                break

            if not user_input:
                continue

            command_count += 1
            lowered = user_input.lower()
            if lowered in ('exit', 'quit'):
                logger.info("Exit command received, leaving interactive command loop (total commands: {})".format(command_count))
                break

            logger.info("Executing interactive command #{}: '{}' (current dir: {})".format(command_count, user_input, current_dir))

            # Handle cd command specially
            if user_input.startswith('cd '):
                cd_arg = user_input[3:].strip()
                if cd_arg:
                    # Execute cd and capture new directory
                    full_command = "cd {} && pwd".format(cd_arg)
                    logger.debug("Executing cd command: '{}'".format(full_command))
                    try:
                        result = runner.execute_command(full_command)
                        if result['success'] and result['output'].strip():
                            old_dir = current_dir
                            current_dir = result['output'].strip()
                            logger.info("Directory changed from '{}' to '{}'".format(old_dir, current_dir))
                            print("Changed directory to: {}".format(current_dir))
                        else:
                            logger.warning("Failed to change directory - success: {}, exit_code: {}".format(
                                result['success'], result.get('exit_code')))
                            print("Failed to change directory")
                            if not result['success']:
                                print("Exit code: {}".format(result['exit_code']))
                    except Exception as exc:
                        logger.error("Error executing cd command '{}': {}".format(user_input, exc))
                        print("Error executing command: {}".format(exc))
                else:
                    logger.warning("Empty cd argument provided")
                continue

            # Execute command in current directory
            full_command = "cd {} && {}".format(current_dir, user_input)
            logger.debug("Executing full command: '{}'".format(full_command))
            try:
                result = runner.execute_command(full_command)
            except Exception as exc:
                logger.error("Error executing interactive command '{}': {}".format(user_input, exc))
                print("Error executing command: {}".format(exc))
                continue

            output = (result.get('output') or '').rstrip()
            exit_code = result.get('exit_code')
            success = result.get('success')

            logger.info("Command result - success: {}, exit_code: {}, output_length: {}".format(
                success, exit_code, len(output)))

            if output:
                print(output)

            if success:
                if not output:
                    print("(Command completed successfully with no output.)")
            else:
                print("Command exited with code {}".format(exit_code if exit_code is not None else "unknown"))

        logger.info("Interactive Docker command loop finished (total commands executed: {})".format(command_count))

    def process_message(self, message):
        """Process a single job message"""
        runner = None
        try:
            # Parse message body
            logger.info("Received SQS message, parsing body...")
            body = json.loads(message['Body'])
            logger.debug("Message body parsed: {}".format(json.dumps(body, indent=2)))

            job_id = body.get('job_id')
            logger.info("Extracted job_id from message: {}".format(job_id))

            if not job_id:
                logger.error("No job_id found in message body: {}".format(body))
                return False

            logger.info("Starting processing for job: {}".format(job_id))

            # Fetch job and repo from Supabase
            logger.info("Fetching job and repository data from Supabase...")
            job, repo = self.fetch_job_and_repo(job_id)
            repo_url = repo.get('github_url')
            repo_id = repo.get('id')
            logger.info("Job details - ID: {}, Status: {}, Repo: {} (ID: {})".format(
                job_id, job.get('status'), repo_url, repo_id))

            # Determine if job is already marked completed
            job_already_completed = job.get('status') == 'completed'
            logger.info("Job completion status check - Already completed: {}".format(job_already_completed))
            if job_already_completed:
                logger.info(
                    "Job {} is already completed; continuing to interactive session without changing status"
                    .format(job_id)
                )

            # Check if analysis already exists for this job
            logger.info("Checking for existing analysis in database...")
            existing_analysis = self.supabase.table('analyses').select('*').eq('job_id', job_id).execute()
            analysis_already_exists = bool(existing_analysis.data)
            logger.info("Analysis existence check - Analysis exists: {}, Count: {}".format(
                analysis_already_exists, len(existing_analysis.data) if existing_analysis.data else 0))
            if analysis_already_exists:
                logger.info(
                    "Analysis already exists for job {}; automated analysis steps will be skipped"
                    .format(job_id)
                )

            def safe_update(status, current_step=None, progress=None, error=None):
                """Update job status only when the job is not already marked completed."""
                if job_already_completed:
                    return
                self.update_job_status(job_id, status, current_step=current_step, progress=progress, error=error)

            # Update status to processing
            logger.info("Initializing job processing...")
            start_time = time.time()
            safe_update('processing', current_step='Initializing')

            # Create Docker runner
            logger.info("Creating Docker container...")
            docker_start = time.time()
            safe_update('processing', current_step='Starting Docker', progress=15)
            runner = DockerRunner()
            runner.create_container()
            logger.info("Docker container created in {:.2f}s".format(time.time() - docker_start))

            # Step 1: Install git
            logger.info("Installing git in Docker container...")
            git_start = time.time()
            safe_update('processing', current_step='Installing git', progress=10)
            result = runner.execute_command('apk add --no-cache git')
            git_install_time = time.time() - git_start
            logger.info("Git installation completed in {:.2f}s, success: {}".format(git_install_time, result['success']))
            if not result['success']:
                logger.error("Git installation failed - exit code: {}, output: {}".format(
                    result.get('exit_code'), result.get('output', '')))
                raise Exception("Failed to install git: {}".format(result['output']))

            # Step 2: Clone repository
            logger.info("Cloning repository: {} into /repo".format(repo_url))
            clone_start = time.time()
            safe_update('processing', current_step='Cloning repository', progress=30)
            clone_cmd = 'git clone {} /repo'.format(repo_url)
            result = runner.execute_command(clone_cmd)
            clone_time = time.time() - clone_start
            logger.info("Repository cloning completed in {:.2f}s, success: {}".format(clone_time, result['success']))
            if not result['success']:
                logger.error("Repository cloning failed - exit code: {}, output: {}".format(
                    result.get('exit_code'), result.get('output', '')))
                raise Exception("Failed to clone repo: {}".format(result['output']))

            # Optional interactive shell (disabled by default)
            if os.getenv('ENABLE_INTERACTIVE_SHELL', '').lower() in ('1', 'true', 'yes', 'y'):
                safe_update('processing', current_step='Awaiting user commands', progress=40)
                self.interactive_command_loop(runner)

            # Run automated agent to generate output.md (Gemini or fallback LoopAgent)
            logger.info("Starting analysis agent execution...")
            agent_start = time.time()
            safe_update('processing', current_step='Running analysis agent', progress=50)
            use_gemini = os.getenv('USE_GEMINI_AGENT', '').lower() in ('1', 'true', 'yes', 'y')
            logger.info("Agent configuration - Use Gemini: {}, Analysis exists: {}".format(use_gemini, analysis_already_exists))

            agent_result = {}
            if not analysis_already_exists:
                if use_gemini:
                    logger.info("Attempting to use Gemini agent...")
                    try:
                        from gemini_agent import GeminiToolAgent
                        logger.info("Initializing GeminiToolAgent with model: {}".format(os.getenv('GEMINI_MODEL')))
                        gemini_agent = GeminiToolAgent(
                            repo_dir="/repo",
                            model_name=os.getenv('GEMINI_MODEL') or None,
                            api_key=os.getenv('GEMINI_API_KEY') or None,
                            requests_per_minute=int(os.getenv('GEMINI_RPM', '10')),
                            max_retries=int(os.getenv('GEMINI_MAX_RETRIES', '3')),
                        )
                        logger.info("Running Gemini agent...")
                        agent_result = gemini_agent.run(runner)
                        logger.info("Gemini agent completed successfully")
                    except Exception as gemini_err:
                        logger.error("Gemini agent failed ({}). Falling back to LoopAgent.".format(gemini_err))
                        logger.info("Initializing LoopAgent as fallback...")
                        loop_agent = LoopAgent(repo_dir="/repo")
                        agent_result = loop_agent.run(runner)
                        logger.info("LoopAgent fallback completed")
                else:
                    logger.info("Using LoopAgent (Gemini not enabled)...")
                    loop_agent = LoopAgent(repo_dir="/repo")
                    agent_result = loop_agent.run(runner)
                    logger.info("LoopAgent completed successfully")
            else:
                logger.info("Skipping agent execution - analysis already exists")

            agent_time = time.time() - agent_start
            output_md = agent_result.get('output_md') or ''
            system_prompt = agent_result.get('system_prompt') or ''
            logger.info("Agent execution completed in {:.2f}s - output_md length: {}, system_prompt length: {}".format(
                agent_time, len(output_md), len(system_prompt)))

            # Step 2.5: Explore repository structure
            logger.info("Exploring cloned repository structure...")
            explore_start = time.time()

            # Show current directory and contents
            logger.info("Checking current working directory...")
            pwd_result = runner.execute_command('pwd')
            current_dir = pwd_result['output'].strip()
            logger.info("Current directory: {} (success: {})".format(current_dir, pwd_result['success']))

            # List contents of /repo
            logger.info("Listing repository contents (/repo)...")
            ls_result = runner.execute_command('ls -la /repo')
            repo_contents = ls_result['output']
            logger.info("Repository contents listing completed (success: {}, length: {} chars)".format(
                ls_result['success'], len(repo_contents)))
            logger.debug("Repository contents:\n{}".format(repo_contents))

            # List root directory for context
            logger.info("Listing root directory (/) for context...")
            root_ls = runner.execute_command('ls -la /')
            root_contents = root_ls['output']
            logger.info("Root directory contents listing completed (success: {}, length: {} chars)".format(
                root_ls['success'], len(root_contents)))
            logger.debug("Root directory contents:\n{}".format(root_contents))

            explore_time = time.time() - explore_start
            logger.info("Repository exploration completed in {:.2f}s".format(explore_time))

            # Step 3: Analyze repository structure
            logger.info("Starting repository analysis...")
            analysis_start = time.time()
            safe_update('processing', current_step='Analyzing repository structure', progress=60)

            # Example analysis commands
            logger.info("Counting files in repository...")
            analysis_result = runner.execute_command(
                'cd /repo && find . -type f | wc -l'
            )
            file_count = analysis_result['output'].strip()
            logger.info("Repository analysis completed - file count: {} (success: {})".format(
                file_count, analysis_result['success']))
            analysis_time = time.time() - analysis_start
            logger.info("Repository analysis phase completed in {:.2f}s".format(analysis_time))

            # Step 4: Calculate metrics (placeholder for full analysis)
            self.update_job_status(job_id, 'processing', current_step='Calculating slop score', progress=80)
            
            # Simple placeholder score calculation
            slop_score = 42.0  # Placeholder - would be computed from analysis

            # Step 5: Save results
            logger.info("Starting results saving phase...")
            save_start = time.time()
            safe_update('processing', current_step='Saving results', progress=95)

            # Use existing analysis if present; otherwise create a new one
            logger.info("Determining analysis record to use...")
            analysis_id = None
            if analysis_already_exists and existing_analysis.data:
                analysis_id = existing_analysis.data[0].get('id')
                logger.info("Using existing analysis ID: {}".format(analysis_id))
            else:
                logger.info("Creating new analysis record in database...")
                analysis_payload = {
                    'job_id': job_id,
                    'repository_id': repo_id,
                    'slop_score': slop_score,
                    'analyzed_at': 'now()'
                }
                logger.debug("Analysis payload: {}".format(analysis_payload))
                analysis_response = self.supabase.table('analyses').insert(analysis_payload).execute()
                if analysis_response.data:
                    analysis_id = analysis_response.data[0]['id']
                    logger.info("Created new analysis with ID: {} (response: {})".format(
                        analysis_id, len(analysis_response.data)))
                else:
                    logger.warning("Analysis creation returned no data")

            # Add a summary note
            if analysis_id:
                logger.info("Adding summary note to analysis...")
                note_payload = {
                    'analysis_id': analysis_id,
                    'note': 'Analysis completed - repository structure analyzed'
                }
                logger.debug("Note payload: {}".format(note_payload))
                self.supabase.table('slop_notes').insert(note_payload).execute()
                logger.info("Summary note added to analysis")

            # Persist the generated output.md into Supabase (robust with fallback)
            logger.info("Persisting output.md document...")
            persist_result = self.persist_output_document(
                job_id=job_id,
                repository_id=repo_id,
                analysis_id=analysis_id,
                output_md=output_md,
                system_prompt=system_prompt
            )
            logger.info("Output document persistence result: {}".format(persist_result))

            save_time = time.time() - save_start
            logger.info("Results saving completed in {:.2f}s".format(save_time))

            # Mark job as completed
            logger.info("Marking job as completed...")
            safe_update('completed', progress=100)

            total_time = time.time() - start_time
            logger.info("Job completed successfully: {} (total time: {:.2f}s)".format(job_id, total_time))
            return True

        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            logger.error("Job processing failed for job {}: {} ({})".format(job_id, error_msg, error_type))
            logger.error("Exception traceback:", exc_info=True)

            # Log current processing state for debugging
            logger.error("Error occurred during job processing - current state: job_id={}, repo_url={}, runner_exists={}".format(
                job_id, repo.get('github_url') if 'repo' in locals() else 'unknown',
                runner is not None))

            # Update job with error
            try:
                logger.info("Attempting to update job status to failed...")
                self.update_job_status(job_id, 'failed', error={
                    'message': error_msg,
                    'code': 'PROCESSING_ERROR',
                    'type': error_type
                })
                logger.info("Job status updated to failed")
            except Exception as update_error:
                logger.error("Failed to update job status to failed: {}".format(update_error))

            return False

        finally:
            # Always cleanup Docker container
            if runner:
                logger.info("Cleaning up Docker container for job {}".format(job_id))
                try:
                    runner.cleanup()
                    logger.info("Docker container cleanup completed")
                except Exception as cleanup_error:
                    logger.error("Docker container cleanup failed: {}".format(cleanup_error))
            else:
                logger.info("No Docker container to cleanup for job {}".format(job_id))


if __name__ == '__main__':
    print("Starting Enhanced SQS Job Listener with Docker")
    print("Press Ctrl+C to stop")
    print("=" * 50)

    listener = SimpleListener()
    listener.listen_for_events(poll_interval=2)
