from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import json

def login_view(request):
    """Serve the login page"""
    return render(request, 'core/login.html')

def login_fixed_view(request):
    """Serve the fixed login page"""
    return render(request, 'core/login_fixed.html')

def debug_login_view(request):
    """Serve the debug login page"""
    return render(request, 'core/debug_login.html')

def admin_dashboard_view(request):
    """Serve the admin dashboard (admin users only)"""
    # For now, just serve the template - authentication will be handled by frontend
    return render(request, 'core/admin-dashboard.html')

def officer_dashboard_view(request):
    """Serve the officer dashboard"""
    # For now, just serve the template - authentication will be handled by frontend
    return render(request, 'core/officer-dashboard.html')

def face_recognition_view(request):
    """Serve the face recognition page"""
    # For now, just serve the template - authentication will be handled by frontend
    return render(request, 'core/face-recognition.html')

def index_view(request):
    """Serve the main index page"""
    return render(request, 'core/index.html')

def password_reset_view(request):
    """Serve the password reset page"""
    return render(request, 'core/password-reset.html')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_api_view(request):
    """API endpoint for logout"""
    try:
        # In a real implementation, you might want to blacklist the token
        # For now, we'll just return success
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def access_denied_view(request):
    """Serve access denied page"""
    return render(request, 'core/access_denied.html', {'message': 'Access denied'})

def test_login_view(request):
    """Serve the test login page"""
    return render(request, 'core/test_login.html')

def analytics_view(request):
    """Serve the analytics page (admin only)"""
    return render(request, 'core/analytics.html')

def image_upload_view(request):
    """Serve the image upload page"""
    return render(request, 'core/image-upload.html')

def image_management_view(request):
    """Serve the image management page"""
    return render(request, 'core/image-management.html')

def user_management_view(request):
    """Serve the user management page"""
    return render(request, 'core/user-management.html')

def audit_logs_view(request):
    """Serve the audit logs page"""
    return render(request, 'core/audit-logs.html')
