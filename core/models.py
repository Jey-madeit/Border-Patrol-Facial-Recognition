from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import uuid


class User(AbstractUser):
    """Custom user model for Border Patrol system"""
    
    ROLE_CHOICES = [
        ('officer', 'Officer'),
        ('admin', 'Administrator'),
        ('supervisor', 'Supervisor'),
    ]
    
    DEPARTMENT_CHOICES = [
        ('field_operations', 'Field Operations'),
        ('intelligence', 'Intelligence'),
        ('investigations', 'Investigations'),
        ('support', 'Support'),
        ('administration', 'Administration'),
    ]
    
    RANK_CHOICES = [
        ('agent', 'Agent'),
        ('senior_agent', 'Senior Agent'),
        ('supervisor', 'Supervisor'),
        ('chief', 'Chief'),
        ('administrator', 'Administrator'),
    ]
    
    # Basic information
    badge_id = models.CharField(max_length=20, unique=True, help_text="Officer badge ID (e.g., BP001)")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='officer')
    department = models.CharField(max_length=30, choices=DEPARTMENT_CHOICES, default='field_operations')
    rank = models.CharField(max_length=20, choices=RANK_CHOICES, default='agent')
    phone = models.CharField(max_length=20, blank=True)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    
    # Status and activity
    is_online = models.BooleanField(default=False)
    last_active = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=[
        ('on_duty', 'On Duty'),
        ('off_duty', 'Off Duty'),
        ('on_leave', 'On Leave'),
        ('suspended', 'Suspended'),
    ], default='off_duty')
    
    # Security
    password_changed_at = models.DateTimeField(default=timezone.now)
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['badge_id']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.badge_id})"
    
    def get_display_name(self):
        return self.get_full_name() or self.username
    
    def is_admin(self):
        return self.role in ['admin', 'supervisor']
    
    def is_officer(self):
        return self.role == 'officer'
    
    def can_manage_users(self):
        return self.role in ['admin', 'supervisor']
    
    def can_view_analytics(self):
        return self.role in ['admin', 'supervisor']
    
    def can_manage_incidents(self):
        return self.role in ['admin', 'supervisor', 'officer']


class AuditLog(models.Model):
    """Audit log for tracking user actions"""
    
    ACTION_CHOICES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('view', 'View'),
        ('export', 'Export'),
        ('import', 'Import'),
        ('reset_password', 'Reset Password'),
        ('face_recognition', 'Face Recognition'),
        ('incident_report', 'Incident Report'),
        ('image_upload', 'Image Upload'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    target_type = models.CharField(max_length=50, blank=True)  # e.g., 'Officer', 'Image', 'Incident'
    target_id = models.CharField(max_length=100, blank=True)  # ID of the target object
    details = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['target_type', 'target_id']),
        ]
    
    def __str__(self):
        return f"{self.user.badge_id} - {self.action} - {self.timestamp}"


class SystemConfiguration(models.Model):
    """System configuration settings"""
    
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True)
    data_type = models.CharField(max_length=20, choices=[
        ('string', 'String'),
        ('integer', 'Integer'),
        ('boolean', 'Boolean'),
        ('json', 'JSON'),
    ], default='string')
    is_public = models.BooleanField(default=False)  # Can be viewed by officers
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'system_configuration'
        ordering = ['key']
    
    def __str__(self):
        return f"{self.key}: {self.value}"


class Notification(models.Model):
    """System notifications and alerts"""
    
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    TYPE_CHOICES = [
        ('system', 'System'),
        ('security', 'Security'),
        ('incident', 'Incident'),
        ('maintenance', 'Maintenance'),
        ('general', 'General'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    message = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='general')
    
    # Targeting
    target_users = models.ManyToManyField(User, blank=True, related_name='notifications')
    target_roles = models.JSONField(default=list, blank=True)  # List of roles to target
    target_departments = models.JSONField(default=list, blank=True)  # List of departments to target
    
    # Status
    is_read = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_notifications')
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.severity})"


class UserSession(models.Model):
    """Track user sessions for security"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=40, unique=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        db_table = 'user_sessions'
        ordering = ['-last_activity']
    
    def __str__(self):
        return f"{self.user.badge_id} - {self.session_key}"
    
    def is_expired(self):
        return timezone.now() > self.expires_at


class PasswordResetRequest(models.Model):
    """Password reset requests"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('completed', 'Completed'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]
    
    METHOD_CHOICES = [
        ('email', 'Email'),
        ('temporary', 'Temporary Password'),
        ('force', 'Force Change'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_resets')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    reason = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Reset details
    reset_token = models.CharField(max_length=100, blank=True)
    temporary_password = models.CharField(max_length=100, blank=True)
    expires_at = models.DateTimeField()
    
    # Admin details
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='requested_resets')
    admin_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'password_reset_requests'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Password reset for {self.user.badge_id} - {self.status}"
    
    def is_expired(self):
        return timezone.now() > self.expires_at


class UploadedImage(models.Model):
    """Model for storing uploaded images"""
    IMAGE_TYPES = [
        ('surveillance', 'Surveillance Image'),
        ('incident', 'Incident Photo'),
        ('person', 'Person of Interest'),
        ('vehicle', 'Vehicle Image'),
        ('document', 'Document'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    image_type = models.CharField(max_length=20, choices=IMAGE_TYPES, default='other')
    image = models.ImageField(upload_to='uploads/images/%Y/%m/%d/')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_images')
    location = models.CharField(max_length=200, blank=True)
    tags = models.CharField(max_length=500, blank=True, help_text="Comma-separated tags")
    is_public = models.BooleanField(default=False)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'uploaded_images'
        ordering = ['-created_at']
        verbose_name = 'Uploaded Image'
        verbose_name_plural = 'Uploaded Images'
    
    def __str__(self):
        return f"{self.title} - {self.uploaded_by.username}"
    
    def save(self, *args, **kwargs):
        if self.image:
            self.file_size = self.image.size
        super().save(*args, **kwargs)


class AnalyticsData(models.Model):
    """Model for storing analytics data"""
    METRIC_TYPES = [
        ('login_attempts', 'Login Attempts'),
        ('active_users', 'Active Users'),
        ('image_uploads', 'Image Uploads'),
        ('incident_reports', 'Incident Reports'),
        ('system_usage', 'System Usage'),
        ('daily_activity', 'Daily Activity'),
        ('user_engagement', 'User Engagement'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metric_type = models.CharField(max_length=50, choices=METRIC_TYPES)
    value = models.FloatField()
    metadata = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'analytics_data'
        ordering = ['-timestamp']
        verbose_name = 'Analytics Data'
        verbose_name_plural = 'Analytics Data'
        indexes = [
            models.Index(fields=['metric_type', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.metric_type}: {self.value} - {self.timestamp}"