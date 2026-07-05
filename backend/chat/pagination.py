from django.utils.dateparse import parse_datetime
from rest_framework.pagination import LimitOffsetPagination


class MessageHistoryPagination(LimitOffsetPagination):
    default_limit = 50
    max_limit = 100


def apply_history_cursor(queryset, request):
    before = request.query_params.get('before')
    if not before:
        return queryset

    before_dt = parse_datetime(before)
    if before_dt is None:
        return queryset

    return queryset.filter(timestamp__lt=before_dt)
