from django.contrib import admin
from .models import Conversation, Message, Reaction


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_participants_count', 'created_at', 'is_deleted')
    list_filter = ('created_at', 'is_deleted')
    search_fields = ('id', 'participants__username')
    filter_horizontal = ('participants',)
    readonly_fields = ('created_at',)
    
    def get_participants_count(self, obj):
        return obj.participants.count()
    get_participants_count.short_description = 'Participants'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'conversation', 'get_text_preview', 'timestamp', 'is_read', 'is_delivered', 'file_type', 'file_name', 'reply_to', 'deleted_at')
    list_filter = ('timestamp', 'is_read', 'is_delivered', 'file_type', 'deleted_at')
    search_fields = ('text', 'sender__username', 'conversation__id', 'file_name')
    readonly_fields = ('timestamp',)
    raw_id_fields = ('conversation', 'sender', 'reply_to')
    
    def get_text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    get_text_preview.short_description = 'Message'
    
    def has_file(self, obj):
        return bool(obj.file)
    has_file.boolean = True
    has_file.short_description = 'File'


@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'message', 'emoji', 'timestamp')
    list_filter = ('timestamp', 'emoji')
    search_fields = ('user__username', 'message__id', 'emoji')
    readonly_fields = ('timestamp',)
    raw_id_fields = ('message', 'user')
