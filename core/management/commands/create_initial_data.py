from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from core.models import User, SystemConfiguration, Notification


class Command(BaseCommand):
    help = 'Create initial data for the Border Patrol system'
    
    def handle(self, *args, **options):
        self.stdout.write('Creating initial data...')
        
        # Create admin user
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@borderpatrol.gov',
                'first_name': 'System',
                'last_name': 'Administrator',
                'badge_id': 'ADMIN001',
                'role': 'admin',
                'department': 'administration',
                'rank': 'administrator',
                'phone': '(555) 000-0001',
                'password': make_password('AdminSecure123!'),
                'is_staff': True,
                'is_superuser': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('Created admin user'))
        else:
            self.stdout.write('Admin user already exists')
        
        # Create sample officers
        officers_data = [
            {
                'username': 'officer1',
                'email': 'martinez@borderpatrol.gov',
                'first_name': 'John',
                'last_name': 'Martinez',
                'badge_id': 'BP001',
                'role': 'officer',
                'department': 'field_operations',
                'rank': 'senior_agent',
                'phone': '(555) 123-4567',
                'password': 'Officer123!'
            },
            {
                'username': 'officer2',
                'email': 'chen@borderpatrol.gov',
                'first_name': 'Sarah',
                'last_name': 'Chen',
                'badge_id': 'BP002',
                'role': 'officer',
                'department': 'intelligence',
                'rank': 'agent',
                'phone': '(555) 234-5678',
                'password': 'Patrol456!'
            },
            {
                'username': 'officer3',
                'email': 'rodriguez@borderpatrol.gov',
                'first_name': 'Michael',
                'last_name': 'Rodriguez',
                'badge_id': 'BP003',
                'role': 'officer',
                'department': 'field_operations',
                'rank': 'agent',
                'phone': '(555) 345-6789',
                'password': 'Border789!'
            }
        ]
        
        for officer_data in officers_data:
            officer, created = User.objects.get_or_create(
                username=officer_data['username'],
                defaults={
                    'email': officer_data['email'],
                    'first_name': officer_data['first_name'],
                    'last_name': officer_data['last_name'],
                    'badge_id': officer_data['badge_id'],
                    'role': officer_data['role'],
                    'department': officer_data['department'],
                    'rank': officer_data['rank'],
                    'phone': officer_data['phone'],
                    'password': make_password(officer_data['password'])
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created officer: {officer.get_full_name()}'))
            else:
                self.stdout.write(f'Officer {officer.get_full_name()} already exists')
        
        # Create system configurations
        configs_data = [
            {
                'key': 'system_name',
                'value': 'Border Patrol Security System',
                'description': 'Name of the system',
                'data_type': 'string',
                'is_public': True
            },
            {
                'key': 'face_recognition_threshold',
                'value': '0.6',
                'description': 'Face recognition confidence threshold',
                'data_type': 'float',
                'is_public': False
            },
            {
                'key': 'session_timeout_minutes',
                'value': '30',
                'description': 'User session timeout in minutes',
                'data_type': 'integer',
                'is_public': False
            },
            {
                'key': 'max_login_attempts',
                'value': '5',
                'description': 'Maximum failed login attempts before lockout',
                'data_type': 'integer',
                'is_public': False
            },
            {
                'key': 'lockout_duration_minutes',
                'value': '30',
                'description': 'Account lockout duration in minutes',
                'data_type': 'integer',
                'is_public': False
            }
        ]
        
        for config_data in configs_data:
            config, created = SystemConfiguration.objects.get_or_create(
                key=config_data['key'],
                defaults=config_data
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created config: {config.key}'))
            else:
                self.stdout.write(f'Config {config.key} already exists')
        
        # Create sample notifications
        notifications_data = [
            {
                'title': 'System Maintenance Scheduled',
                'message': 'Scheduled maintenance will occur tomorrow at 2:00 AM UTC. The system may be temporarily unavailable.',
                'severity': 'low',
                'notification_type': 'maintenance',
                'target_roles': ['officer', 'admin'],
                'is_active': True
            },
            {
                'title': 'Security Alert: Unauthorized Access Attempt',
                'message': 'Multiple failed login attempts detected from IP 192.168.1.100 targeting admin accounts.',
                'severity': 'high',
                'notification_type': 'security',
                'target_roles': ['admin'],
                'is_active': True
            },
            {
                'title': 'Welcome to Border Patrol System',
                'message': 'Welcome to the Border Patrol Security System. Please review the user manual and security guidelines.',
                'severity': 'low',
                'notification_type': 'general',
                'target_roles': ['officer', 'admin'],
                'is_active': True
            }
        ]
        
        for notification_data in notifications_data:
            notification, created = Notification.objects.get_or_create(
                title=notification_data['title'],
                defaults={
                    'message': notification_data['message'],
                    'severity': notification_data['severity'],
                    'notification_type': notification_data['notification_type'],
                    'target_roles': notification_data['target_roles'],
                    'is_active': notification_data['is_active'],
                    'created_by': admin_user
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created notification: {notification.title}'))
            else:
                self.stdout.write(f'Notification {notification.title} already exists')
        
        self.stdout.write(self.style.SUCCESS('Initial data creation completed!'))
        self.stdout.write('\nLogin credentials:')
        self.stdout.write('Admin: ADMIN001 / AdminSecure123!')
        self.stdout.write('Officer 1: BP001 / Officer123!')
        self.stdout.write('Officer 2: BP002 / Patrol456!')
        self.stdout.write('Officer 3: BP003 / Border789!')
