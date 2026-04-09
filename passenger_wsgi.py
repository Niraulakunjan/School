import os
import sys

# Add the project directory to sys.path so Django's modules can be found
sys.path.insert(0, os.path.dirname(__file__))

# Set the Django settings module environment variable
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_system.settings')

# Import the WSGI application object
from school_system.wsgi import application
