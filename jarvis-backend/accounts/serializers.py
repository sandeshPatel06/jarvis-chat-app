from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'phone_number', 'profile_picture', 'bio',
            'last_seen', 'is_online',
            'privacy_last_seen', 'privacy_profile_photo', 'privacy_read_receipts',
            'privacy_disappearing_messages_timer',
            'notifications_enabled', 'notifications_sound', 'notifications_groups_enabled',
            'security_notifications_enabled', 'two_step_verification_enabled',
            'storage_auto_download_media', 'chat_wallpaper', 'app_language'
        )

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'phone_number')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            phone_number=validated_data.get('phone_number', '')
        )
        return user
