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

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        current_user = request.user if request else None

        # If viewing someone else, mask sensitive privacy/notification settings
        if current_user and instance.id != current_user.id:
            # These fields should only be visible to the user themselves
            private_fields = [
                'email', 'phone_number', 'privacy_read_receipts', 
                'privacy_disappearing_messages_timer', 'notifications_enabled', 
                'notifications_sound', 'notifications_groups_enabled',
                'security_notifications_enabled', 'two_step_verification_enabled',
                'storage_auto_download_media', 'chat_wallpaper', 'app_language'
            ]
            for field in private_fields:
                representation.pop(field, None)

            # Apply Dynamic Privacy Masking
            if instance.privacy_last_seen == 'nobody':
                representation['last_seen'] = None
                representation['is_online'] = False
            
            if instance.privacy_profile_photo == 'nobody':
                representation['profile_picture'] = None

        return representation

class PublicUserSerializer(serializers.ModelSerializer):
    """Simplified serializer for public-facing profiles with privacy masking."""
    class Meta:
        model = User
        fields = ('id', 'username', 'profile_picture', 'bio', 'last_seen', 'is_online')

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        current_user = request.user if request else None

        if instance.id != getattr(current_user, 'id', None):
            if instance.privacy_last_seen == 'nobody':
                representation['last_seen'] = None
                representation['is_online'] = False
            
            if instance.privacy_profile_photo == 'nobody':
                representation['profile_picture'] = None
                
        return representation

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
