
import os
import sys
import django
import argparse
import logging

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chat_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from utils.notifications import send_fcm_notification

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

User = get_user_model()

def test_send_notification(username, type='chat'):
    try:
        user = User.objects.get(username=username)
        logger.info(f"Found user: {user.username} (ID: {user.id})")
        logger.info(f"FCM Token: {user.fcm_token}")

        if not user.fcm_token:
             logger.error("User has no FCM token. Please update it via the API first.")
             return

        if type == 'chat':
            title = "Test Chat Message"
            body = "This is a test message from the backend script."
            data = {
                "type": "chat_message",
                "conversation_id": "1",
                "sender_id": str(user.id), # Self-send for test
                "message_id": "100"
            }
        elif type == 'call':
             title = "Incoming Call"
             body = "Incoming call..."
             data = {
                "type": "incoming_call",
                "uuid": "test-uuid-123456",
                "caller_name": "Test Caller",
                "sender_username": "test_caller"
             }
        else:
            logger.error(f"Unknown type: {type}")
            return

        logger.info(f"Sending {type} notification...")
        success = send_fcm_notification(user, title, body, data=data)
        
        if success:
            logger.info("✅ Notification sent successfully!")
        else:
             logger.error("❌ Failed to send notification.")

    except User.DoesNotExist:
        logger.error(f"User '{username}' not found.")
    except Exception as e:
        logger.error(f"An error occurred: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test FCM Notifications")
    parser.add_argument('--user', type=str, required=True, help="Username to send/test with")
    parser.add_argument('--type', type=str, default='chat', choices=['chat', 'call'], help="Type of notification")
    
    args = parser.parse_args()
    
    test_send_notification(args.user, args.type)
