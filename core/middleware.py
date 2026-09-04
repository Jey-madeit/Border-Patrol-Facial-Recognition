import logging
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user_model
from .models import AuditLog
import json

User = get_user_model()
logger = logging.getLogger(__name__)


class AuditLogMiddleware(MiddlewareMixin):
    """Middleware to log user actions for audit purposes"""
    
    def process_request(self, request):
        """Process the request and log user actions"""
        # Skip logging for certain paths
        skip_paths = [
            '/admin/jsi18n/',
            '/static/',
            '/media/',
            '/favicon.ico',
        ]
        
        if any(request.path.startswith(path) for path in skip_paths):
            return None
        
        # Get user and IP
        user = getattr(request, 'user', None)
        ip_address = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Only log for authenticated users
        if user and user.is_authenticated:
            # Determine action based on HTTP method and path
            action = self.get_action_from_request(request)
            
            if action:
                try:
                    # Create audit log entry
                    AuditLog.objects.create(
                        user=user,
                        action=action,
                        target_type=self.get_target_type(request),
                        target_id=self.get_target_id(request),
                        details=self.get_action_details(request),
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                except Exception as e:
                    logger.error(f"Failed to create audit log: {e}")
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def get_action_from_request(self, request):
        """Determine action from HTTP method and path"""
        method = request.method
        path = request.path
        
        # API endpoints
        if path.startswith('/api/'):
            if method == 'POST':
                if '/login/' in path:
                    return 'login'
                elif '/recognize/' in path:
                    return 'face_recognition'
                elif '/images/' in path:
                    return 'image_upload'
                elif '/incidents/' in path:
                    return 'incident_report'
                else:
                    return 'create'
            elif method == 'PUT' or method == 'PATCH':
                return 'update'
            elif method == 'DELETE':
                return 'delete'
            elif method == 'GET':
                return 'view'
        
        # Admin interface
        elif path.startswith('/admin/'):
            if method == 'POST':
                if '/logout/' in path:
                    return 'logout'
                else:
                    return 'update'
            elif method == 'GET':
                return 'view'
        
        return None
    
    def get_target_type(self, request):
        """Get target type from request path"""
        path = request.path
        
        if '/users/' in path or '/officers/' in path:
            return 'User'
        elif '/images/' in path:
            return 'Image'
        elif '/incidents/' in path:
            return 'Incident'
        elif '/patrol/' in path:
            return 'Patrol'
        elif '/reports/' in path:
            return 'Report'
        else:
            return 'Unknown'
    
    def get_target_id(self, request):
        """Extract target ID from URL"""
        path = request.path
        parts = path.strip('/').split('/')
        
        # Look for UUID or ID in URL
        for part in parts:
            if len(part) == 36 and '-' in part:  # UUID format
                return part
            elif part.isdigit():
                return part
        
        return ''
    
    def get_action_details(self, request):
        """Get additional details about the action"""
        details = {
            'method': request.method,
            'path': request.path,
            'content_type': request.META.get('CONTENT_TYPE', ''),
        }
        
        # Add query parameters for GET requests
        if request.method == 'GET' and request.GET:
            details['query_params'] = dict(request.GET)
        
        # Add request body for POST/PUT/PATCH (be careful with sensitive data)
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                body = request.body.decode('utf-8')
                if body and len(body) < 1000:  # Only log small bodies
                    # Don't log sensitive data
                    if 'password' not in body.lower() and 'token' not in body.lower():
                        details['body'] = body
            except:
                pass
        
        return json.dumps(details)
