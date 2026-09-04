#!/usr/bin/env python3
import os
import sys
import django
from django.core.management import execute_from_command_line

if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'border_patrol_backend.settings')
    django.setup()
    
    print("Starting Django development server...")
    print("Server will be available at: http://127.0.0.1:8000/")
    print("Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        execute_from_command_line(['manage.py', 'runserver', '127.0.0.1:8000'])
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)