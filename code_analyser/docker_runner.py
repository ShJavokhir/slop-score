#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Alpine Docker container runner for executing commands in isolation.
Manages container lifecycle: create, execute, cleanup.
"""

import docker
import logging
import os

logger = logging.getLogger(__name__)

class DockerRunner:
    """Manages command execution in Alpine containers"""

    def __init__(self):
        # Ensure attribute exists even if client initialization fails
        self.container = None
        try:
            self.client = self._create_client_with_fallback()
            # Fail fast with a clear error if Docker daemon is unavailable
            self.client.ping()
        except Exception as e:
            logger.error("Docker daemon is not reachable. Ensure Docker Desktop/daemon is running.")
            # Re-raise with clearer context
            raise RuntimeError("Docker daemon is not reachable. Please start Docker and retry.")

    def _create_client_with_fallback(self):
        """
        Create a Docker client trying multiple common endpoints.
        This helps on macOS where the CLI context may use ~/.docker/run/docker.sock
        but Python SDK defaults to /var/run/docker.sock.
        """
        errors = []

        # Collect candidate base URLs to try in order
        candidates = []
        env_url = os.environ.get('DOCKER_HOST')
        if env_url:
            candidates.append(env_url)

        home_sock = os.path.expanduser('~/.docker/run/docker.sock')
        var_run_sock = '/var/run/docker.sock'

        if os.path.exists(home_sock):
            candidates.append('unix://{}'.format(home_sock))
        if os.path.exists(var_run_sock):
            candidates.append('unix:///var/run/docker.sock')

        # Always include from_env() resolution as a fallback
        # We'll represent it with None and handle specially
        candidates.append(None)

        last_error = None
        for base_url in candidates:
            try:
                client = docker.from_env() if base_url is None else docker.DockerClient(base_url=base_url)
                client.ping()
                if base_url:
                    logger.info("Connected to Docker daemon via {}".format(base_url))
                else:
                    logger.info("Connected to Docker daemon via environment configuration")
                return client
            except Exception as e:
                last_error = e
                errors.append((base_url or 'from_env()', str(e)))
                continue

        # If none worked, raise with diagnostic info
        diag = "; ".join(["{} -> {}".format(url, err) for url, err in errors])
        raise RuntimeError("Unable to connect to Docker daemon using candidates: {}"
                           .format(diag))

    def create_container(self):
        """Create and start an Alpine container"""
        try:
            # Pull alpine:latest if not already present
            try:
                self.client.images.get('alpine:latest')
            except docker.errors.ImageNotFound:
                logger.info("Pulling alpine:latest image...")
                self.client.images.pull('alpine:latest')

            # Create container with long sleep to keep it alive
            self.container = self.client.containers.run(
                'alpine:latest',
                command='sleep 3600',
                detach=True,
                stdin_open=True,
                stdout=True,
                stderr=True,
                remove=False
            )
            logger.info("Container created: {}".format(self.container.short_id))
            return self.container
        except Exception as e:
            logger.error("Error creating container: {}".format(e))
            raise

    def execute_command(self, command):
        """Execute a command in the container and return result"""
        if not self.container:
            self.create_container()

        try:
            # Execute command and capture output
            exit_code, output = self.container.exec_run(
                cmd=['sh', '-c', command],
                stdout=True,
                stderr=True
            )

            result = {
                'exit_code': exit_code,
                'output': output.decode('utf-8', errors='replace') if output else '',
                'success': exit_code == 0
            }

            logger.info("Command executed: exit_code={}".format(exit_code))
            return result

        except Exception as e:
            logger.error("Error executing command: {}".format(e))
            raise

    def cleanup(self):
        """Stop and remove container"""
        # Guard against partially constructed objects
        if hasattr(self, 'container') and self.container:
            try:
                self.container.stop(timeout=5)
                self.container.remove(force=True)
                logger.info("Container cleaned up: {}".format(self.container.short_id))
            except Exception as e:
                logger.warning("Error during cleanup: {}".format(e))
            finally:
                self.container = None

    def __del__(self):
        """Ensure cleanup on object destruction"""
        try:
            self.cleanup()
        except Exception:
            # Never raise from destructor
            pass

