import boto3
import json
import time
import logging
from botocore.exceptions import ClientError
import os
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SQSListener:
    def __init__(self):
        # Initialize SQS client
        self.sqs = boto3.client(
            'sqs',
            region_name=os.getenv('AWS_REGION', 'us-east-1'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )

        # Get queue name from SQS_QUEUE_NAME or parse from AWS_SQS_URL
        sqs_queue_name = os.getenv('SQS_QUEUE_NAME')
        if sqs_queue_name:
            self.queue_name = sqs_queue_name
        else:
            # Try to parse queue name from AWS_SQS_URL
            sqs_url = os.getenv('AWS_SQS_URL')
            if sqs_url:
                # Extract queue name from URL like: https://sqs.us-east-1.amazonaws.com/123456789012/my-queue.fifo
                self.queue_name = sqs_url.split('/')[-1]
            else:
                self.queue_name = 'code-analyser-queue.fifo'

        self.queue_url = None

    def create_fifo_queue(self):
        """Create a FIFO queue if it doesn't exist"""
        try:
            # Try to get queue URL first (this will work if queue exists)
            try:
                response = self.sqs.get_queue_url(QueueName=self.queue_name)
                self.queue_url = response['QueueUrl']
                logger.info("Queue already exists: {}".format(self.queue_url))
                return self.queue_url
            except ClientError as e:
                if e.response['Error']['Code'] != 'AWS.SimpleQueueService.NonExistentQueue':
                    # Re-raise if it's not a "queue doesn't exist" error
                    raise

            # Create new FIFO queue
            response = self.sqs.create_queue(
                QueueName=self.queue_name,
                Attributes={
                    'FifoQueue': 'true',
                    'ContentBasedDeduplication': 'true',  # Enable content-based deduplication
                    'VisibilityTimeout': '30',  # 30 seconds
                    'MessageRetentionPeriod': '86400',  # 24 hours
                    'ReceiveMessageWaitTimeSeconds': '20'  # Long polling
                }
            )

            self.queue_url = response['QueueUrl']
            logger.info("Created FIFO queue: {}".format(self.queue_url))
            return self.queue_url

        except ClientError as e:
            logger.error("Error creating FIFO queue: {}".format(e))
            raise

    def get_queue_url(self):
        """Get queue URL by name"""
        if not self.queue_url:
            try:
                response = self.sqs.get_queue_url(QueueName=self.queue_name)
                self.queue_url = response['QueueUrl']
            except ClientError as e:
                logger.error("Error getting queue URL: {}".format(e))
                raise
        return self.queue_url

    def send_message(self, message_body, message_group_id='default-group', message_attributes=None, message_deduplication_id=None):
        """Send a message to the FIFO queue"""
        try:
            queue_url = self.get_queue_url()

            message_params = {
                'QueueUrl': queue_url,
                'MessageBody': json.dumps(message_body) if not isinstance(message_body, str) else message_body,
                'MessageGroupId': message_group_id
            }

            # For FIFO queues, we need MessageDeduplicationId
            if message_deduplication_id:
                message_params['MessageDeduplicationId'] = message_deduplication_id
            else:
                # Generate a unique deduplication ID based on message content
                import hashlib
                content = json.dumps(message_body, sort_keys=True) + str(time.time())
                message_params['MessageDeduplicationId'] = hashlib.md5(content.encode()).hexdigest()

            if message_attributes:
                message_params['MessageAttributes'] = message_attributes

            response = self.sqs.send_message(**message_params)
            logger.info("Message sent with ID: {}".format(response['MessageId']))
            return response['MessageId']

        except ClientError as e:
            logger.error("Error sending message: {}".format(e))
            raise

    def receive_messages(self, max_messages=1, wait_time=20):
        """Receive messages from the queue"""
        try:
            queue_url = self.get_queue_url()

            response = self.sqs.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=max_messages,
                WaitTimeSeconds=wait_time,
                MessageAttributeNames=['All']
            )

            messages = response.get('Messages', [])
            logger.info("Received {} messages".format(len(messages)))
            return messages

        except ClientError as e:
            logger.error("Error receiving messages: {}".format(e))
            raise

    def delete_message(self, receipt_handle):
        """Delete a message from the queue"""
        try:
            queue_url = self.get_queue_url()

            self.sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=receipt_handle
            )
            logger.info("Message deleted successfully")

        except ClientError as e:
            logger.error("Error deleting message: {}".format(e))
            raise

    def process_message(self, message):
        """Process a single message - just print the job_id"""
        try:
            body = json.loads(message['Body'])
            job_id = body.get('job_id')
            if job_id:
                print("Received job_id: {}".format(job_id))
                logger.info("Processed job_id: {}".format(job_id))
                return True
            else:
                print("No job_id found in message")
                logger.error("No job_id found in message")
                return False

        except json.JSONDecodeError as e:
            logger.error("Error parsing message body: {}".format(e))
            return False
        except Exception as e:
            logger.error("Error processing message: {}".format(e))
            return False

    def listen_for_events(self, poll_interval=1):
        """Main event listening loop"""
        logger.info("Starting SQS event listener...")

        # Verify queue exists (don't create it)
        try:
            self.get_queue_url()
            logger.info("Connected to existing queue: {}".format(self.queue_url))
        except ClientError as e:
            if e.response['Error']['Code'] == 'AWS.SimpleQueueService.NonExistentQueue':
                logger.error("Queue '{}' does not exist. Please create the queue first.".format(self.queue_name))
                raise Exception("Queue '{}' does not exist. Please create the queue manually or ensure proper permissions.".format(self.queue_name))
            else:
                logger.error("Error accessing queue: {}".format(e))
                raise

        while True:
            try:
                # Receive messages
                messages = self.receive_messages(max_messages=10, wait_time=20)

                for message in messages:
                    success = self.process_message(message)

                    if success:
                        # Delete the message if processing was successful
                        self.delete_message(message['ReceiptHandle'])
                    else:
                        # If processing failed, the message will become visible again after visibility timeout
                        logger.warning("Message processing failed, will retry later")

                # Small delay between polls if no messages were received
                if not messages:
                    time.sleep(poll_interval)

            except KeyboardInterrupt:
                logger.info("Stopping event listener...")
                break
            except Exception as e:
                logger.error("Error in event listening loop: {}".format(e))
                time.sleep(5)  # Wait before retrying

    def purge_queue(self):
        """Purge all messages from the queue (for testing/cleanup)"""
        try:
            queue_url = self.get_queue_url()
            self.sqs.purge_queue(QueueUrl=queue_url)
            logger.info("Queue purged successfully")
        except ClientError as e:
            logger.error("Error purging queue: {}".format(e))
            raise


def main():
    """Main function to run the SQS listener"""
    listener = SQSListener()
    listener.listen_for_events()


if __name__ == '__main__':
    main()
