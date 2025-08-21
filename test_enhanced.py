#!/usr/bin/env python3
"""
Test script for enhanced email categorization
"""

from enhanced_email_categorizer import get_enhanced_categorizer
import json

def test_categorization():
    """Test the enhanced categorization with sample emails"""
    
    print("=" * 60)
    print("🧪 Testing Enhanced Email Categorization")
    print("=" * 60)
    
    # Get categorizer instance
    categorizer = get_enhanced_categorizer(use_ai=True)
    
    # Test emails
    test_emails = [
        {
            "name": "Meeting Invitation",
            "data": {
                "subject": "Team Sync Meeting Tomorrow at 3pm",
                "body": "Join us for our weekly team sync via Zoom",
                "sender": "manager@company.com"
            }
        },
        {
            "name": "Package Delivery",
            "data": {
                "subject": "Your package is out for delivery",
                "body": "Tracking number: 1234567890. Expected by 5pm today.",
                "sender": "tracking@fedex.com"
            }
        },
        {
            "name": "Urgent Work Email",
            "data": {
                "subject": "URGENT: Client presentation deadline",
                "body": "Need the presentation completed by EOD. This is critical.",
                "sender": "boss@company.com"
            }
        },
        {
            "name": "Phishing Attempt",
            "data": {
                "subject": "You won $1000000!!!",
                "body": "Click here to claim your prize! Provide your bank details.",
                "sender": "scammer@suspicious.net"
            }
        }
    ]
    
    # Test each email
    for test in test_emails:
        print(f"\n📧 Testing: {test['name']}")
        print(f"   Subject: {test['data']['subject']}")
        
        result = categorizer.categorize(test['data'])
        
        print(f"   ✅ Category: {result['category']}")
        print(f"   📊 Confidence: {result['confidence'] * 100:.1f}%")
        print(f"   🔒 Security Risk: {result['security_risk']}")
        
        if result.get('metadata'):
            print(f"   📝 Metadata: {json.dumps(result['metadata'], indent=6)}")
        
        if result.get('reasoning'):
            print(f"   💭 Reasoning: {result['reasoning']}")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    test_categorization()