"""
Enhanced Email Categorizer with OpenAI Integration
Categories: Meetings, Deliveries, Important, Phishing/Spam/Scam
"""

import os
import re
import json
from typing import Dict, Tuple, Optional, List
from datetime import datetime
import openai

class EnhancedEmailCategorizerWithAI:
    """
    Production-ready email categorizer using OpenAI for intelligent categorization
    """
    
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if self.api_key:
            openai.api_key = self.api_key
            self.use_ai = True
        else:
            self.use_ai = False
            print("Warning: OpenAI API key not found. Using rule-based categorization.")
        
        self.categories = ["Meetings", "Deliveries", "Important", "Phishing/Spam/Scam"]
        
    def categorize(self, email_data: Dict) -> Dict:
        """
        Categorize email using AI or fallback to rules
        
        Returns:
            Dict with category, confidence, security_risk, metadata, and reasoning
        """
        # Always do security check first
        security_result = self._security_check(email_data)
        if security_result['is_threat']:
            return {
                'category': 'Phishing/Spam/Scam',
                'confidence': security_result['confidence'],
                'security_risk': security_result['risk_level'],
                'metadata': security_result['metadata'],
                'reasoning': security_result['reasoning']
            }
        
        # Use AI if available, otherwise use rules
        if self.use_ai:
            return self._categorize_with_ai(email_data)
        else:
            return self._categorize_with_rules(email_data)
    
    def _categorize_with_ai(self, email_data: Dict) -> Dict:
        """Use OpenAI to categorize email"""
        try:
            prompt = self._build_ai_prompt(email_data)
            
            # Handle both old and new OpenAI API versions
            try:
                # Try new OpenAI API (1.0+)
                from openai import OpenAI
                client = OpenAI(api_key=self.api_key)
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are an email categorization expert. Categorize emails and extract metadata."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=300
                )
                return self._parse_ai_response(response.choices[0].message.content, email_data)
            except:
                # Fallback to old API (0.28)
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are an email categorization expert. Categorize emails and extract metadata."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=300
                )
                return self._parse_ai_response(response.choices[0].message.content, email_data)
            
        except Exception as e:
            print(f"AI categorization failed: {e}")
            # Fallback to rule-based
            return self._categorize_with_rules(email_data)
    
    def _build_ai_prompt(self, email_data: Dict) -> str:
        """Build prompt for OpenAI"""
        return f"""
        Categorize this email into one of these categories: Meetings, Deliveries, Important, Phishing/Spam/Scam
        
        Email Details:
        From: {email_data.get('sender', 'unknown')}
        Subject: {email_data.get('subject', '')}
        Body: {email_data.get('body', '')[:500]}
        
        Provide response in JSON format:
        {{
            "category": "category_name",
            "confidence": 0.0-1.0,
            "reasoning": "why this category",
            "metadata": {{
                "meeting_time": "if applicable",
                "meeting_date": "if applicable",
                "tracking_number": "if applicable",
                "carrier": "if applicable",
                "urgency_level": "if applicable"
            }}
        }}
        """
    
    def _parse_ai_response(self, response_text: str, email_data: Dict) -> Dict:
        """Parse OpenAI response"""
        try:
            # Try to extract JSON from response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                
                # Ensure required fields
                return {
                    'category': result.get('category', 'Important'),
                    'confidence': float(result.get('confidence', 0.7)),
                    'security_risk': 'LOW',
                    'metadata': result.get('metadata', {}),
                    'reasoning': result.get('reasoning', 'AI categorization')
                }
        except:
            pass
        
        # Fallback if parsing fails
        return self._categorize_with_rules(email_data)
    
    def _categorize_with_rules(self, email_data: Dict) -> Dict:
        """Rule-based categorization fallback"""
        subject = email_data.get('subject', '').lower()
        sender = email_data.get('sender', '').lower()
        body = email_data.get('body', '').lower()
        full_text = f"{subject} {body}"
        
        # Check for meetings
        if self._is_meeting(full_text, subject):
            metadata = self._extract_meeting_metadata(full_text)
            return {
                'category': 'Meetings',
                'confidence': 0.85 if metadata.get('meeting_time') else 0.75,
                'security_risk': 'LOW',
                'metadata': metadata,
                'reasoning': 'Contains meeting keywords and patterns'
            }
        
        # Check for deliveries
        if self._is_delivery(full_text, sender):
            metadata = self._extract_delivery_metadata(full_text)
            return {
                'category': 'Deliveries',
                'confidence': 0.90 if metadata.get('tracking_number') else 0.80,
                'security_risk': 'LOW',
                'metadata': metadata,
                'reasoning': 'Delivery/shipping patterns detected'
            }
        
        # Check for importance
        if self._is_important(full_text, email_data):
            return {
                'category': 'Important',
                'confidence': 0.75,
                'security_risk': 'LOW',
                'metadata': {'urgency_level': 'high' if 'urgent' in full_text else 'normal'},
                'reasoning': 'Contains importance indicators'
            }
        
        # Default
        return {
            'category': 'Important',
            'confidence': 0.60,
            'security_risk': 'LOW',
            'metadata': {},
            'reasoning': 'Default categorization'
        }
    
    def _security_check(self, email_data: Dict) -> Dict:
        """Comprehensive security check"""
        subject = email_data.get('subject', '').lower()
        sender = email_data.get('sender', '').lower()
        body = email_data.get('body', '').lower()
        full_text = f"{subject} {body}"
        
        risk_score = 0
        threat_indicators = []
        
        # Scam patterns - simplified for better matching
        scam_patterns = [
            (r'you\s+won\s+\$\d+', 40, 'prize_scam'),
            (r'click\s+here', 30, 'urgent_click'),
            (r'verify\s+your\s+account', 35, 'account_verification'),
            (r'suspended\s+account', 35, 'account_threat'),
            (r'\$\d+(?:,\d{3})*(?:\.\d{2})?', 20, 'money_mention'),
            (r'million|thousand', 15, 'large_amount')
        ]
        
        for pattern, score, indicator in scam_patterns:
            if re.search(pattern, full_text):
                risk_score += score
                threat_indicators.append(indicator)
        
        # Suspicious URLs
        suspicious_urls = ['bit.ly', 'tinyurl', 'short.link', 'click.here']
        for url in suspicious_urls:
            if url in full_text:
                risk_score += 25
                threat_indicators.append('suspicious_url')
                break
        
        # Personal info requests
        info_requests = ['ssn', 'social security', 'password', 'credit card', 'bank account', 'bank details']
        for term in info_requests:
            if term in full_text:
                risk_score += 35
                threat_indicators.append('personal_info_request')
                break
        
        # Check for "prize" or "claim" keywords
        if 'prize' in full_text or 'claim' in full_text:
            risk_score += 25
            threat_indicators.append('prize_claim')
        
        # Unknown sender with money mentions
        if 'noreply' in sender or 'no-reply' in sender:
            if '$' in full_text or 'money' in full_text:
                risk_score += 20
                threat_indicators.append('suspicious_sender')
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = 'HIGH'
        elif risk_score >= 50:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'
        
        return {
            'is_threat': risk_score >= 70,
            'risk_level': risk_level,
            'confidence': min(0.95, 0.5 + (risk_score / 100)),
            'metadata': {
                'threat_indicators': threat_indicators,
                'risk_score': risk_score
            },
            'reasoning': f"Security risk detected: {', '.join(threat_indicators)}" if threat_indicators else "No threats detected"
        }
    
    def _is_meeting(self, text: str, subject: str) -> bool:
        """Check if email is about a meeting"""
        meeting_keywords = [
            'meeting', 'calendar', 'invite', 'schedule', 'appointment',
            'zoom', 'teams', 'meet', 'call', 'sync', 'standup', 'conference'
        ]
        return any(keyword in text for keyword in meeting_keywords)
    
    def _is_delivery(self, text: str, sender: str) -> bool:
        """Check if email is about a delivery"""
        delivery_keywords = [
            'tracking', 'package', 'delivery', 'shipment', 'shipping',
            'order', 'dispatch', 'courier', 'parcel', 'arrived'
        ]
        delivery_senders = ['fedex', 'ups', 'amazon', 'dhl', 'usps', 'tracking']
        
        return (any(keyword in text for keyword in delivery_keywords) or
                any(company in sender for company in delivery_senders))
    
    def _is_important(self, text: str, email_data: Dict) -> bool:
        """Check if email is important"""
        importance_keywords = [
            'urgent', 'important', 'deadline', 'asap', 'critical',
            'priority', 'immediate', 'action required', 'time sensitive'
        ]
        
        # Check priority header
        if email_data.get('priority') in ['high', 'urgent']:
            return True
            
        return any(keyword in text for keyword in importance_keywords)
    
    def _extract_meeting_metadata(self, text: str) -> Dict:
        """Extract meeting-related metadata"""
        metadata = {}
        
        # Extract time
        time_patterns = [
            r'(\d{1,2}:\d{2}\s*[ap]m)',  # 2:30pm
            r'(\d{1,2}\s*[ap]m)',         # 2pm
            r'(\d{1,2}:\d{2})',            # 14:30
        ]
        
        for pattern in time_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                metadata['meeting_time'] = match.group(1)
                break
        
        # Extract date
        date_keywords = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        for keyword in date_keywords:
            if keyword in text:
                metadata['meeting_date'] = keyword
                break
        
        # Extract meeting platform
        platforms = {
            'zoom': r'zoom\.us/[j/]\d+',
            'teams': r'teams\.microsoft\.com',
            'meet': r'meet\.google\.com'
        }
        
        for platform, pattern in platforms.items():
            if re.search(pattern, text):
                metadata['platform'] = platform
                break
        
        return metadata
    
    def _extract_delivery_metadata(self, text: str) -> Dict:
        """Extract delivery-related metadata"""
        metadata = {}
        
        # Extract tracking number (various formats)
        tracking_patterns = [
            r'\b([A-Z]{2}\d{9}[A-Z]{2})\b',  # International format
            r'\b(1Z[A-Z0-9]{16})\b',          # UPS format
            r'\b(\d{12,22})\b',               # FedEx/USPS format
            r'\b(\d{10})\b',                  # Simple format
        ]
        
        for pattern in tracking_patterns:
            match = re.search(pattern, text.upper())
            if match:
                metadata['tracking_number'] = match.group(1)
                break
        
        # Extract carrier
        carriers = ['fedex', 'ups', 'usps', 'dhl', 'amazon']
        for carrier in carriers:
            if carrier in text:
                metadata['carrier'] = carrier.upper()
                break
        
        # Extract delivery status
        if 'delivered' in text:
            metadata['status'] = 'delivered'
        elif 'out for delivery' in text:
            metadata['status'] = 'out_for_delivery'
        elif 'shipped' in text:
            metadata['status'] = 'shipped'
        
        return metadata

# Factory function to get the appropriate categorizer
def get_enhanced_categorizer(use_ai: bool = True) -> EnhancedEmailCategorizerWithAI:
    """
    Get an instance of the enhanced email categorizer
    
    Args:
        use_ai: Whether to use OpenAI (requires API key)
    
    Returns:
        EnhancedEmailCategorizerWithAI instance
    """
    return EnhancedEmailCategorizerWithAI()