from django.db import models
from django.conf import settings

class Call(models.Model):
    STATUS_CHOICES = (
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('missed', 'Missed'),
        ('rejected', 'Rejected'),
    )
    
    caller = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='calls_made', on_delete=models.CASCADE)
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='calls_received', on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ongoing')
    is_video = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Call from {self.caller.username} to {self.receiver.username} ({self.status})"
