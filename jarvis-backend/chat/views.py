from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Conversation, Message, Reaction
from .serializers import ConversationSerializer, MessageSerializer, ReactionSerializer
from django.db.models import Q, Count
from django.contrib.auth import get_user_model
from rest_framework.views import APIView

User = get_user_model()
try:
    from accounts.models import BlockedUser
except ImportError:
    # Handle potential circular import if strictly necessary, but usually models are fine
    pass

class ConversationListView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        is_deleted = self.request.query_params.get('deleted', 'false') == 'true'
        return self.request.user.conversations.filter(is_deleted=is_deleted).prefetch_related('participants').order_by('-id')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        recipient_username = request.data.get('recipient')
        
        if not recipient_username:
             return Response({"error": "Recipient username is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipient = User.objects.get(username=recipient_username)
            from utils.chat_utils import get_or_create_1on1_conversation
            conversation, created = get_or_create_1on1_conversation(request.user, recipient)
            
            response_serializer = self.get_serializer(conversation)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except User.DoesNotExist:
            return Response({"error": "Recipient user not found."}, status=status.HTTP_404_NOT_FOUND)

class ConversationDetailView(generics.DestroyAPIView):
    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users can only delete conversations they are part of
        return self.request.user.conversations.all()

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()

from rest_framework.pagination import LimitOffsetPagination

class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination

    def get_queryset(self):
        conversation_id = self.kwargs['conversation_id']
        
        # Get list of users who have blocked the current request.user? NO.
        # We want to hide messages FROM users that the CURRENT USER has blocked.
        # Wait, if I block someone, I shouldn't see their messages.
        # "thay will viable on chat but only with single tick" -> This is for sender.
        # Sender sees their OWN message.
        # Recipient (Blocker) should NOT see the message.
        
        blocked_senders = BlockedUser.objects.filter(blocker=self.request.user).values_list('blocked', flat=True)
        
        # Return newest messages first for inverted list
        # Filter out messages where sender is in blocked_senders AND message is not delivered (pending)
        # We want to keep historical messages (which are presumably delivered/read)
        
        return Message.objects.filter(
            conversation_id=conversation_id
        ).select_related('sender', 'reply_to', 'reply_to__sender').prefetch_related('reactions', 'reactions__user').exclude(
            sender__in=blocked_senders,
            is_delivered=False 
        ).order_by('-timestamp')

class MessageDetailView(generics.DestroyAPIView):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users can only delete their own messages
        return self.request.user.sent_messages.all()

    def perform_destroy(self, instance):
        from django.utils import timezone
        instance.deleted_at = timezone.now()
        instance.save()

class RestoreChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        conversation_ids = request.data.get('conversation_ids', [])
        restore_date = request.data.get('restore_messages_before') # ISO format string

        if not conversation_ids:
            return Response({"error": "No conversations selected"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Restore Conversations (Soft Undelete)
        conversations = Conversation.objects.filter(
            id__in=conversation_ids, 
            participants=request.user,
            is_deleted=True
        )
        conversations.update(is_deleted=False)

        # 2. Restore Messages if a date is provided
        if restore_date:
            try:
                messages = Message.objects.filter(
                    conversation__id__in=conversation_ids,
                    sender=request.user,
                    deleted_at__lte=restore_date
                )
                messages.update(deleted_at=None)
            except Exception as e:
                return Response({"error": f"Invalid date: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"status": "restored", "count": conversations.count()})

class ReactionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        try:
            message = Message.objects.get(id=message_id)
            # Check if user is participant
            if not message.conversation.participants.filter(id=request.user.id).exists():
                return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
            emoji = request.data.get('reaction')
            if not emoji:
                return Response({"error": "Emoji required"}, status=status.HTTP_400_BAD_REQUEST)

            # Replace existing reaction from this user
            # First, delete any existing reactions from this user on this message
            Reaction.objects.filter(message=message, user=request.user).delete()
            
            # Then create the new reaction
            Reaction.objects.create(message=message, user=request.user, emoji=emoji)
            return Response({"status": "added"}, status=status.HTTP_201_CREATED)

        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

from rest_framework.parsers import MultiPartParser, FormParser
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class MessageUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        conversation_id = request.data.get('conversation_id')
        recipient_username = request.data.get('recipient_username')
        text = request.data.get('text', '')
        file = request.data.get('file')
        file_type = request.data.get('file_type')
        file_name = request.data.get('file_name')
        reply_to_id = request.data.get('reply_to_id')

        # File Validation (Security)
        if file:
            # 1. Size Limit (e.g., 50MB)
            if file.size > 50 * 1024 * 1024:
                return Response({"error": "File too large (max 50MB)"}, status=status.HTTP_400_BAD_REQUEST)
            
            # 2. Type Limit
            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 
                             'video/mp4', 'video/quicktime', 'video/webm',
                             'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm',
                             'application/pdf']
            
            # Check content_type (trusting header, but better than nothing). 
            # For strict check, we'd use python-magic but that requires system libs.
            if file.content_type not in allowed_types:
                 return Response({"error": f"File type not allowed: {file.content_type}"}, status=status.HTTP_400_BAD_REQUEST)

        # Allow file only, text only, or both
        if not file and not text:
             return Response({"error": "Message must have text or file"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            conversation = None
            if conversation_id:
                try:
                    conversation = Conversation.objects.get(id=conversation_id)
                except Conversation.DoesNotExist:
                    pass
            
            if not conversation and recipient_username:
                try:
                    recipient = User.objects.get(username=recipient_username)
                    from utils.chat_utils import get_or_create_1on1_conversation
                    conversation, _ = get_or_create_1on1_conversation(request.user, recipient)
                except User.DoesNotExist:
                    pass

            if not conversation:
                return Response({"error": "Conversation not found or recipient invalid"}, status=status.HTTP_404_NOT_FOUND)
            
            # Verify user is in conversation
            if not conversation.participants.filter(id=request.user.id).exists():
                 return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
            # Check for blocking
            is_blocked = False
            # Find the other participant in 1-on-1 chat
            if conversation.participants.count() == 2:
                other_user = conversation.participants.exclude(id=request.user.id).first()
                if other_user:
                    if BlockedUser.objects.filter(blocker=other_user, blocked=request.user).exists():
                         # return Response({"error": "You are blocked by this user"}, status=status.HTTP_403_FORBIDDEN)
                         is_blocked = True
            
            reply_to_message = None
            if reply_to_id:
                reply_to_message = Message.objects.filter(id=reply_to_id).first()

            message = Message.objects.create(
                conversation=conversation,
                sender=request.user,
                text=text,
                file=file,
                file_type=file_type,
                file_name=file_name,
                reply_to=reply_to_message
            )

            serializer = MessageSerializer(message)
            data = serializer.data

            # Broadcast via WebSocket
            channel_layer = get_channel_layer()

            # Broadcast to all participants
            # Broadcast to all participants
            for participant in conversation.participants.all():
                 # If blocked, do NOT send to the blocker (recipient)
                 # But ALWAYS send to the sender (so they get update/confirmation)
                 
                 should_send = True
                 if is_blocked and participant.id != request.user.id:
                     should_send = False
                 
                 if should_send:
                     async_to_sync(channel_layer.group_send)(
                        f"user_{participant.id}",
                        {
                            'type': 'chat_message',
                            'message': data
                        }
                    )
                     # Send FCM if it's the recipient
                     if participant.id != request.user.id:
                         try:
                             from utils.notifications import send_fcm_notification
                             send_fcm_notification(
                                 user=participant,
                                 title=f"New message from {request.user.username}",
                                 body=text[:100] if text else "Sent a file",
                                 data={
                                     "type": "chat_message",
                                     "conversation_id": str(conversation.id),
                                     "sender_id": str(request.user.id),
                                     "message_id": str(message.id)
                                 }
                             )
                         except Exception as e:
                             logger.error(f"Failed to send notification via upload view: {e}")

            return Response(data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error in upload view: {e}")


