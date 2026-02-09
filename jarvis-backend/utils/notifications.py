import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings
import os
import logging

logger = logging.getLogger(__name__)

import json

# Initialize Firebase
def _initialize():
    if not firebase_admin._apps:
        try:
            # 1. Try environment variable (Production/CI)
            env_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
            if env_json:
                logger.info("Loading Firebase credentials from environment variable")
                cred_dict = json.loads(env_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                return

            # 2. Fallback to file (Local Development)
            # BASE_DIR is utils/.. -> jarvis-backend/
            BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            JSON_PATH = os.path.join(BASE_DIR, "service-account.json")

            logger.info(f"Loading Firebase JSON from: {JSON_PATH}")
            
            if os.path.exists(JSON_PATH):
                cred = credentials.Certificate(JSON_PATH)
                firebase_admin.initialize_app(cred)
            else:
                logger.error(f"Service account not found in ENV or at: {JSON_PATH}")

        except Exception as e:
            logger.error(f"Firebase Init Failed: {e}")

def send_fcm_notification(user, title, body, data=None, ttl=None, priority='high'):
    """
    Send an FCM notification to a specific user.
    :param ttl: Time to live in seconds. 0 for "now or never" (VoIP), None for default (4 weeks).
    """
    _initialize()
    
    # print("user.fcm_token", user.fcm_token)
    if not user.fcm_token:
        logger.warning(f"User {user.username} has no FCM token")
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
            # Frontend expects: type, callUUID, callerId, callerName
            if 'call_uuid' not in payload_data and 'uuid' in payload_data:
                payload_data['callUUID'] = payload_data['uuid'] # Map for frontend
            elif 'call_uuid' in payload_data:
                 payload_data['callUUID'] = payload_data['call_uuid']

            if 'caller_name' not in payload_data:
                payload_data['callerName'] = title
            else:
                 payload_data['callerName'] = payload_data['caller_name']
            
            if 'callerId' not in payload_data:
                 payload_data['callerId'] = payload_data.get('sender_username', 'Unknown')

        # Config kwargs
        android_config = {
            'priority': 'high', # 'high' is required for background wake-up
            'ttl': 0 if payload_data.get('type') == 'incoming_call' else 3600 # 0 for calls (now or never)
        }
        
        # Apple APNS Config (VoIP)
        apns_config = messaging.APNSConfig(
            headers={
                "apns-push-type": "background" if payload_data.get('type') == 'incoming_call' else "alert",
                "apns-priority": "10" if priority == 'high' else "5", 
            },
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    content_available=True, # Critical for background processing
                    sound='default'
                )
            )
        )

        notification = None
        # Only attach visible notification if it's NOT a call (calls use data-only for full screen UI)
        # OR if we want a fallback. 
        # Usually for calls we rely on data to trigger incomingCall screen.
        if payload_data.get('type') != 'incoming_call':
            notification = messaging.Notification(
                title=title,
                body=body,
            )

        message = messaging.Message(
            notification=notification,
            data=payload_data,
            token=user.fcm_token,
            android=messaging.AndroidConfig(**android_config),
            apns=apns_config
        )
        response = messaging.send(message)
        logger.info(f"Successfully sent FCM message to {user.username}: {response}")
        return True
    except Exception as e:
        logger.error(f"Error sending FCM notification to {user.username}: {e}")
        return False
