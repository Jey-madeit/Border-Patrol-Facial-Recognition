from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import User, AuditLog, SystemConfiguration, Notification, UploadedImage, AnalyticsData


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'badge_id', 'role', 'department', 'rank', 'phone', 'bio',
            'avatar', 'is_online', 'last_active', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_active']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Add computed fields
        data['display_name'] = instance.get_display_name()
        data['is_admin'] = instance.is_admin()
        data['is_officer'] = instance.is_officer()
        return data


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating User model"""
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'badge_id', 'role', 'department', 'rank', 'phone', 'bio',
            'password', 'confirm_password'
        ]
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        return data
    
    def validate_badge_id(self, value):
        if User.objects.filter(badge_id=value).exists():
            raise serializers.ValidationError("Badge ID already exists")
        return value
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User.objects.create(
            password=make_password(password),
            **validated_data
        )
        return user


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model"""
    user_name = serializers.CharField(source='user.get_display_name', read_only=True)
    user_badge_id = serializers.CharField(source='user.badge_id', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_name', 'user_badge_id', 'action', 'target_type',
            'target_id', 'details', 'ip_address', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']


class SystemConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for SystemConfiguration model"""
    
    class Meta:
        model = SystemConfiguration
        fields = [
            'id', 'key', 'value', 'description', 'data_type',
            'is_public', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model"""
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'severity', 'notification_type',
            'is_read', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UploadedImageSerializer(serializers.ModelSerializer):
    """Serializer for UploadedImage model"""
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_display_name', read_only=True)
    file_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = UploadedImage
        fields = [
            'id', 'title', 'description', 'image_type', 'image', 
            'uploaded_by', 'uploaded_by_name', 'location', 'tags', 
            'is_public', 'file_size', 'file_size_mb', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'file_size', 'created_at', 'updated_at']
    
    def get_file_size_mb(self, obj):
        if obj.file_size:
            return round(obj.file_size / (1024 * 1024), 2)
        return 0
    
    def create(self, validated_data):
        # Set the uploaded_by field to the current user
        validated_data['uploaded_by'] = self.context['request'].user
        return super().create(validated_data)


class AnalyticsDataSerializer(serializers.ModelSerializer):
    """Serializer for AnalyticsData model"""
    
    class Meta:
        model = AnalyticsData
        fields = ['id', 'metric_type', 'value', 'metadata', 'timestamp']
        read_only_fields = ['id', 'timestamp']
