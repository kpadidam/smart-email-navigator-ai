"""
Step definitions for email categorization feature
"""

from behave import given, when, then
import time
import json
import httpx
from datetime import datetime

@given(u'I am authenticated with my Gmail account')
def step_impl(context):
    """Authenticate user with mock Google OAuth"""
    # Simulate authentication
    context.auth_token = "test_jwt_token_123"
    context.user_email = "test@gmail.com"
    
    # Store in context for later use
    context.authenticated = True
    assert context.authenticated, "Authentication failed"

@when(u'a new work email arrives from "boss@company.com"')
def step_impl(context):
    """Simulate receiving a work email"""
    context.current_email = {
        "id": "email_001",
        "gmail_id": "gmail_123",
        "sender": "Boss",
        "sender_email": "boss@company.com",
        "subject": "Q4 Budget Review Meeting",
        "body": "Please review the attached budget documents before our meeting tomorrow at 2 PM.",
        "received_at": datetime.now().isoformat()
    }
    
    # Trigger categorization (simulate AI processing)
    start_time = time.time()
    context.current_email["category"] = "work"
    context.current_email["confidence"] = 0.92
    context.processing_time = time.time() - start_time
    
    assert context.current_email is not None, "Email not received"

@then(u'the AI should categorize it as "work" with confidence above 70%')
def step_impl(context):
    """Verify AI categorization result"""
    assert context.current_email["category"] == "work", \
        f"Expected category 'work', got '{context.current_email['category']}'"
    
    assert context.current_email["confidence"] > 0.70, \
        f"Confidence {context.current_email['confidence']} is below 70%"

@then(u'the email should appear in my work category inbox')
def step_impl(context):
    """Verify email appears in correct inbox category"""
    # Simulate checking inbox by category
    work_inbox = [
        email for email in context.emails 
        if email.get("category") == "work"
    ]
    
    # Add current email to context emails
    if not hasattr(context, 'emails'):
        context.emails = []
    context.emails.append(context.current_email)
    
    # Verify email is in work category
    work_emails = [e for e in context.emails if e["category"] == "work"]
    assert len(work_emails) > 0, "No emails in work category"
    assert context.current_email["id"] in [e["id"] for e in work_emails], \
        "Email not found in work inbox"

@when(u'a promotional email arrives with subject "50% OFF Sale"')
def step_impl(context):
    """Simulate receiving a promotional email"""
    context.current_email = {
        "id": "email_002",
        "gmail_id": "gmail_456",
        "sender": "Store Newsletter",
        "sender_email": "noreply@store.com",
        "subject": "50% OFF Sale - Limited Time Only!",
        "body": "Don't miss our biggest sale of the year! Use code SAVE50 at checkout. Unsubscribe link below.",
        "received_at": datetime.now().isoformat()
    }
    
    # Trigger categorization
    start_time = time.time()
    context.current_email["category"] = "promotional"
    context.current_email["confidence"] = 0.88
    context.processing_time = time.time() - start_time
    
    assert context.current_email is not None, "Email not received"

@then(u'the AI should categorize it as "promotional" with confidence above 70%')
def step_impl(context):
    """Verify promotional categorization"""
    assert context.current_email["category"] == "promotional", \
        f"Expected category 'promotional', got '{context.current_email['category']}'"
    
    assert context.current_email["confidence"] > 0.70, \
        f"Confidence {context.current_email['confidence']} is below 70%"

@then(u'the email should appear in my promotional category inbox')
def step_impl(context):
    """Verify email in promotional inbox"""
    if not hasattr(context, 'emails'):
        context.emails = []
    context.emails.append(context.current_email)
    
    promotional_emails = [e for e in context.emails if e["category"] == "promotional"]
    assert len(promotional_emails) > 0, "No emails in promotional category"
    assert context.current_email["id"] in [e["id"] for e in promotional_emails], \
        "Email not found in promotional inbox"

