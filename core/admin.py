from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, AuditLog, SystemConfiguration, Notification, UserSession, PasswordResetRequest, UploadedImage, AnalyticsData


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for User model"""
    list_display = ['badge_id', 'username', 'email', 'first_name', 'last_name', 'role', 'department', 'is_online', 'last_active']
    list_filter = ['role', 'department', 'is_online', 'is_active', 'created_at']
    search_fields = ['badge_id', 'username', 'email', 'first_name', 'last_name']
    ordering = ['badge_id']
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'phone', 'bio', 'avatar')}),
        ('Border Patrol Info', {'fields': ('badge_id', 'role', 'department', 'rank', 'status')}),
        ('Activity', {'fields': ('is_online', 'last_active')}),
        ('Security', {'fields': ('password_changed_at', 'failed_login_attempts', 'locked_until')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'badge_id', 'role', 'department', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'last_login', 'date_joined']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin configuration for AuditLog model"""
    list_display = ['user', 'action', 'target_type', 'target_id', 'timestamp', 'ip_address']
    list_filter = ['action', 'target_type', 'timestamp']
    search_fields = ['user__badge_id', 'user__username', 'target_id', 'details']
    ordering = ['-timestamp']
    readonly_fields = ['id', 'timestamp']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SystemConfiguration)
class SystemConfigurationAdmin(admin.ModelAdmin):
    """Admin configuration for SystemConfiguration model"""
    list_display = ['key', 'value', 'data_type', 'is_public', 'updated_at']
    list_filter = ['data_type', 'is_public', 'created_at']
    search_fields = ['key', 'description']
    ordering = ['key']
    
    fieldsets = (
        (None, {'fields': ('key', 'value', 'description', 'data_type')}),
        ('Access', {'fields': ('is_public',)}),
        ('Metadata', {'fields': ('created_at', 'updated_at', 'updated_by')}),
    )
    
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin configuration for Notification model"""
    list_display = ['title', 'severity', 'notification_type', 'is_active', 'is_read', 'created_at']
    list_filter = ['severity', 'notification_type', 'is_active', 'is_read', 'created_at']
    search_fields = ['title', 'message']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('title', 'message', 'severity', 'notification_type')}),
        ('Targeting', {'fields': ('target_users', 'target_roles', 'target_departments')}),
        ('Status', {'fields': ('is_read', 'is_active', 'expires_at')}),
        ('Metadata', {'fields': ('created_at', 'created_by')}),
    )
    
    readonly_fields = ['created_at']


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    """Admin configuration for UserSession model"""
    list_display = ['user', 'session_key', 'ip_address', 'is_active', 'created_at', 'last_activity']
    list_filter = ['is_active', 'created_at']
    search_fields = ['user__badge_id', 'user__username', 'session_key', 'ip_address']
    ordering = ['-last_activity']
    readonly_fields = ['created_at', 'last_activity']


@admin.register(PasswordResetRequest)
class PasswordResetRequestAdmin(admin.ModelAdmin):
    """Admin configuration for PasswordResetRequest model"""
    list_display = ['user', 'method', 'reason', 'status', 'created_at', 'requested_by']
    list_filter = ['method', 'status', 'created_at']
    search_fields = ['user__badge_id', 'user__username', 'reason']
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at', 'completed_at']


@admin.register(UploadedImage)
class UploadedImageAdmin(admin.ModelAdmin):
    """Admin configuration for UploadedImage model"""
    list_display = ['title', 'image_type', 'uploaded_by', 'file_size', 'is_public', 'created_at']
    list_filter = ['image_type', 'is_public', 'created_at']
    search_fields = ['title', 'description', 'location', 'tags']
    ordering = ['-created_at']
    readonly_fields = ['file_size', 'created_at', 'updated_at']
    
    fieldsets = (
        (None, {'fields': ('title', 'description', 'image_type', 'image')}),
        ('Metadata', {'fields': ('location', 'tags', 'is_public')}),
        ('System', {'fields': ('uploaded_by', 'file_size', 'created_at', 'updated_at')}),
    )


@admin.register(AnalyticsData)
class AnalyticsDataAdmin(admin.ModelAdmin):
    """Admin configuration for AnalyticsData model"""
    list_display = ['metric_type', 'value', 'timestamp']
    list_filter = ['metric_type', 'timestamp']
    search_fields = ['metric_type']
    ordering = ['-timestamp']
    readonly_fields = ['timestamp']
    
    fieldsets = (
        (None, {'fields': ('metric_type', 'value', 'metadata')}),
        ('System', {'fields': ('timestamp',)}),
    )