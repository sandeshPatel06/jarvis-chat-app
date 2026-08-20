import os
import time
from datetime import datetime, timezone
from django.conf import settings
from django.db import connection
from django.http import JsonResponse

def health_check(request):
    """
    Dynamic health check endpoint that tests live database connectivity
    and returns real-time status and latency metrics.
    """
    start_time = time.time()
    db_status = "unhealthy"
    db_response_time_ms = None
    overall_status = "ok"
    http_status = 200

    service_name = getattr(settings, 'SERVICE_NAME', os.getenv('SERVICE_NAME', 'jarvis-chat-backend'))

    # Test Database Connectivity
    try:
        db_start = time.time()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
        db_response_time_ms = round((time.time() - db_start) * 1000, 2)
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        overall_status = "error"
        http_status = 503

    response_time_ms = round((time.time() - start_time) * 1000, 2)

    return JsonResponse(
        {
            "status": overall_status,
            "service": service_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": {
                "database": {
                    "status": db_status,
                    "latency_ms": db_response_time_ms
                }
            },
            "latency_ms": response_time_ms
        },
        status=http_status
    )


