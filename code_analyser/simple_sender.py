#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple SQS Message Sender
"""

from sqs_listener import SQSListener

class SimpleSender(SQSListener):
    """Simple sender that sends test messages"""

    def send_test_message(self):
        """Send a test message with job_id"""
        message_body = {"job_id": "70b84bb1-d368-41a2-9574-27dbf7cda78d"}
        message_id = self.send_message(message_body)
        print("Sent message with ID: {}".format(message_id))
        return message_id

if __name__ == '__main__':
    sender = SimpleSender()
    sender.send_test_message()
