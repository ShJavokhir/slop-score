#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced SQS Listener for GitHub Repository Analysis
Receives job_id, fetches from Supabase, spins up Docker container, and runs analysis.
"""

import json
import logging
import os
from dotenv import load_dotenv
from sqs_listener import SQSListener
from docker_runner import DockerRunner

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
            # Query jobs table with repository relationship
            response = self.supabase.table('jobs').select(
                '*, repositories(*)'
            ).eq('id', job_id).single().execute()

            if not response.data:
                raise ValueError("Job not found: {}".format(job_id))

            job = response.data
            repo = job.get('repositories')

            if not repo:
                raise ValueError("Repo not found for job: {}".format(job_id))

            logger.info("Fetched job {} with repo URL: {}".format(job_id, repo.get('github_url')))
            return job, repo

        except Exception as e:
            logger.error("Error fetching job from Supabase: {}".format(e))
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

            self.supabase.table('jobs').update(update_data).eq('id', job_id).execute()
            logger.info("Updated job {} status to: {}".format(job_id, status))

        except Exception as e:
            logger.error("Error updating job status: {}".format(e))

    def interactive_command_loop(self, runner):
        """Prompt user for commands to run inside the Docker container"""
        logger.info("Starting interactive Docker command loop")
        print("\nInteractive Docker command shell. Type 'exit' to finish.\n")

        current_dir = "/"  # Start in root directory

        while True:
            try:
                user_input = input("docker> ").strip()
            except EOFError:
                print()  # move to next line for clean prompt exit
                logger.info("EOF received, exiting interactive command loop")
                break
            except KeyboardInterrupt:
                print()  # ensure prompt appears on next line
                logger.info("KeyboardInterrupt received, exiting interactive command loop")
                break

            if not user_input:
                continue

            lowered = user_input.lower()
            if lowered in ('exit', 'quit'):
                logger.info("Exit command received, leaving interactive command loop")
                break

            # Handle cd command specially
            if user_input.startswith('cd '):
                cd_arg = user_input[3:].strip()
                if cd_arg:
                    # Execute cd and capture new directory
                    full_command = "cd {} && pwd".format(cd_arg)
                    try:
                        result = runner.execute_command(full_command)
                        if result['success'] and result['output'].strip():
                            current_dir = result['output'].strip()
                            print("Changed directory to: {}".format(current_dir))
                        else:
                            print("Failed to change directory")
                            if not result['success']:
                                print("Exit code: {}".format(result['exit_code']))
                    except Exception as exc:
                        logger.error("Error executing cd command '{}': {}".format(user_input, exc))
                        print("Error executing command: {}".format(exc))
                continue

            # Execute command in current directory
            full_command = "cd {} && {}".format(current_dir, user_input)
            try:
                result = runner.execute_command(full_command)
            except Exception as exc:
                logger.error("Error executing interactive command '{}': {}".format(user_input, exc))
                print("Error executing command: {}".format(exc))
                continue

            output = (result.get('output') or '').rstrip()
            exit_code = result.get('exit_code')
            success = result.get('success')

            if output:
                print(output)

            if success:
                if not output:
                    print("(Command completed successfully with no output.)")
            else:
                print("Command exited with code {}".format(exit_code if exit_code is not None else "unknown"))

        logger.info("Interactive Docker command loop finished")

    def process_message(self, message):
        """Process a single job message"""
        runner = None
        try:
            # Parse message body
            body = json.loads(message['Body'])
            job_id = body.get('job_id')

            if not job_id:
                logger.error("No job_id found in message")
                return False

            logger.info("Processing job: {}".format(job_id))

            # Fetch job and repo from Supabase
            job, repo = self.fetch_job_and_repo(job_id)
            repo_url = repo.get('github_url')

            # Determine if job is already marked completed
            job_already_completed = job.get('status') == 'completed'
            if job_already_completed:
                logger.info(
                    "Job {} is already completed; continuing to interactive session without changing status"
                    .format(job_id)
                )

            # Check if analysis already exists for this job
            existing_analysis = self.supabase.table('analyses').select('*').eq('job_id', job_id).execute()
            analysis_already_exists = bool(existing_analysis.data)
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
            safe_update('processing', current_step='Initializing')

            # Create Docker runner
            safe_update('processing', current_step='Starting Docker', progress=15)
            runner = DockerRunner()
            runner.create_container()

            # Step 1: Install git
            logger.info("Installing git...")
            safe_update('processing', current_step='Installing git', progress=10)
            result = runner.execute_command('apk add --no-cache git')
            if not result['success']:
                raise Exception("Failed to install git: {}".format(result['output']))

            # Step 2: Clone repository
            logger.info("Cloning repository: {}".format(repo_url))
            safe_update('processing', current_step='Cloning repository', progress=30)
            clone_cmd = 'git clone {} /repo'.format(repo_url)
            result = runner.execute_command(clone_cmd)
            if not result['success']:
                raise Exception("Failed to clone repo: {}".format(result['output']))

            # Provide interactive shell for manual commands
            safe_update('processing', current_step='Awaiting user commands', progress=40)
            self.interactive_command_loop(runner)

            if analysis_already_exists or job_already_completed:
                logger.info(
                    "Skipping automated analysis and database updates for job {} due to existing results"
                    .format(job_id)
                )
                safe_update('completed', progress=100)
                return True

            # Step 2.5: Explore repository structure
            logger.info("Exploring cloned repository...")

            # Show current directory and contents
            logger.info("Checking current directory...")
            pwd_result = runner.execute_command('pwd')
            logger.info("Current directory: {}".format(pwd_result['output'].strip()))

            # List contents of /repo
            logger.info("Listing repository contents...")
            ls_result = runner.execute_command('ls -la /repo')
            logger.info("Repository contents:\n{}".format(ls_result['output']))

            # List root directory for context
            logger.info("Listing root directory...")
            root_ls = runner.execute_command('ls -la /')
            logger.info("Root directory contents:\n{}".format(root_ls['output']))

            # Step 3: Analyze repository structure
            logger.info("Analyzing repository...")
            self.update_job_status(job_id, 'processing', current_step='Analyzing repository structure', progress=60)
            
            # Example analysis commands
            analysis_result = runner.execute_command(
                'cd /repo && find . -type f | wc -l'
            )
            file_count = analysis_result['output'].strip()
            logger.info("Repository has {} files".format(file_count))

            # Step 4: Calculate metrics (placeholder for full analysis)
            self.update_job_status(job_id, 'processing', current_step='Calculating slop score', progress=80)
            
            # Simple placeholder score calculation
            slop_score = 42.0  # Placeholder - would be computed from analysis

            # Step 5: Save results
            logger.info("Saving results...")
            self.update_job_status(job_id, 'processing', current_step='Saving results', progress=95)

            # Create analysis record
            analysis_response = self.supabase.table('analyses').insert({
                'job_id': job_id,
                'repository_id': repo.get('id'),
                'slop_score': slop_score,
                'analyzed_at': 'now()'
            }).execute()

            if analysis_response.data:
                analysis_id = analysis_response.data[0]['id']

                # Add slop notes
                self.supabase.table('slop_notes').insert({
                    'analysis_id': analysis_id,
                    'note': 'Analysis completed - repository structure analyzed'
                }).execute()

                logger.info("Analysis saved with ID: {}".format(analysis_id))

            # Mark job as completed
            self.update_job_status(job_id, 'completed', progress=100)
            logger.info("Job completed successfully: {}".format(job_id))
            return True

        except Exception as e:
            error_msg = str(e)
            logger.error("Job processing failed: {}".format(error_msg))

            # Update job with error
            try:
                self.update_job_status(job_id, 'failed', error={
                    'message': error_msg,
                    'code': 'PROCESSING_ERROR'
                })
            except:
                pass

            return False

        finally:
            # Always cleanup Docker container
            if runner:
                runner.cleanup()


if __name__ == '__main__':
    print("Starting Enhanced SQS Job Listener with Docker")
    print("Press Ctrl+C to stop")
    print("=" * 50)

    listener = SimpleListener()
    listener.listen_for_events(poll_interval=2)