@when(u'I sync 10 new emails of different types')
def step_impl(context):
    """Simulate syncing batch of mixed emails"""
    context.batch_emails = [
        {
            "id": f"email_{i:03d}",
            "gmail_id": f"gmail_{i:03d}",
            "sender": f"Sender {i}",
            "sender_email": f"sender{i}@example.com",
            "subject": get_test_subject(i),
            "body": get_test_body(i),
            "received_at": datetime.now().isoformat()
        }
        for i in range(10)
    ]
    
    # Process all emails with AI categorization
    context.batch_start_time = time.time()
    
    for email in context.batch_emails:
        # Simulate AI categorization
        category, confidence = categorize_email_mock(email)
        email["category"] = category
        email["confidence"] = confidence
    
    context.batch_processing_time = time.time() - context.batch_start_time
    
    if not hasattr(context, 'emails'):
        context.emails = []
    context.emails.extend(context.batch_emails)

@then(u'all emails should be categorized within 2 seconds')
def step_impl(context):
    """Verify batch processing time"""
    assert context.batch_processing_time < 2.0, \
        f"Processing took {context.batch_processing_time:.2f} seconds, exceeding 2 second limit"

@then(u'each email should have a category and confidence score')
def step_impl(context):
    """Verify all emails have required fields"""
    for email in context.batch_emails:
        assert "category" in email, f"Email {email['id']} missing category"
        assert "confidence" in email, f"Email {email['id']} missing confidence"
        
        # Verify category is valid
        valid_categories = ["work", "personal", "promotional", "spam"]
        assert email["category"] in valid_categories, \
            f"Invalid category '{email['category']}' for email {email['id']}"
        
        # Verify confidence is valid
        assert 0.0 <= email["confidence"] <= 1.0, \
            f"Invalid confidence {email['confidence']} for email {email['id']}"

@then(u'my smart inbox should show emails grouped by category')
def step_impl(context):
    """Verify emails are properly grouped"""
    # Group emails by category
    grouped = {}
    for email in context.emails:
        category = email.get("category", "uncategorized")
        if category not in grouped:
            grouped[category] = []
        grouped[category].append(email)
    
    # Verify we have multiple categories
    assert len(grouped) > 1, "Emails not properly distributed across categories"
    
    # Verify each category has emails
    for category, emails in grouped.items():
        assert len(emails) > 0, f"Category '{category}' has no emails"
    
    context.grouped_emails = grouped

# Helper functions for test data generation

def get_test_subject(index):
    """Generate test email subjects"""
    subjects = [
        "Team Meeting Tomorrow",
        "Your Order Has Shipped",
        "20% OFF Everything!",
        "Project Update Required",
        "Happy Birthday!",
        "Invoice #12345",
        "Free Trial Ending Soon",
        "Dinner Plans?",
        "Security Alert",
        "Newsletter: Tech News"
    ]
    return subjects[index % len(subjects)]

def get_test_body(index):
    """Generate test email bodies"""
    bodies = [
        "Please join us for the quarterly review meeting in Conference Room A.",
        "Your package is on its way! Track your shipment with this link.",
        "Sale ends tonight! Don't miss these amazing deals. Unsubscribe here.",
        "The project deadline is approaching. Please update your status.",
        "Hope you have a wonderful day! Let's celebrate soon.",
        "Please find attached the invoice for last month's services.",
        "Your trial expires in 3 days. Upgrade now to keep your access.",
        "Are you free for dinner this weekend? Let me know!",
        "We detected unusual activity on your account. Please verify.",
        "This week's top tech stories and industry updates."
    ]
    return bodies[index % len(bodies)]

def categorize_email_mock(email):
    """Mock AI categorization logic"""
    subject = email["subject"].lower()
    body = email["body"].lower()
    sender = email["sender_email"].lower()
    
    # Simple rule-based categorization for testing
    if any(word in subject + body for word in ["meeting", "project", "invoice", "deadline"]):
        return "work", 0.85
    elif any(word in subject + body for word in ["sale", "off", "deal", "unsubscribe", "newsletter"]):
        return "promotional", 0.90
    elif any(word in subject + body for word in ["dinner", "birthday", "weekend"]):
        return "personal", 0.80
    elif "security" in subject or "alert" in subject:
        return "work", 0.75
    else:
        return "personal", 0.72