#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rate Limiter for API calls with exponential backoff retry logic.
"""

import time
import threading
import logging
from typing import Optional, Callable, Any
import random

logger = logging.getLogger(__name__)

class RateLimiter:
    """Thread-safe rate limiter with configurable limits and exponential backoff."""

    def __init__(
        self,
        requests_per_minute: int = 10,
        burst_limit: Optional[int] = None,
        min_retry_delay: float = 1.0,
        max_retry_delay: float = 300.0,
        backoff_factor: float = 2.0,
        jitter: bool = True
    ):
        """
        Initialize rate limiter.

        Args:
            requests_per_minute: Maximum requests per minute
            burst_limit: Maximum burst requests (defaults to requests_per_minute)
            min_retry_delay: Minimum delay between retries (seconds)
            max_retry_delay: Maximum delay between retries (seconds)
            backoff_factor: Exponential backoff multiplier
            jitter: Add random jitter to delays to avoid thundering herd
        """
        self.requests_per_minute = requests_per_minute
        self.burst_limit = burst_limit or requests_per_minute
        self.min_retry_delay = min_retry_delay
        self.max_retry_delay = max_retry_delay
        self.backoff_factor = backoff_factor
        self.jitter = jitter

        # Calculate interval between requests
        self.interval = 60.0 / requests_per_minute

        # Thread-safe tracking
        self._lock = threading.Lock()
        self._request_times = []
        self._last_request_time = 0.0

        logger.info("RateLimiter initialized: {} requests/min, burst={}, interval={:.2f}s".format(
            requests_per_minute, self.burst_limit, self.interval))

    def _cleanup_old_requests(self):
        """Remove requests older than 1 minute from tracking."""
        cutoff = time.time() - 60.0
        self._request_times = [t for t in self._request_times if t > cutoff]

    def _wait_for_slot(self):
        """Wait until a request slot is available."""
        while True:
            with self._lock:
                self._cleanup_old_requests()
                now = time.time()

                # Check if we can make a request
                if len(self._request_times) < self.burst_limit:
                    # Check timing constraint
                    if not self._request_times or (now - self._last_request_time) >= self.interval:
                        self._request_times.append(now)
                        self._last_request_time = now
                        return

                # Calculate wait time
                if self._request_times:
                    oldest_allowed = self._request_times[0] + 60.0
                    wait_time = max(0, oldest_allowed - now)
                else:
                    wait_time = self.interval - (now - self._last_request_time)
                    wait_time = max(0, wait_time)

                if wait_time > 0:
                    logger.debug("Rate limit: waiting {:.2f}s for slot".format(wait_time))
                    time.sleep(wait_time)
                else:
                    # Small delay to prevent tight loops
                    time.sleep(0.01)

    def _calculate_retry_delay(self, attempt: int) -> float:
        """Calculate exponential backoff delay for retries."""
        delay = self.min_retry_delay * (self.backoff_factor ** attempt)

        # Add jitter to prevent thundering herd
        if self.jitter:
            delay *= (0.5 + random.random() * 0.5)  # 0.5x to 1.0x

        return min(delay, self.max_retry_delay)

    def call_with_retry(
        self,
        func: Callable,
        *args,
        max_retries: int = 3,
        retry_on_exceptions: tuple = (Exception,),
        **kwargs
    ) -> Any:
        """
        Call a function with rate limiting and retry logic.

        Args:
            func: Function to call
            *args: Positional arguments for func
            max_retries: Maximum number of retries
            retry_on_exceptions: Exception types to retry on
            **kwargs: Keyword arguments for func

        Returns:
            Result of the function call

        Raises:
            The last exception encountered if all retries fail
        """
        last_exception = None

        for attempt in range(max_retries + 1):
            try:
                # Wait for rate limit slot
                self._wait_for_slot()

                logger.debug("Attempting call (attempt {}/{})".format(attempt + 1, max_retries + 1))
                result = func(*args, **kwargs)
                return result

            except retry_on_exceptions as e:
                last_exception = e
                logger.warning("Call failed (attempt {}/{}): {} ({})".format(
                    attempt + 1, max_retries + 1, e, type(e).__name__))

                # Check if this is a rate limit error (429)
                is_rate_limit = getattr(e, 'code', None) == 429 or '429' in str(e) or 'rate limit' in str(e).lower()

                if attempt < max_retries:
                    if is_rate_limit:
                        # Use longer delay for rate limits
                        delay = self._calculate_retry_delay(attempt)
                        logger.info("Rate limit detected, waiting {:.2f}s before retry".format(delay))
                        time.sleep(delay)
                    else:
                        # Shorter delay for other errors
                        delay = self.min_retry_delay * (attempt + 1)
                        logger.info("Non-rate-limit error, waiting {:.2f}s before retry".format(delay))
                        time.sleep(delay)
                else:
                    logger.error("All {} attempts failed, giving up".format(max_retries + 1))
                    raise last_exception
            except Exception as e:
                # Non-retryable exception
                logger.error("Non-retryable exception: {} ({})".format(e, type(e).__name__))
                raise e

        # This should never be reached, but just in case
        raise last_exception

    def get_stats(self) -> dict:
        """Get current rate limiter statistics."""
        with self._lock:
            self._cleanup_old_requests()
            now = time.time()
            recent_requests = len([t for t in self._request_times if now - t < 60.0])

            return {
                'requests_per_minute': self.requests_per_minute,
                'burst_limit': self.burst_limit,
                'recent_requests': recent_requests,
                'interval_seconds': self.interval,
                'last_request_seconds_ago': now - self._last_request_time if self._last_request_time else None
            }
