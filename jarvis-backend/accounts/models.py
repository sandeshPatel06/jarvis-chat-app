from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True, unique=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    is_online = models.BooleanField(default=False)

    # Privacy Settings
    PRIVACY_CHOICES = [
        ('everyone', 'Everyone'),
        ('contacts', 'My Contacts'),
        ('nobody', 'Nobody'),
    ]
    privacy_last_seen = models.CharField(max_length=20, choices=PRIVACY_CHOICES, default='everyone')
    privacy_profile_photo = models.CharField(max_length=20, choices=PRIVACY_CHOICES, default='everyone')
    privacy_read_receipts = models.BooleanField(default=True)
    privacy_disappearing_messages_timer = models.IntegerField(default=0) # in seconds, 0 = off

    # Notification Settings
    notifications_enabled = models.BooleanField(default=True)
    notifications_sound = models.BooleanField(default=True)
    notifications_groups_enabled = models.BooleanField(default=True)

    # Security Settings
    security_notifications_enabled = models.BooleanField(default=False)
    two_step_verification_enabled = models.BooleanField(default=False)

    # Storage Settings
    storage_auto_download_media = models.BooleanField(default=True)

    # Chat Settings
    chat_wallpaper = models.CharField(max_length=500, blank=True, null=True)

    # App Settings
    app_language = models.CharField(max_length=10, default='en')
    fcm_token = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.username

class BlockedUser(models.Model):
    blocker = models.ForeignKey(User, related_name='blocking', on_delete=models.CASCADE)
    blocked = models.ForeignKey(User, related_name='blocked_by', on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blocker', 'blocked')
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.blocker} blocked {self.blocked}"

class OTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"OTP {self.code} for {self.user.username}"

class PendingVerification(models.Model):
    identifier = models.CharField(max_length=255) # email or phone
    code = models.CharField(max_length=6)
    session_id = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"Pending {self.identifier} ({self.code})"
