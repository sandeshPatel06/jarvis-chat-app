from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Call

User = get_user_model()

class CallCreationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.caller = User.objects.create_user(username='caller', password='password')
        self.receiver = User.objects.create_user(username='receiver', password='password')
        self.client.force_authenticate(user=self.caller)

    def test_create_call(self):
        data = {
            'receiver_username': 'receiver',
            'is_video': True
        }
        response = self.client.post('/api/calls/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Call.objects.count(), 1)
        call = Call.objects.first()
        self.assertEqual(call.caller, self.caller)
        self.assertEqual(call.receiver, self.receiver)
        self.assertTrue(call.is_video)
