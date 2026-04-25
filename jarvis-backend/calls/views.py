from rest_framework import generics, permissions, serializers, status, views
from rest_framework.response import Response
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

class CallDetailView(generics.DestroyAPIView):
    serializer_class = CallSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Call.objects.filter(
            Q(caller=self.request.user) | Q(receiver=self.request.user)
        )

class ClearCallHistoryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        Call.objects.filter(
            Q(caller=request.user) | Q(receiver=request.user)
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class BulkDeleteCallsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        call_ids = request.data.get('call_ids', [])
        if not call_ids:
            return Response({"error": "No call IDs provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        Call.objects.filter(
            Q(caller=request.user) | Q(receiver=request.user),
            id__in=call_ids
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
