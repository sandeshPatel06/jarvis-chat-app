from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    list_display = UserAdmin.list_display + ('is_online', 'last_seen', 'phone_number')
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('phone_number', 'profile_picture', 'bio', 'last_seen', 'is_online')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Additional Info', {'fields': ('phone_number', 'profile_picture', 'bio', 'last_seen', 'is_online')}),
    )

admin.site.register(User, CustomUserAdmin)
