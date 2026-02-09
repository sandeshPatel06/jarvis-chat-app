from django.urls import path
from .views import RequestOTPView, UniversalLoginView, CheckContactsView, UserProfileView, PublicUserProfileView, BlockUserView, VerifyOTPView, CompleteSignupView, UpdateFCMTokenView

urlpatterns = [
    path('request-otp/', RequestOTPView.as_view(), name='request-otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('complete-signup/', CompleteSignupView.as_view(), name='complete-signup'),
    path('login/', UniversalLoginView.as_view(), name='login'),
    path('check-contacts/', CheckContactsView.as_view(), name='check-contacts'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('users/<int:pk>/', PublicUserProfileView.as_view(), name='public-user-profile'),
    path('block/', BlockUserView.as_view(), name='block-user'),
    path('fcm-token/', UpdateFCMTokenView.as_view(), name='update-fcm-token'),
]
