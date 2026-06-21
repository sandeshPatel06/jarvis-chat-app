from celery import shared_task
from django.contrib.auth import get_user_model
from PIL import Image
import logging

from utils.notifications import send_fcm_notification

from .models import Message

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(queue='notifications', bind=True, max_retries=3, default_retry_delay=30)
def send_message_notification(self, user_id, title, body, data=None):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.warning("Notification skipped for missing user_id=%s", user_id)
        return False

    return send_fcm_notification(user=user, title=title, body=body, data=data or {})


@shared_task(queue='notifications', bind=True, max_retries=3, default_retry_delay=30)
def send_call_notification(self, user_id, chat_id, caller_name, caller_avatar, is_video, uuid):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.warning("Call notification skipped for missing user_id=%s", user_id)
        return False

    return send_fcm_notification(
        user=user,
        title="Incoming Call",
        body="Incoming video call...",
        ttl=0,
        data={
            "type": "incoming_call",
            "chatId": str(chat_id),
            "callerName": caller_name,
            "callerAvatar": caller_avatar,
            "isVideo": "true" if is_video else "false",
            "uuid": uuid,
        },
    )


@shared_task(queue='media', bind=True, max_retries=2, default_retry_delay=10)
def process_message_media(self, message_id):
    try:
        message = Message.objects.get(id=message_id)
    except Message.DoesNotExist:
        logger.warning("Media task skipped for missing message_id=%s", message_id)
        return False

    if not message.file:
        message.media_processing_state = 'ready'
        message.media_metadata = {}
        message.save(update_fields=['media_processing_state', 'media_metadata'])
        return True

    message.media_processing_state = 'processing'
    message.save(update_fields=['media_processing_state'])

    metadata = {
        "name": message.file_name or message.file.name.rsplit('/', 1)[-1],
        "size": message.file.size,
        "content_type": message.file_type or "",
    }

    try:
        message.file.open('rb')
        try:
            with Image.open(message.file) as image:
                metadata["width"] = image.width
                metadata["height"] = image.height
                metadata["format"] = image.format
        except Exception:
            pass
        finally:
            message.file.close()
    except Exception as exc:
        logger.warning("Unable to inspect media for message_id=%s: %s", message_id, exc)

    message.media_metadata = metadata
    message.media_processing_state = 'ready'
    message.save(update_fields=['media_processing_state', 'media_metadata'])
    return True
