#!/usr/bin/env python3
"""
Populate database with enhanced categories for testing
"""

from utils import init_database, get_db, create_mock_emails
import sys

def populate_categories():
    """Add mock emails with enhanced categories"""
    print("🚀 Populating database with enhanced categories...")
    
    # Initialize database
    init_database()
    db = next(get_db())
    
    # Get a test user ID (you'll need to have a user logged in first)
    from utils import User
    user = db.query(User).first()
    
    if not user:
        print("❌ No users found. Please login first via the web interface.")
        print("   1. Run: python play.py")
        print("   2. Login with Google")
        print("   3. Then run this script again")
        sys.exit(1)
    
    print(f"✅ Found user: {user.email}")
    
    # Create mock emails with new categories
    create_mock_emails(user.id, db)
    
    print("✅ Mock emails created with enhanced categories!")
    print("\n📧 Categories added:")
    print("   - Meetings")
    print("   - Deliveries")
    print("   - Important")
    print("   - Phishing/Spam/Scam")
    print("\n🌐 Now refresh your browser to see the new categories!")
    
    db.close()

if __name__ == "__main__":
    populate_categories()