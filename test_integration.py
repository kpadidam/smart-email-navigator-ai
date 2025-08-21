#!/usr/bin/env python3
"""
Test the complete integration with enhanced categories
"""

from utils import init_database, get_db, User, Email, EmailAccount, categorize_email
from datetime import datetime, timedelta
import uuid

def test_full_integration():
    """Test the full integration with enhanced categorization"""
    
    print("=" * 60)
    print("🧪 Testing Full Integration with Enhanced Categories")
    print("=" * 60)
    
    # Initialize database
    init_database()
    db = next(get_db())
    
    # Create a test user
    test_user_id = str(uuid.uuid4())
    test_user = User(
        id=test_user_id,
        email="test@example.com",
        name="Test User",
        created_at=datetime.utcnow()
    )
    db.add(test_user)
    
    # Create email account
    email_account = EmailAccount(
        email="test@example.com",
        provider="gmail",
        is_primary=True,
        user_id=test_user_id
    )
    db.add(email_account)
    db.commit()
    
    # Test emails that should trigger each category
    test_emails = [
        {
            "subject": "Team Standup Meeting Tomorrow at 10am",
            "body": "Please join our daily standup via Zoom. Link: zoom.us/j/123456",
            "sender_email": "manager@company.com",
            "sender": "Team Manager",
            "expected": "Meetings"
        },
        {
            "subject": "Your Amazon package is out for delivery",
            "body": "Tracking number: 1234567890123. Expected delivery today by 5pm.",
            "sender_email": "tracking@amazon.com",
            "sender": "Amazon Delivery",
            "expected": "Deliveries"
        },
        {
            "subject": "URGENT: Board presentation needs review",
            "body": "Critical deadline - need your review by EOD. This is extremely important.",
            "sender_email": "ceo@company.com",
            "sender": "CEO",
            "expected": "Important"
        },
        {
            "subject": "Congratulations! You've won $5,000,000!!!",
            "body": "Click here immediately to claim your prize. Provide your bank details now!",
            "sender_email": "noreply@scam-lottery.xyz",
            "sender": "Prize Committee",
            "expected": "Phishing/Spam/Scam"
        }
    ]
    
    print("\n📧 Processing test emails with enhanced categorization:\n")
    
    for i, test_data in enumerate(test_emails, 1):
        # Use the categorize_email function from utils.py
        category, confidence = categorize_email(
            test_data["subject"],
            test_data["body"],
            test_data["sender_email"],
            test_data["sender"]
        )
        
        # Create email record
        email = Email(
            gmail_id=f"test_{i}",
            thread_id=f"thread_{i}",
            sender=test_data["sender"],
            sender_email=test_data["sender_email"],
            subject=test_data["subject"],
            summary=test_data["body"][:100],
            full_content=test_data["body"],
            category=category,  # This should be the enhanced category
            priority="normal",
            email_date=datetime.utcnow() - timedelta(hours=i),
            user_id=test_user_id,
            email_account_id=email_account.id
        )
        db.add(email)
        
        # Display results
        print(f"Email {i}:")
        print(f"  Subject: {test_data['subject'][:50]}...")
        print(f"  Expected: {test_data['expected']}")
        print(f"  Got: {category}")
        print(f"  Confidence: {confidence:.0%}")
        print(f"  ✅ PASS" if category == test_data["expected"] else f"  ❌ FAIL")
        print()
    
    # Commit all emails
    db.commit()
    
    # Query back to verify
    print("\n📊 Verifying database entries:\n")
    saved_emails = db.query(Email).filter(Email.user_id == test_user_id).all()
    
    categories_count = {}
    for email in saved_emails:
        categories_count[email.category] = categories_count.get(email.category, 0) + 1
    
    print("Categories saved in database:")
    for category, count in categories_count.items():
        print(f"  - {category}: {count} email(s)")
    
    # Cleanup test data
    db.query(Email).filter(Email.user_id == test_user_id).delete()
    db.query(EmailAccount).filter(EmailAccount.user_id == test_user_id).delete()
    db.query(User).filter(User.id == test_user_id).delete()
    db.commit()
    db.close()
    
    print("\n" + "=" * 60)
    print("✅ Integration test complete! (Test data cleaned up)")
    print("=" * 60)

if __name__ == "__main__":
    test_full_integration()