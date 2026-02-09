from django.urls import path
from .views import CallViewSet

urlpatterns = [
    path('', CallViewSet.as_view(), name='calls-list'),
]
