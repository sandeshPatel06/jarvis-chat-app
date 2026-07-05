from django.urls import path
from .views import (
    ConversationListView, ConversationDetailView, 
    MessageListView, MessageDetailView, 
    ReactionView, MessageUploadView, 
    RestoreChatView, ClearMessagesView,
    MarkConversationReadView
)

urlpatterns = [
    path('messages/upload/', MessageUploadView.as_view(), name='message-upload'),
    path('conversations/', ConversationListView.as_view(), name='conversations'),
    path('conversations/<int:pk>/', ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<int:pk>/clear/', ClearMessagesView.as_view(), name='conversation-clear'),
    path('conversations/<int:conversation_id>/read/', MarkConversationReadView.as_view(), name='conversation-read'),
    path('messages/<int:conversation_id>/', MessageListView.as_view(), name='messages'),
    path('messages/detail/<int:pk>/', MessageDetailView.as_view(), name='message-detail'),
    path('messages/<int:message_id>/react/', ReactionView.as_view(), name='message-react'),

    path('restore/', RestoreChatView.as_view(), name='restore-chat'),
]
