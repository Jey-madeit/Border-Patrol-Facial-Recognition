from django.urls import path
from . import views
from . import frontend_views

urlpatterns = [
    # Frontend pages
    path('', frontend_views.index_view, name='index'),
    path('login-page/', frontend_views.login_view, name='frontend-login'),
    path('login-fixed/', frontend_views.login_fixed_view, name='frontend-login-fixed'),
    path('test-login/', frontend_views.test_login_view, name='test-login'),
    path('debug-login/', frontend_views.debug_login_view, name='debug-login'),
    path('analytics-page/', frontend_views.analytics_view, name='analytics-page'),
    path('image-upload/', frontend_views.image_upload_view, name='image-upload'),
    path('image-management/', frontend_views.image_management_view, name='image-management'),
    path('user-management/', frontend_views.user_management_view, name='user-management'),
    path('audit-logs-page/', frontend_views.audit_logs_view, name='audit-logs-page'),
    path('admin-dashboard/', frontend_views.admin_dashboard_view, name='admin-dashboard'),
    path('officer-dashboard/', frontend_views.officer_dashboard_view, name='officer-dashboard'),
    path('face-recognition/', frontend_views.face_recognition_view, name='face-recognition'),
    path('password-reset/', frontend_views.password_reset_view, name='password-reset'),
    path('access-denied/', frontend_views.access_denied_view, name='access-denied'),
    
    # API Authentication
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # API User management
    path('users/', views.UserListCreateView.as_view(), name='user-list'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    
    # API Profile
    path('profile/', views.profile_view, name='profile'),
    path('profile/update/', views.update_profile_view, name='profile-update'),
    
    # API Admin features
    path('audit-logs/', views.audit_logs_view, name='audit-logs'),
    path('system-config/', views.system_config_view, name='system-config'),
    
    # API General
    path('notifications/', views.notifications_view, name='notifications'),
    path('dashboard-stats/', views.dashboard_stats_view, name='dashboard-stats'),
    
    # API Image Management
    path('images/', views.UploadedImageListCreateView.as_view(), name='image-list'),
    path('images/<uuid:pk>/', views.UploadedImageDetailView.as_view(), name='image-detail'),
    path('upload-image/', views.upload_image_view, name='upload-image'),
    
    # API Analytics
    path('analytics/', views.analytics_view, name='analytics'),
    path('analytics/create/', views.create_analytics_data_view, name='create-analytics'),
    
    # API Face Recognition
    path('recognize/', views.face_recognition_view, name='face-recognition'),
]
