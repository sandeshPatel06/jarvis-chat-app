from rest_framework import serializers
from .models import Call
from accounts.serializers import UserSerializer

class CallSerializer(serializers.ModelSerializer):
    caller = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    receiver_username = serializers.CharField(write_only=True)

    class Meta:
        model = Call
        fields = ['id', 'caller', 'receiver', 'receiver_username', 'started_at', 'ended_at', 'status', 'is_video']
        read_only_fields = ['caller', 'receiver', 'started_at']

    def create(self, validated_data):
        validated_data.pop('receiver_username', None)
        return super().create(validated_data)
