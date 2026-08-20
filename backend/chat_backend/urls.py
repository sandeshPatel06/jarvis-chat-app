from django.contrib import admin
from django.urls import path, include
from .views import health_check

urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('api/health/', health_check, name='api-health-check'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/calls/', include('calls.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
