from django.urls import path
from .views import CallViewSet, CallDetailView, ClearCallHistoryView, BulkDeleteCallsView

urlpatterns = [
    path('', CallViewSet.as_view(), name='calls-list'),
    path('<int:pk>/', CallDetailView.as_view(), name='call-detail'),
    path('clear/', ClearCallHistoryView.as_view(), name='calls-clear'),
    path('bulk-delete/', BulkDeleteCallsView.as_view(), name='calls-bulk-delete'),
]
