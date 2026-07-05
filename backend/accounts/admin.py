from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, BlockedUser, OTP, PendingVerification

class CustomUserAdmin(UserAdmin):
    list_display = UserAdmin.list_display + ('is_online', 'last_seen', 'phone_number', 'fcm_token')
    search_fields = UserAdmin.search_fields + ('phone_number', 'fcm_token')
    fieldsets = UserAdmin.fieldsets + (
        ('Profile Info', {'fields': ('phone_number', 'profile_picture', 'bio', 'last_seen', 'is_online', 'fcm_token')}),
        ('Privacy Settings', {'fields': ('privacy_last_seen', 'privacy_profile_photo', 'privacy_read_receipts', 'privacy_disappearing_messages_timer')}),
        ('Notification Settings', {'fields': ('notifications_enabled', 'notifications_sound', 'notifications_groups_enabled')}),
        ('Security Settings', {'fields': ('security_notifications_enabled', 'two_step_verification_enabled')}),
        ('Storage & App Settings', {'fields': ('storage_auto_download_media', 'chat_wallpaper', 'app_language')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Additional Info', {'fields': ('phone_number', 'profile_picture', 'bio', 'last_seen', 'is_online', 'fcm_token')}),
    )

admin.site.register(User, CustomUserAdmin)

@admin.register(BlockedUser)
class BlockedUserAdmin(admin.ModelAdmin):
    list_display = ('blocker', 'blocked', 'timestamp')
    search_fields = ('blocker__username', 'blocked__username')
    list_filter = ('timestamp',)

@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ('user', 'code', 'created_at', 'is_verified')
    search_fields = ('user__username', 'code')
    list_filter = ('is_verified', 'created_at')

@admin.register(PendingVerification)
class PendingVerificationAdmin(admin.ModelAdmin):
    list_display = ('identifier', 'code', 'session_id', 'created_at', 'is_verified')
    search_fields = ('identifier', 'code', 'session_id')
    list_filter = ('is_verified', 'created_at')
