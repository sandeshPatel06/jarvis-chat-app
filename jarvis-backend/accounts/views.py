from django.db import models
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.views import APIView
from .serializers import RegisterSerializer, UserSerializer
from django.contrib.auth import get_user_model
from chat.models import Message
from chat.serializers import MessageSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import random
import uuid
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
from .models import PendingVerification, BlockedUser
from django.contrib.auth import authenticate

User = get_user_model()

def background_send_email(subject, message, recipient_list, html_message=None):
    """Sends an email in a separate thread to avoid blocking the main request."""
    import threading
    from django.core.mail import send_mail
    
    def run():
        try:
            print(f"[EmailThread] Sending to {recipient_list}...", flush=True)
            send_mail(subject, message, None, recipient_list, fail_silently=False, html_message=html_message)
            print(f"[EmailThread] Success for {recipient_list}", flush=True)
        except Exception as e:
            print(f"[EmailThread] FAILED for {recipient_list}: {str(e)}", flush=True)
            import traceback
            traceback.print_exc()

    thread = threading.Thread(target=run)
    thread.start()

class RequestOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import time
        start_time = time.time()
        identifier = request.data.get('identifier') # email or phone
        
        try:
            if not identifier:
                return Response({"error": "Identifier is required"}, status=status.HTTP_400_BAD_REQUEST)

            # Basic email regex check if identifier is email
            import re
            email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
            if '@' in identifier and not re.match(email_regex, identifier):
                return Response({"error": "Invalid email format"}, status=status.HTTP_400_BAD_REQUEST)

            from django.conf import settings
            if settings.DEBUG:
                otp_code = '000000'
            else:
                otp_code = str(random.randint(100000, 999999))
            session_id = str(uuid.uuid4())
            
            print(f"[{identifier}] Starting OTP request...", flush=True)
            print(f"[{identifier}] OTP Code generated: {otp_code}", flush=True)
            
            # --- DIAGNOSTIC START ---
            try:
                from utils.network_diag import run_diagnostics
                import threading
                threading.Thread(target=run_diagnostics).start()
            except Exception as e:
                print(f"Failed to start diagnostics: {e}", flush=True)
            # --- DIAGNOSTIC END ---
            
            # 1. Database creation
            db_start = time.time()
            PendingVerification.objects.create(
                identifier=identifier,
                code=otp_code,
                session_id=session_id
            )
            print(f"[{identifier}] DB record created in {time.time() - db_start:.2f}s", flush=True)

            # 2. Send Email (Non-blocking)
            if '@' in identifier:
                from django.template.loader import render_to_string
                from django.utils.html import strip_tags

                html_message = render_to_string('accounts/emails/otp_email.html', {'otp_code': otp_code})
                plain_message = strip_tags(html_message)

                print(f"[{identifier}] Dispatching email to thread...", flush=True)
                background_send_email(
                    'Your OTP for Jarvis',
                    plain_message,
                    [identifier],
                    html_message=html_message
                )
            
            total_time = time.time() - start_time
            print(f"[{identifier}] Request finished in {total_time:.2f}s", flush=True)
            
            return Response({"session_id": session_id, "message": "OTP sent successfully"}, status=status.HTTP_200_OK)

        except Exception as e:
            total_time = time.time() - start_time
            print(f"[{identifier}] Error after {total_time:.2f}s: {str(e)}", flush=True)
            import traceback
            traceback.print_exc()
            return Response({"error": f"Internal server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        session_id = request.data.get('session_id')
        otp_code = request.data.get('otp_code')

        if not session_id or not otp_code:
            return Response({"error": "Session ID and OTP code are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Check for OTP expiration (10 minutes)
            expiry_time = timezone.now() - timedelta(minutes=10)
            pending = PendingVerification.objects.get(
                session_id=session_id, 
                code=otp_code, 
                is_verified=False,
                created_at__gte=expiry_time
            )
            
            pending.is_verified = True
            pending.save()
            
            # Check if user already exists (for login flow)
            user = User.objects.filter(models.Q(email=pending.identifier) | models.Q(phone_number=pending.identifier)).first()
            
            if user:
                token, _ = Token.objects.get_or_create(user=user)
                return Response({
                    "status": "verified",
                    "user_exists": True,
                    "token": token.key,
                    "user": UserSerializer(user).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "status": "verified",
                    "user_exists": False,
                    "session_id": session_id
                }, status=status.HTTP_200_OK)

        except PendingVerification.DoesNotExist:
            return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)

class CompleteSignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        session_id = request.data.get('session_id')
        username = request.data.get('username')
        password = request.data.get('password')
        phone_number = request.data.get('phone_number')

        if not all([session_id, username, password]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pending = PendingVerification.objects.get(session_id=session_id, is_verified=True)
            
            if User.objects.filter(username=username).exists():
                return Response({"error": "Username already taken"}, status=status.HTTP_400_BAD_REQUEST)

            email = pending.identifier if '@' in pending.identifier else None
            phone = phone_number or (pending.identifier if '@' not in pending.identifier else None)

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                phone_number=phone,
                is_active=True
            )
            
            token, _ = Token.objects.get_or_create(user=user)
            pending.delete() # Cleanup
            
            # Send Welcome Email
            if user.email:
                try:
                    from django.template.loader import render_to_string
                    from django.utils.html import strip_tags

                    html_message = render_to_string('accounts/emails/welcome_email.html', {'username': user.username})
                    plain_message = strip_tags(html_message)
                    
                    background_send_email(
                        'Welcome to Jarvis!',
                        plain_message,
                        [user.email],
                        html_message=html_message
                    )
                except Exception as e:
                    print(f"Failed to send welcome email: {e}", flush=True)

            return Response({
                "token": token.key,
                "user": UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)

        except PendingVerification.DoesNotExist:
            return Response({"error": "Invalid or unverified session"}, status=status.HTTP_400_BAD_REQUEST)

class UniversalLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        identifier = request.data.get('identifier') # email or phone
        password = request.data.get('password')
        
        if not identifier or not password:
             return Response({"error": "Identifier and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Try to find user by email or phone
        user = User.objects.filter(models.Q(email=identifier) | models.Q(phone_number=identifier)).first()
        
        if user and user.check_password(password):
            token, _ = Token.objects.get_or_create(user=user)
            
            # Send login notification email
            if user.email:
                try:
                    # Basic info
                    import datetime
                    login_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    
                    # IP and Location
                    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                    if x_forwarded_for:
                        ip = x_forwarded_for.split(',')[0]
                    else:
                        ip = request.META.get('REMOTE_ADDR')
                    
                    location = "Unknown"
                    if ip and ip != '127.0.0.1':
                        try:
                            # Simple IP geolocation (using ipinfo.io or similar if available, or just log IP)
                            # For now, we will just use the IP. 
                            # In a real app, you might use a library like 'geoip2' or an external API.
                            import requests
                            resp = requests.get(f"https://ipinfo.io/{ip}/json", timeout=2)
                            if resp.status_code == 200:
                                data = resp.json()
                                city = data.get('city', 'Unknown')
                                region = data.get('region', '')
                                country = data.get('country', '')
                                location = f"{city}, {region}, {country} ({ip})"
                            else:
                                location = f"IP: {ip}"
                        except:
                            location = f"IP: {ip}"
                    else:
                         location = "Localhost"

                    # Device Info
                    user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown Device')
                    
                    from django.template.loader import render_to_string
                    from django.utils.html import strip_tags

                    html_message = render_to_string('accounts/emails/login_notification.html', {
                        'username': user.username,
                        'time': login_time,
                        'location': location,
                        'device': user_agent
                    })
                    plain_message = strip_tags(html_message)
                    
                    background_send_email(
                        'New Login to Jarvis',
                        plain_message,
                        [user.email],
                        html_message=html_message
                    )
                except Exception as e:
                    print(f"Failed to send login notification: {e}", flush=True)

            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            })
        
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

class CheckContactsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        phone_numbers = request.data.get('phone_numbers', [])
        
        # Normalize phone numbers: remove non-numeric chars and keep last 10 digits
        from utils.formatting import normalize_phone
        
        # Normalize incoming phone numbers
        normalized_phones = [normalize_phone(p) for p in phone_numbers if p]
        
        # Get all users and filter by normalized phone numbers
        all_users = User.objects.exclude(phone_number__isnull=True).exclude(phone_number='')
        matched_users = []
        
        for user in all_users:
            user_phone_normalized = normalize_phone(user.phone_number)
            if user_phone_normalized in normalized_phones:
                matched_users.append(user)
        
        serializer = UserSerializer(matched_users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def delete(self, request, *args, **kwargs):
        user = self.get_object()
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

from .models import BlockedUser

class PublicUserProfileView(generics.RetrieveAPIView):
    """
    Retrieve public profile information for a specific user by ID.
    Respects privacy settings for profile photo visibility.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.all()
    lookup_field = 'pk'

    def retrieve(self, request, *args, **kwargs):
        try:
            user = self.get_object()
            serializer = self.get_serializer(user)
            data = serializer.data
            
            # Respect privacy settings for profile photo
            if user.privacy_profile_photo == 'nobody':
                data['profile_picture'] = None
            elif user.privacy_profile_photo == 'contacts':
                # For now, show to all authenticated users
                # In future, check if requester is in user's contacts
                pass
            
            # Check if viewer blocked this user or is blocked by them (optional UI hint)
            # For now, just return raw profile
            
            return Response(data)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class BlockUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """List blocked users"""
        blocked_users = BlockedUser.objects.filter(blocker=request.user)
        # Return list of blocked user IDs
        blocked_ids = blocked_users.values_list('blocked_id', flat=True)
        return Response(blocked_ids)

    def post(self, request):
        """Block a user"""
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user_to_block = User.objects.get(id=user_id)
            if user_to_block == request.user:
                 return Response({"error": "Cannot block yourself"}, status=status.HTTP_400_BAD_REQUEST)

            BlockedUser.objects.get_or_create(blocker=request.user, blocked=user_to_block)
            return Response({"status": "blocked"}, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request):
        """Unblock a user"""
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user_to_unblock = User.objects.get(id=user_id)
            deleted_count, _ = BlockedUser.objects.filter(blocker=request.user, blocked=user_to_unblock).delete()
            
            if deleted_count > 0:
                # Release pending messages
                # Find undelivered messages from this user to me
                # usage of distinct() might be needed if multiple conversations, but usually just one 1-on-1
                pending_messages = Message.objects.filter(
                    sender=user_to_unblock,
                    conversation__participants=request.user,
                    is_delivered=False
                ).distinct()
                
                # We can either push them via WS or just let the user fetch them. 
                # Pushing is better for "live" feel.
                
                channel_layer = get_channel_layer()
                
                for message in pending_messages:
                    # Determine conversation link?
                    # We just need to send it to the current user (the blocker who is unblocking)
                   
                    data = MessageSerializer(message).data
                    async_to_sync(channel_layer.group_send)(
                        f"user_{request.user.id}",
                        {
                            'type': 'chat_message',
                            'message': data
                        }
                    )
            
            return Response({"status": "unblocked"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
             return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class UpdateFCMTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        fcm_token = request.data.get('fcm_token')
        if not fcm_token:
            return Response({"error": "Token required"}, status=status.HTTP_400_BAD_REQUEST)

        request.user.fcm_token = fcm_token
        request.user.save()
        return Response({"status": "updated"}, status=status.HTTP_200_OK)
