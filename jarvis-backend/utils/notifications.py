import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings
import os
import logging

logger = logging.getLogger(__name__)

# Initialize Firebase Admin
if not firebase_admin._apps:
    try:
        cred_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            # Try to find a serviceAccountKey.json in the project root or similar
            # Or assume default credential loading if env var is set
            firebase_admin.initialize_app()
    except Exception as e:
        logger.warning(f"Failed to initialize Firebase Admin: {e}")

def send_fcm_notification(user, title, body, data=None, ttl=None, priority='high'):
    """
    Send an FCM notification to a specific user.
    :param ttl: Time to live in seconds. 0 for "now or never" (VoIP), None for default (4 weeks).
    """
    if not user.fcm_token:
        return False
    
    if not user.notifications_enabled:
        return False

    try:
        # Standardize data fields for the app to consume
        payload_data = data or {}
        # Ensure fallback for title/body in data payload
        if 'sender_name' not in payload_data:
            payload_data['sender_name'] = title
        if 'text' not in payload_data:
            payload_data['text'] = body
            
        # Standardize call fields if it's an incoming call
        if payload_data.get('type') == 'incoming_call':
            if 'call_uuid' not in payload_data and 'uuid' in payload_data:
                payload_data['call_uuid'] = payload_data['uuid']
            if 'caller_name' not in payload_data:
                payload_data['caller_name'] = title

        # Config kwargs
        android_config = {
            'priority': priority
        }
        if ttl is not None:
            android_config['ttl'] = ttl

        # Include notification block for reliable system-level display
        # while keeping data-only flexibility for the app logic
        notification = messaging.Notification(
            title=title,
            body=body,
        )

        message = messaging.Message(
            notification=notification,
            data=payload_data,
            token=user.fcm_token,
            android=messaging.AndroidConfig(**android_config),
            # Add APNS config for iOS if needed in future
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(badge=1, sound='default')
                )
            )
        )
        response = messaging.send(message)
        logger.info(f"Successfully sent FCM message: {response}")
        return True
    except Exception as e:
        logger.error(f"Error sending FCM notification to {user.username}: {e}")
        return False
