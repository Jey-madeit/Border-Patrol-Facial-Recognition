from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from .models import User, AuditLog, SystemConfiguration, Notification, UploadedImage, AnalyticsData
from .serializers import UserSerializer, UserCreateSerializer, AuditLogSerializer, SystemConfigurationSerializer, UploadedImageSerializer, AnalyticsDataSerializer
from django.db.models import Q
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class UserListCreateView(generics.ListCreateAPIView):
    """List and create users"""
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer
    
    def get_queryset(self):
        # Only admins can see all users
        if self.request.user.is_admin():
            return User.objects.all()
        # Officers can only see themselves
        return User.objects.filter(id=self.request.user.id)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a user"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only admins can access all users
        if self.request.user.is_admin():
            return User.objects.all()
        # Officers can only access themselves
        return User.objects.filter(id=self.request.user.id)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """User login endpoint"""
    try:
        badge_id = request.data.get('badgeId')
        password = request.data.get('password')
        role = request.data.get('role')
        
        if not badge_id or not password or not role:
            return Response({
                'success': False,
                'message': 'Badge ID, password, and role are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find user by badge ID and role
        try:
            user = User.objects.get(badge_id=badge_id, role=role)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if account is locked
        if user.locked_until and timezone.now() < user.locked_until:
            return Response({
                'success': False,
                'message': 'Account is temporarily locked due to multiple failed login attempts'
            }, status=status.HTTP_423_LOCKED)
        
        # Authenticate user
        if user.check_password(password):
            # Reset failed attempts
            user.failed_login_attempts = 0
            user.locked_until = None
            user.is_online = True
            user.last_active = timezone.now()
            user.save()
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            return Response({
                'success': True,
                'message': 'Login successful',
                'user': UserSerializer(user).data,
                'tokens': {
                    'access': str(access_token),
                    'refresh': str(refresh)
                }
            })
        else:
            # Increment failed attempts
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = timezone.now() + timezone.timedelta(minutes=30)
            user.save()
            
            return Response({
                'success': False,
                'message': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
    except Exception as e:
        logger.error(f"Login error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred during login'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """User logout endpoint"""
    try:
        user = request.user
        user.is_online = False
        user.save()
        
        return Response({
            'success': True,
            'message': 'Logout successful'
        })
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred during logout'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def profile_view(request):
    """Get current user profile"""
    try:
        serializer = UserSerializer(request.user)
        return Response({
            'success': True,
            'user': serializer.data
        })
    except Exception as e:
        logger.error(f"Profile error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred while fetching profile'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def update_profile_view(request):
    """Update current user profile"""
    try:
        user = request.user
        data = request.data
        
        # Update allowed fields
        allowed_fields = ['first_name', 'last_name', 'email', 'phone', 'bio']
        for field in allowed_fields:
            if field in data:
                setattr(user, field, data[field])
        
        user.save()
        
        return Response({
            'success': True,
            'message': 'Profile updated successfully',
            'user': UserSerializer(user).data
        })
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred while updating profile'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def audit_logs_view(request):
    """Get audit logs (admin only)"""
    if not request.user.is_admin():
        return Response({
            'success': False,
            'message': 'Access denied. Admin privileges required.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get query parameters
        start_date = request.GET.get('start')
        end_date = request.GET.get('end')
        user_filter = request.GET.get('user')
        action_filter = request.GET.get('action')
        
        # Build queryset
        queryset = AuditLog.objects.all()
        
        if start_date:
            queryset = queryset.filter(timestamp__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__date__lte=end_date)
        if user_filter:
            queryset = queryset.filter(user__role=user_filter)
        if action_filter:
            queryset = queryset.filter(action=action_filter)
        
        # Paginate results
        page_size = 50
        page = int(request.GET.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size
        
        logs = queryset.order_by('-timestamp')[start:end]
        serializer = AuditLogSerializer(logs, many=True)
        
        return Response({
            'success': True,
            'logs': serializer.data,
            'total': queryset.count(),
            'page': page,
            'page_size': page_size
        })
    except Exception as e:
        logger.error(f"Audit logs error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred while fetching audit logs'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def system_config_view(request):
    """Get system configuration"""
    try:
        # Only show public configs to officers
        if request.user.is_officer():
            configs = SystemConfiguration.objects.filter(is_public=True)
        else:
            configs = SystemConfiguration.objects.all()
        
        serializer = SystemConfigurationSerializer(configs, many=True)
        
        return Response({
            'success': True,
            'configs': serializer.data
        })
    except Exception as e:
        logger.error(f"System config error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred while fetching system configuration'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def notifications_view(request):
    """Get user notifications"""
    try:
        user = request.user
        
        # Get notifications for user
        notifications = Notification.objects.filter(
            Q(target_users=user) | 
            Q(target_roles__contains=[user.role]) |
            Q(target_departments__contains=[user.department])
        ).filter(is_active=True).order_by('-created_at')
        
        # Mark as read if requested
        if request.GET.get('mark_read') == 'true':
            notifications.update(is_read=True)
        
        return Response({
            'success': True,
            'notifications': [
                {
                    'id': str(n.id),
                    'title': n.title,
                    'message': n.message,
                    'severity': n.severity,
                    'type': n.notification_type,
                    'is_read': n.is_read,
                    'created_at': n.created_at.isoformat()
                }
                for n in notifications
            ]
        })
    except Exception as e:
        logger.error(f"Notifications error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred while fetching notifications'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_stats_view(request):
    """Get dashboard statistics"""
    try:
        user = request.user
        
        # Basic stats
        stats = {
            'user': {
                'name': user.get_full_name(),
                'badge_id': user.badge_id,
                'role': user.role,
                'department': user.department,
                'is_online': user.is_online
            }
        }
        
        # Admin-specific stats
        if user.is_admin():
            stats.update({
                'total_users': User.objects.count(),
                'online_users': User.objects.filter(is_online=True).count(),
                'total_incidents': 0,  # Will be updated when incidents app is ready
                'total_images': 0,  # Will be updated when face_recognition app is ready
            })
        
        return Response({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred while fetching dashboard statistics'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Image Upload Views
class UploadedImageListCreateView(generics.ListCreateAPIView):
    """List and create uploaded images"""
    queryset = UploadedImage.objects.all()
    serializer_class = UploadedImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = UploadedImage.objects.all()
        
        # Admins can see all images, officers can only see their own
        if not self.request.user.is_admin():
            queryset = queryset.filter(uploaded_by=self.request.user)
        
        # Filter by image type
        image_type = self.request.query_params.get('image_type')
        if image_type and image_type != 'all':
            queryset = queryset.filter(image_type=image_type)
        
        # Search by title or description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search) |
                Q(tags__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
    
    def list(self, request, *args, **kwargs):
        # Get pagination parameters
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 12))
        
        # Get queryset
        queryset = self.get_queryset()
        
        # Calculate pagination
        start = (page - 1) * page_size
        end = start + page_size
        
        # Get paginated results
        images = queryset[start:end]
        serializer = self.get_serializer(images, many=True)
        
        return Response({
            'results': serializer.data,
            'count': queryset.count(),
            'page': page,
            'page_size': page_size,
            'total_pages': (queryset.count() + page_size - 1) // page_size
        })


class UploadedImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete an uploaded image"""
    queryset = UploadedImage.objects.all()
    serializer_class = UploadedImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Admins can access all images, officers can only access their own
        if self.request.user.is_admin():
            return UploadedImage.objects.all()
        return UploadedImage.objects.filter(uploaded_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """Delete an image with audit logging"""
        try:
            instance = self.get_object()
            
            # Log the deletion
            AuditLog.objects.create(
                user=request.user,
                action='delete',
                target_type='Image',
                target_id=str(instance.id),
                details=f'Deleted image: {instance.title}',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return super().destroy(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Image deletion error: {e}")
            return Response({
                'success': False,
                'message': 'An error occurred while deleting the image'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_image_view(request):
    """Upload image endpoint"""
    try:
        if 'image' not in request.FILES:
            return Response({
                'success': False,
                'message': 'No image file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        image_file = request.FILES['image']
        
        # Validate file size (max 10MB)
        if image_file.size > 10 * 1024 * 1024:
            return Response({
                'success': False,
                'message': 'File size too large. Maximum size is 10MB.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if image_file.content_type not in allowed_types:
            return Response({
                'success': False,
                'message': 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create image record
        image_data = {
            'title': request.data.get('title', f'Image {timezone.now().strftime("%Y-%m-%d %H:%M")}'),
            'description': request.data.get('description', ''),
            'image_type': request.data.get('image_type', 'other'),
            'location': request.data.get('location', ''),
            'tags': request.data.get('tags', ''),
            'is_public': request.data.get('is_public', 'false').lower() == 'true',
            'image': image_file
        }
        
        serializer = UploadedImageSerializer(data=image_data, context={'request': request})
        if serializer.is_valid():
            image = serializer.save()
            
            # Log the upload
            AuditLog.objects.create(
                user=request.user,
                action='image_upload',
                target_type='Image',
                target_id=str(image.id),
                details=f'Uploaded image: {image.title}',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'success': True,
                'message': 'Image uploaded successfully',
                'image': UploadedImageSerializer(image).data
            })
        else:
            return Response({
                'success': False,
                'message': 'Invalid data provided',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Image upload error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred while uploading the image'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Analytics Views
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def analytics_view(request):
    """Get analytics data (admin only)"""
    if not request.user.is_admin():
        return Response({
            'success': False,
            'message': 'Access denied. Admin privileges required.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get date range
        days = int(request.GET.get('days', 30))
        end_date = timezone.now()
        start_date = end_date - timezone.timedelta(days=days)
        
        # Get analytics data
        analytics_data = AnalyticsData.objects.filter(
            timestamp__range=[start_date, end_date]
        ).order_by('timestamp')
        
        # Group by metric type
        metrics = {}
        for data in analytics_data:
            if data.metric_type not in metrics:
                metrics[data.metric_type] = []
            metrics[data.metric_type].append({
                'value': data.value,
                'timestamp': data.timestamp.isoformat(),
                'metadata': data.metadata
            })
        
        # Get summary statistics
        total_images = UploadedImage.objects.count()
        total_users = User.objects.count()
        online_users = User.objects.filter(is_online=True).count()
        
        # Recent activity
        recent_uploads = UploadedImage.objects.filter(
            created_at__gte=start_date
        ).count()
        
        return Response({
            'success': True,
            'analytics': {
                'metrics': metrics,
                'summary': {
                    'total_images': total_images,
                    'total_users': total_users,
                    'online_users': online_users,
                    'recent_uploads': recent_uploads
                },
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat(),
                    'days': days
                }
            }
        })
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred while fetching analytics data'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_analytics_data_view(request):
    """Create analytics data point (admin only)"""
    if not request.user.is_admin():
        return Response({
            'success': False,
            'message': 'Access denied. Admin privileges required.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        serializer = AnalyticsDataSerializer(data=request.data)
        if serializer.is_valid():
            analytics_data = serializer.save()
            return Response({
                'success': True,
                'message': 'Analytics data created successfully',
                'data': AnalyticsDataSerializer(analytics_data).data
            })
        else:
            return Response({
                'success': False,
                'message': 'Invalid data provided',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Create analytics data error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred while creating analytics data'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def face_recognition_view(request):
    """
    Face recognition endpoint using ResNet 50 CNN
    """
    import time
    
    start_time = time.time()
    
    try:
        # Get image data from request
        image_data = request.data.get('image', '')
        if not image_data:
            return Response({
                'success': False,
                'message': 'No image data provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get all uploaded images from database
        uploaded_images = UploadedImage.objects.filter(
            image_type__in=['person', 'surveillance', 'incident']
        ).order_by('-created_at')
        
        total_images = uploaded_images.count()
        
        # Prepare database images for face recognition service
        database_images = []
        for img in uploaded_images:
            database_images.append({
                'id': str(img.id),
                'title': img.title,
                'description': img.description,
                'image_type': img.image_type,
                'location': img.location,
                'tags': img.tags,
                'image_path': img.image.path if img.image else '',
                'uploaded_by': img.uploaded_by.get_display_name() if img.uploaded_by else 'Unknown',
                'uploaded_at': img.created_at.isoformat()
            })
        
        # Use ResNet 50 CNN face recognition service
        from .face_recognition_service import face_recognition_service
        recognition_result = face_recognition_service.recognize_face(image_data, database_images)
        
        if not recognition_result['success']:
            return Response(recognition_result, status=status.HTTP_400_BAD_REQUEST)
        
        # Extract best match information
        best_match = recognition_result.get('best_match')
        best_confidence = recognition_result.get('best_match_confidence', 0.0)
        is_authenticated = recognition_result.get('is_authenticated', False)
        authentication_status = recognition_result.get('authentication_status', 'NOT_AUTHENTICATED')
        conflict_detection = recognition_result.get('conflict_detection', {})
        
        # Handle conflict detection
        has_conflicts = conflict_detection.get('has_conflicts', False)
        conflict_resolution = conflict_detection.get('conflict_resolution', {})
        
        if has_conflicts and authentication_status == 'CONFLICT_DETECTED':
            # Use conflict resolution to get the selected match
            selected_match = conflict_resolution.get('selected_match', best_match)
            if selected_match:
                person_name = selected_match['title']
                person_id = selected_match['image_id']
                resolution_reason = conflict_resolution.get('reason', 'Conflict resolved')
                message = f'Face authenticated with conflict resolution: {person_name} ({recognition_result["best_match_percentage"]}% match) - {resolution_reason}'
            else:
                person_name = 'Unknown Person'
                person_id = 'UNKNOWN'
                message = 'Face recognition conflict - multiple matches found, unable to resolve'
        elif best_match and is_authenticated:
            person_name = best_match['title']
            person_id = best_match['image_id']
            message = f'Face authenticated: {person_name} ({recognition_result["best_match_percentage"]}% match)'
        else:
            person_name = 'Unknown Person'
            person_id = 'UNKNOWN'
            message = 'Face not authenticated - no match found in database'
        
        processing_time = time.time() - start_time
        
        result = {
            'success': True,
            'message': message,
            'recognition': {
                'faces_detected': recognition_result.get('faces_detected', 0),
                'confidence': recognition_result.get('primary_face_confidence', 0.0),
                'person_id': person_id,
                'person_name': person_name,
                'match_confidence': best_confidence,
                'match_percentage': recognition_result.get('best_match_percentage', 0.0),
                'is_known': is_authenticated,
                'authentication_status': authentication_status,
                'bounding_box': {
                    'x': 100,
                    'y': 100,
                    'width': 200,
                    'height': 200
                },
                'matched_image': {
                    'id': best_match['image_id'] if best_match else None,
                    'title': best_match['title'] if best_match else None,
                    'description': best_match['description'] if best_match else None,
                    'image_type': best_match['image_type'] if best_match else None,
                    'location': best_match['location'] if best_match else None,
                    'tags': best_match['tags'] if best_match else None,
                    'uploaded_at': best_match['uploaded_at'] if best_match else None,
                    'uploaded_by': best_match['uploaded_by'] if best_match else None,
                    'cnn_confidence': best_match['cnn_confidence'] if best_match else None,
                    'similarity_score': best_match['similarity_score'] if best_match else None
                } if best_match else None
            },
            'processing_time': round(processing_time, 2),
            'timestamp': timezone.now().isoformat(),
            'database_search': {
                'total_images_searched': total_images,
                'similarity_threshold': 0.75,
                'best_match_confidence': round(best_confidence, 3),
                'search_method': 'ResNet 50 CNN',
                'authentication_threshold': 75.0,
                'recognition_results': recognition_result.get('recognition_results', [])[:5]  # Top 5 matches
            },
            'conflict_detection': {
                'has_conflicts': has_conflicts,
                'conflict_count': conflict_detection.get('conflict_count', 0),
                'conflict_threshold': conflict_detection.get('conflict_threshold', 0.75),
                'conflict_resolution': conflict_resolution,
                'high_confidence_matches': conflict_detection.get('high_confidence_matches', [])[:3]  # Top 3 conflicting matches
            }
        }
        
        # Log the recognition attempt (if user is authenticated)
        if request.user.is_authenticated:
            AuditLog.objects.create(
                user=request.user,
                action='face_recognition',
                target_type='Face',
                target_id=person_id,
                details=f'Face recognition using ResNet 50 CNN: {message} (confidence: {round(best_confidence, 3)})',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Face recognition error: {e}")
        return Response({
            'success': False,
            'message': f'An error occurred during face recognition: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

