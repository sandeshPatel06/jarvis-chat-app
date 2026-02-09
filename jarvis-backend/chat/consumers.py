import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return

        self.room_group_name = f"user_{self.user.id}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        await self.update_user_status(True)

    async def disconnect(self, close_code):
        # Leave room group
        if hasattr(self, 'room_group_name'):
             await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        await self.update_user_status(False)

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type', 'chat_message')

        if message_type == 'mark_read':
            message_id = text_data_json.get('message_id')
            conversation_id = text_data_json.get('conversation_id') # Optional context
            if message_id:
                sender_id = await self.mark_message_read(message_id)
                if sender_id:
                     # Notify the sender that their message was read
                    sender_group_name = f"user_{sender_id}"
                    await self.channel_layer.group_send(
                        sender_group_name,
                        {
                            'type': 'message_read',
                            'message_id': message_id,
                            'conversation_id': conversation_id
                        }
                    )
            return
        
        if message_type == 'mark_delivered':
            message_id = text_data_json.get('message_id')
            conversation_id = text_data_json.get('conversation_id')
            if message_id:
                sender_id = await self.mark_message_delivered(message_id)
                if sender_id:
                     # Notify the sender that their message was delivered
                    sender_group_name = f"user_{sender_id}"
                    await self.channel_layer.group_send(
                        sender_group_name,
                        {
                            'type': 'message_delivered',
                            'message_id': message_id,
                            'conversation_id': conversation_id
                        }
                    )
            return

        if text_data_json.get('type') == 'typing':
            # logger.debug(f"[WS] Received typing event: {text_data_json}")
            conversation_id = text_data_json.get('conversation_id')
            recipient_id = text_data_json.get('recipient_id')
            
            # Find recipient and broadcast
            # We reuse the logic: if recipient_id provided use it, else derive
             # Note: For typing, strictly non-db-write. We might need a quick lookup if recipient_id is missing.
            final_recipient_id = recipient_id
            
            if not final_recipient_id and conversation_id:
                 final_recipient_id = await self.get_recipient_from_conversation(conversation_id)

            if final_recipient_id:
                 # logger.debug(f"[WS] Broadcasting typing to user_{final_recipient_id}")
                 await self.channel_layer.group_send(
                    f"user_{final_recipient_id}",
                    {
                        'type': 'user_typing',
                        'conversation_id': conversation_id,
                        'sender_id': self.user.id,
                        'sender_username': self.user.username
                    }
                )
            return

        if message_type == 'edit_message':
            message_id = text_data_json.get('message_id')
            new_text = text_data_json.get('new_text')
            conversation_id = text_data_json.get('conversation_id')
            
            if message_id and new_text:
                success = await self.edit_message(message_id, new_text)
                if success:
                    # Notify everyone in the conversation (simplify by sending to sender and recipient)
                    # For a real group chat, we'd send to a group channel for the conversation. 
                    # Here we have user-specific channels.
                    
                    # Notify sender
                    await self.send(text_data=json.dumps({
                        'type': 'message_edited',
                        'message_id': message_id,
                        'conversation_id': conversation_id,
                        'new_text': new_text
                    }))

                    # Notify recipient
                    recipient_id = await self.get_recipient_from_conversation(conversation_id)
                    if recipient_id:
                         await self.channel_layer.group_send(
                            f"user_{recipient_id}",
                            {
                                'type': 'message_edited',
                                'message_id': message_id,
                                'conversation_id': conversation_id,
                                'new_text': new_text
                            }
                        )
            return

        if message_type == 'delete_message':
            message_id = text_data_json.get('message_id')
            conversation_id = text_data_json.get('conversation_id')
            
            if message_id:
                deleted_at = await self.delete_message(message_id)
                if deleted_at:
                    # Notify sender
                    await self.send(text_data=json.dumps({
                        'type': 'message_deleted',
                        'message_id': message_id,
                        'conversation_id': conversation_id,
                        'deleted_by': self.user.username,
                        'deleted_at': deleted_at
                    }))

                    # Notify recipient
                    recipient_id = await self.get_recipient_from_conversation(conversation_id)
                    if recipient_id:
                         await self.channel_layer.group_send(
                            f"user_{recipient_id}",
                            {
                                'type': 'message_deleted',
                                'message_id': message_id,
                                'conversation_id': conversation_id,
                                'deleted_at': deleted_at
                            }
                        )
            return

        if message_type == 'react_message':
            message_id = text_data_json.get('message_id')
            conversation_id = text_data_json.get('conversation_id')
            reaction = text_data_json.get('reaction')
            
            if message_id and reaction:
                reactions_list = await self.react_to_message(message_id, reaction)
                # Notify sender
                await self.send(text_data=json.dumps({
                    'type': 'message_reaction',
                    'message_id': message_id,
                    'conversation_id': conversation_id,
                    'reactions': reactions_list
                }))

                # Notify recipient
                recipient_id = await self.get_recipient_from_conversation(conversation_id)
                if recipient_id:
                        await self.channel_layer.group_send(
                        f"user_{recipient_id}",
                        {
                            'type': 'message_reaction',
                            'message_id': message_id,
                            'conversation_id': conversation_id,
                            'reactions': reactions_list
                        }
                    )
            return

        # WebRTC Signaling
        # WebRTC Signaling
        if message_type in ['webrtc_offer', 'webrtc_answer', 'webrtc_ice_candidate']:
            logger.info(f"[WS] 🔵 WebRTC {message_type} received: {text_data_json}")
            chat_id = text_data_json.get('chat_id')
            if not chat_id:
                logger.warning(f"[WS] ❌ WebRTC signal missing chat_id")
                return

            recipient_id = await self.get_recipient_from_conversation(chat_id)
            if recipient_id:
                logger.info(f"[WS] ➡️ Broadcasting {message_type} to user_{recipient_id}")
                await self.channel_layer.group_send(
                    f"user_{recipient_id}",
                    {
                        'type': 'webrtc_signal',
                        'payload': text_data_json 
                    }
                )

                # Send FCM Notification for Incoming Call (Offer)
                if message_type == 'webrtc_offer':
                    from utils.notifications import send_fcm_notification
                    logger.info(f"[WS] 📲 Sending FCM for Incoming Call to user_{recipient_id}")
                    send_fcm_notification(
                        user=User.objects.get(id=recipient_id),
                        title="Incoming Call",
                        body="Incoming video call...",
                        ttl=0, # Now or never for calls
                        data={
                            "type": "incoming_call",
                            "chatId": chat_id,
                            "callerName": self.user.username,
                            "uuid": text_data_json.get('offer', {}).get('sdp', '')[:10] # Unique-ish ID
                        }
                    )
            else:
                logger.warning(f"[WS] ❌ Could not find recipient for WebRTC signal in chat {chat_id}")
            return
            
        if message_type == 'call_ended':
            logger.info(f"[WS] 🔴 Call ended signal received: {text_data_json}")
            chat_id = text_data_json.get('chat_id')
            recipient_id = await self.get_recipient_from_conversation(chat_id)
            if recipient_id:
                logger.info(f"[WS] ➡️ Broadcasting call_ended to user_{recipient_id}")
                await self.channel_layer.group_send(
                    f"user_{recipient_id}",
                    {
                        'type': 'call_ended',
                        'chat_id': chat_id
                    }
                )
            return

        message_text = text_data_json.get('message')
        recipient_id = text_data_json.get('recipient_id')
        conversation_id = text_data_json.get('conversation_id')
        reply_to_id = text_data_json.get('reply_to_id')

        if message_text:
            # Save message to database
            saved_message_data, recipient_id_derived, is_blocked = await self.save_message(message_text, recipient_id, conversation_id, reply_to_id)

            if saved_message_data:
                # Send message to sender
                await self.send(text_data=json.dumps({
                    'message': saved_message_data
                }))

                # Determine final recipient_id (payload takes precedence, but usually derived is safer for consistency)
                final_recipient_id = recipient_id or recipient_id_derived

                # Send message to recipient's group ONLY if NOT blocked
                if final_recipient_id and not is_blocked:
                    recipient_group_name = f"user_{final_recipient_id}"
                    await self.channel_layer.group_send(
                        recipient_group_name,
                        {
                            'type': 'chat_message',
                            'message': saved_message_data
                        }
                    )

    async def user_typing(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_typing',
            'conversation_id': event['conversation_id'],
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username']
        }))

    async def chat_message(self, event):
        message = event['message']
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message
        }))

    @database_sync_to_async
    def get_recipient_from_conversation(self, conversation_id):
        from .models import Conversation
        try:
             conversation = Conversation.objects.get(id=conversation_id)
             other_participant = conversation.participants.exclude(id=self.user.id).first()
             return other_participant.id if other_participant else None
        except Exception as e:
            logger.error(f"[WS] Error finding recipient: {e}")
            return None

    async def message_read(self, event):
        # Notify user that their message was read
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'message_id': event['message_id'],
            'conversation_id': event.get('conversation_id')
        }))

    async def message_delivered(self, event):
        # Notify user that their message was delivered
        await self.send(text_data=json.dumps({
            'type': 'message_delivered',
            'message_id': event['message_id'],
            'conversation_id': event.get('conversation_id')
        }))

    @database_sync_to_async
    def update_user_status(self, is_online):
        from django.utils import timezone
        User.objects.filter(id=self.user.id).update(
            is_online=is_online,
            last_seen=timezone.now()
        )

    @database_sync_to_async
    def mark_message_read(self, message_id):
        from .models import Message
        try:
            message = Message.objects.get(id=message_id)
            if not message.is_read:
                message.is_read = True
                message.save()
                return message.sender.id
            return None
        except Message.DoesNotExist:
            return None

    @database_sync_to_async
    def mark_message_delivered(self, message_id):
        from .models import Message
        try:
            message = Message.objects.get(id=message_id)
            if not message.is_delivered:
                message.is_delivered = True
                message.save()
                return message.sender.id
            return None
        except Message.DoesNotExist:
            return None

    @database_sync_to_async
    def save_message(self, message_text, recipient_id, conversation_id, reply_to_id=None):
        from .models import Conversation, Message
        from .serializers import MessageSerializer
        from django.db.models import Q
        from utils.notifications import send_fcm_notification

        try:
            conversation = None
            if conversation_id:
                conversation = Conversation.objects.get(id=conversation_id)
            elif recipient_id:
                 recipient = User.objects.get(id=recipient_id)
                 conversation = Conversation.objects.filter(participants=self.user).filter(participants=recipient).first()
                 
                 if not conversation:
                     conversation = Conversation.objects.create()
                     conversation.participants.add(self.user, recipient)

            is_blocked = False
            if conversation:
                 # Check for blocking
                # Find the other participant in 1-on-1 chat
                if conversation.participants.count() == 2:
                    other_user = conversation.participants.exclude(id=self.user.id).first()
                    if other_user:
                        from accounts.models import BlockedUser
                        # Sync check provided we are in sync_to_async/database_sync_to_async context
                        if BlockedUser.objects.filter(blocker=other_user, blocked=self.user).exists():
                            logger.warning(f"[WS] Message soft-blocked: {self.user} is blocked by {other_user}")
                            is_blocked = True
                            # Continue to save message, but flag it

                reply_to_message = None
                if reply_to_id:
                    reply_to_message = Message.objects.filter(id=reply_to_id).first()

                message = Message.objects.create(
                    conversation=conversation,
                    sender=self.user,
                    text=message_text,
                    reply_to=reply_to_message
                )
                
                # Determine recipient for return
                data = MessageSerializer(message).data
                
                # Logic to find the "other" participant
                # Note: this assumes 1-on-1 chat relative to the sender
                other_participant = conversation.participants.exclude(id=self.user.id).first()
                derived_recipient_id = other_participant.id if other_participant else None
                
                # If it's a self-chat (user talking to themselves), exclude might return None if they are the ONLY participant
                # So we check if self.user is in participants and count is 1
                if conversation.participants.count() == 1 and conversation.participants.first() == self.user:
                     derived_recipient_id = self.user.id

                # Check if this is the first message (optional context) or just send notification
                if derived_recipient_id and derived_recipient_id != self.user.id and not is_blocked:
                    try:
                        recipient_user = User.objects.get(id=derived_recipient_id)
                        send_fcm_notification(
                            user=recipient_user,
                            title=f"New message from {self.user.username}",
                            body=message_text[:100] if message_text else "Sent a file",
                            data={
                                "type": "chat_message",
                                "conversation_id": str(conversation.id),
                                "sender_id": str(self.user.id),
                                "message_id": str(message.id)
                            }
                        )
                    except Exception as e:
                        logger.error(f"Failed to send message notification: {e}")

                return data, derived_recipient_id, is_blocked
                
        except Exception as e:
            logger.error(f"Error saving message: {e}")
            return None, None, False
        return None, None, False

    @database_sync_to_async
    def edit_message(self, message_id, new_text):
        from .models import Message
        try:
            message = Message.objects.get(id=message_id, sender=self.user)
            message.text = new_text
            message.save()
            return True
        except Message.DoesNotExist:
            return False

    @database_sync_to_async
    def delete_message(self, message_id):
        from .models import Message
        from django.utils import timezone
        try:
            message = Message.objects.get(id=message_id, sender=self.user)
            message.deleted_at = timezone.now()
            message.save()
            return message.deleted_at.isoformat()
        except Message.DoesNotExist:
            return None

    @database_sync_to_async
    def react_to_message(self, message_id, emoji):
        from .models import Message, Reaction
        try:
            message = Message.objects.get(id=message_id)
            # Check if user is participant
            if not message.conversation.participants.filter(id=self.user.id).exists():
               return []
            
            existing = Reaction.objects.filter(message=message, user=self.user, emoji=emoji).first()
            if existing:
                existing.delete()
            else:
                Reaction.objects.create(message=message, user=self.user, emoji=emoji)
            
            return list(message.reactions.values_list('emoji', flat=True))
        except Message.DoesNotExist:
            return []

    async def message_edited(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_edited',
            'message_id': event['message_id'],
            'conversation_id': event['conversation_id'],
            'new_text': event['new_text']
        }))

    async def message_deleted(self, event):
         await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
            'conversation_id': event['conversation_id'],
            'deleted_by': event.get('deleted_by', 'user'),  # Include who deleted it
            'deleted_at': event.get('deleted_at')
        }))

    async def message_reaction(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_reaction',
            'message_id': event['message_id'],
            'conversation_id': event['conversation_id'],
            'reactions': event['reactions']
        }))

    async def webrtc_signal(self, event):
        # Relay the exact payload received from the sender
        payload = event['payload']
        # Ensure the type matches what the frontend expects
        await self.send(text_data=json.dumps(payload))

    async def call_ended(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_ended',
            'chat_id': event['chat_id']
        }))

