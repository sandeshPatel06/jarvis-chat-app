from django.contrib import admin
from .models import Call

@admin.register(Call)
class CallAdmin(admin.ModelAdmin):
    list_display = ('id', 'caller', 'receiver', 'status', 'started_at', 'ended_at', 'is_video')
    list_filter = ('status', 'is_video', 'started_at')
    search_fields = ('caller__username', 'receiver__username')
    readonly_fields = ('started_at',)
    raw_id_fields = ('caller', 'receiver')
