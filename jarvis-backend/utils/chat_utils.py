from django.db.models import Count
from chat.models import Conversation

def get_or_create_1on1_conversation(user1, user2):
    """
    Get or create a 1-on-1 conversation between two users.
    """
    if user1 == user2:
        # Self chat
        conversation = Conversation.objects.filter(participants=user1).annotate(num_participants=Count('participants')).filter(num_participants=1).first()
        if not conversation:
            conversation = Conversation.objects.create()
            conversation.participants.add(user1)
        return conversation, False
    else:
        # 1-on-1 chat
        conversation = Conversation.objects.filter(participants=user1).filter(participants=user2).annotate(num_participants=Count('participants')).filter(num_participants=2).first()
        
        if not conversation:
            conversation = Conversation.objects.create()
            conversation.participants.add(user1, user2)
            return conversation, True
        return conversation, False
