import os
import sys
import django
from django.conf import settings

# Setup Django source
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chat_backend.settings")
django.setup()

from utils.notifications import _initialize
import firebase_admin

def verify_init():
    try:
        print("Attempting to initialize Firebase...")
        _initialize()
        if firebase_admin._apps:
            print("✅ Firebase initialized successfully.")
            return True
        else:
            print("❌ Firebase app not initialized.")
            return False
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
        return False

if __name__ == "__main__":
    if verify_init():
        sys.exit(0)
    else:
        sys.exit(1)
