from rest_framework import generics, permissions, serializers
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Call
from .serializers import CallSerializer

User = get_user_model()

class CallViewSet(generics.ListCreateAPIView):
    serializer_class = CallSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return calls where user is caller OR receiver
        return Call.objects.filter(
            Q(caller=self.request.user) | Q(receiver=self.request.user)
        ).order_by('-started_at')

    def perform_create(self, serializer):
        recipient_username = self.request.data.get('receiver_username')
        try:
            receiver = User.objects.get(username=recipient_username)
            serializer.save(caller=self.request.user, receiver=receiver)
        except User.DoesNotExist:
             raise serializers.ValidationError("Receiver not found")
