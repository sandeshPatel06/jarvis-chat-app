from django.db import models
from django.conf import settings

class Conversation(models.Model):
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"Conversation {self.id}"

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='sent_messages', on_delete=models.CASCADE)
    text = models.TextField(blank=True) # allow blank for file-only messages
    file = models.FileField(upload_to='chat_files/', null=True, blank=True)
    file_type = models.CharField(max_length=50, null=True, blank=True)
    file_name = models.CharField(max_length=255, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    is_read = models.BooleanField(default=False)
    is_delivered = models.BooleanField(default=False)
    reply_to = models.ForeignKey('self', null=True, blank=True, related_name='replies', on_delete=models.SET_NULL)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.sender.username}: {self.text[:20]}"

class Reaction(models.Model):
    message = models.ForeignKey(Message, related_name='reactions', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='reactions', on_delete=models.CASCADE)
    emoji = models.CharField(max_length=10)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user')

    def __str__(self):
        return f"{self.user.username} reacted {self.emoji} to {self.message.id}"


