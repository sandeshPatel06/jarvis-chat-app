from rest_framework.views import exception_handler
from django.db import IntegrityError
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler for Django Rest Framework to return user-friendly error messages.
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # If response is None, it means the exception was not handled by DRF (e.g. IntegrityError)
    if response is None:
        if isinstance(exc, IntegrityError):
            db_err_msg = str(exc).lower()
            if 'unique constraint failed' in db_err_msg:
                if 'phone_number' in db_err_msg:
                    message = "A user with this phone number already exists."
                elif 'username' in db_err_msg:
                    message = "A user with this username already exists."
                elif 'email' in db_err_msg:
                    message = "A user with this email address already exists."
                else:
                    message = "This record already exists."
                return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({'error': 'A database error occurred. Please try again later.'}, status=status.HTTP_400_BAD_REQUEST)

        # Log the unhandled exception for debugging
        logger.error(f"Unhandled Exception: {str(exc)}", exc_info=True)

        # Handle other unhandled exceptions (Standard 500 errors)
        # We want to avoid crashing with a traceback in the response
        return Response({
            'error': 'An unexpected error occurred on the server.',
            'detail': str(exc) if getattr(context.get('request'), 'user', None) and context['request'].user.is_staff else "Please contact support if this persists."
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # For standard DRF exceptions, ensure the response format is consistent
    if response is not None:
        # If it's a validation error, it might have nested details
        if response.status_code == 400 and isinstance(response.data, dict):
            # If 'error' is not already in response.data, we might want to wrap it
            if 'error' not in response.data:
                # Common DRF validation error format is {field: [errors]} or {'non_field_errors': [errors]}
                # We can simplify this for the UI if needed
                pass

    return response
