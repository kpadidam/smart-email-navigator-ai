"""
Step definitions for enhanced email categorization
"""

from behave import given, when, then
import re
import os

class EnhancedEmailCategorizer:
    """
    Enhanced email categorizer with security focus
    Categories: Meetings, Deliveries, Important, Phishing/Spam/Scam
    """
    
    def __init__(self, use_openai=False):
        self.use_openai = use_openai
        self.last_result = None
        
    def categorize(self, email_data):
        """
        Categorize email and return category, confidence, metadata, and security risk
        """
        subject = email_data.get('subject', '').lower()
        sender = email_data.get('sender', '').lower()
        body = email_data.get('body', '').lower()
        full_text = f"{subject} {body}"
        
        # Check for phishing/scam first (security first!)
        security_risk = self._assess_security_risk(full_text, sender)
        if security_risk in ['HIGH', 'CRITICAL']:
            return {
                'category': 'Phishing/Spam/Scam',
                'confidence': 0.95,
                'security_risk': security_risk,
                'metadata': {'threat_indicators': self._get_threat_indicators(full_text)}
            }
        
        # Check for meetings
        if self._is_meeting(full_text, subject):
            meeting_time = self._extract_meeting_time(full_text)
            return {
                'category': 'Meetings',
                'confidence': 0.85 if meeting_time else 0.75,
                'security_risk': 'LOW',
                'metadata': {'meeting_time': meeting_time}
            }
        
        # Check for deliveries
        if self._is_delivery(full_text, sender):
            tracking_number = self._extract_tracking_number(full_text)
            return {
                'category': 'Deliveries',
                'confidence': 0.90 if tracking_number else 0.80,
                'security_risk': 'LOW',
                'metadata': {'tracking_number': tracking_number}
            }
        
        # Default to Important
        return {
            'category': 'Important',
            'confidence': 0.70,
            'security_risk': 'LOW',
            'metadata': {}
        }
    
    def _assess_security_risk(self, text, sender):
        """Assess security risk level"""
        risk_score = 0
        
        # Check for scam patterns
        scam_patterns = [
            r'you\s+won\s+\$\d+',
            r'click\s+here',
            r'act\s+now',
            r'limited\s+time',
            r'verify\s+your\s+account',
            r'suspended\s+account'
        ]
        
        for pattern in scam_patterns:
            if re.search(pattern, text):
                risk_score += 30
        
        # Check for money mentions
        if '$' in text and any(word in text for word in ['won', 'claim', 'prize']):
            risk_score += 40
        
        # Check for suspicious URLs
        if any(url in text for url in ['bit.ly', 'tinyurl', 'short.link']):
            risk_score += 25
        
        # Check for personal info requests
        if any(term in text for term in ['ssn', 'social security', 'password', 'pin']):
            risk_score += 35
        
        if risk_score >= 70:
            return 'HIGH'
        elif risk_score >= 40:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def _get_threat_indicators(self, text):
        """Get list of threat indicators found"""
        indicators = []
        if 'won' in text and '$' in text:
            indicators.append('prize_scam')
        if 'click here' in text:
            indicators.append('suspicious_link')
        return indicators
    
    def _is_meeting(self, text, subject):
        """Check if email is about a meeting"""
        meeting_keywords = [
            'meeting', 'calendar', 'invite', 'schedule',
            'zoom', 'teams', 'meet', 'call', 'sync'
        ]
        return any(keyword in text for keyword in meeting_keywords)
    
    def _is_delivery(self, text, sender):
        """Check if email is about a delivery"""
        delivery_keywords = [
            'tracking', 'package', 'delivery', 'shipment',
            'order', 'dispatch', 'courier'
        ]
        delivery_senders = ['fedex', 'ups', 'amazon', 'dhl', 'usps']
        
        return (any(keyword in text for keyword in delivery_keywords) or
                any(company in sender for company in delivery_senders))
    
    def _extract_meeting_time(self, text):
        """Extract meeting time from text"""
        # Look for time patterns like "2pm", "3:30pm", "14:00"
        time_pattern = r'\b(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\b'
        match = re.search(time_pattern, text)
        return match.group(1) if match else None
    
    def _extract_tracking_number(self, text):
        """Extract tracking number from text"""
        # Look for tracking number patterns (9-20 digits)
        tracking_pattern = r'\b(\d{9,20})\b'
        match = re.search(tracking_pattern, text)
        return match.group(1) if match else None


# Step Definitions

@given(u'I have the enhanced email categorizer')
def step_impl(context):
    """Initialize the enhanced email categorizer"""
    context.categorizer = EnhancedEmailCategorizer(use_openai=False)
    context.last_result = None

@when(u'I process an email with subject "{subject}"')
def step_impl(context, subject):
    """Process an email with given subject"""
    email_data = {
        'subject': subject,
        'sender': 'sender@example.com',
        'body': ''
    }
    context.last_result = context.categorizer.categorize(email_data)

@when(u'I process an email from "{sender}" with tracking number "{tracking}"')
def step_impl(context, sender, tracking):
    """Process a delivery email"""
    email_data = {
        'subject': 'Your package is on its way',
        'sender': sender,
        'body': f'Your tracking number is {tracking}'
    }
    context.last_result = context.categorizer.categorize(email_data)

@when(u'I process an email claiming "{text}"')
def step_impl(context, text):
    """Process a potentially malicious email"""
    email_data = {
        'subject': text,
        'sender': 'scammer@suspicious.com',
        'body': text
    }
    context.last_result = context.categorizer.categorize(email_data)

@then(u'it should be categorized as "{expected_category}"')
def step_impl(context, expected_category):
    """Verify the email category"""
    assert context.last_result is not None, "No categorization result available"
    actual_category = context.last_result['category']
    assert actual_category == expected_category, \
        f"Expected category '{expected_category}', got '{actual_category}'"

@then(u'the confidence should be at least {min_confidence:d} percent')
def step_impl(context, min_confidence):
    """Verify confidence score"""
    assert context.last_result is not None, "No categorization result available"
    actual_confidence = context.last_result['confidence'] * 100
    assert actual_confidence >= min_confidence, \
        f"Expected confidence >= {min_confidence}%, got {actual_confidence:.1f}%"

@then(u'it should extract the meeting time "{expected_time}"')
def step_impl(context, expected_time):
    """Verify meeting time extraction"""
    assert context.last_result is not None, "No categorization result available"
    metadata = context.last_result.get('metadata', {})
    actual_time = metadata.get('meeting_time')
    assert actual_time == expected_time, \
        f"Expected meeting time '{expected_time}', got '{actual_time}'"

@then(u'it should extract the tracking number')
def step_impl(context):
    """Verify tracking number extraction"""
    assert context.last_result is not None, "No categorization result available"
    metadata = context.last_result.get('metadata', {})
    tracking_number = metadata.get('tracking_number')
    assert tracking_number is not None, "No tracking number extracted"
    assert len(tracking_number) >= 9, f"Invalid tracking number: {tracking_number}"

@then(u'the security risk should be "{expected_risk}"')
def step_impl(context, expected_risk):
    """Verify security risk assessment"""
    assert context.last_result is not None, "No categorization result available"
    actual_risk = context.last_result.get('security_risk', 'UNKNOWN')
    assert actual_risk == expected_risk, \
        f"Expected security risk '{expected_risk}', got '{actual_risk}'"