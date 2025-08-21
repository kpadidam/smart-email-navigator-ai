"""
AI-powered email categorization service
Uses rule-based logic with confidence scoring
Can be extended with ML models (scikit-learn, TensorFlow, or OpenAI)
"""

import re
import json
from typing import Dict, Tuple, List, Optional
from datetime import datetime
import os

class EmailCategorizer:
    """
    AI Email Categorization Engine
    Analyzes email content and assigns categories with confidence scores
    """
    
    def __init__(self):
        self.categories = ["work", "personal", "promotional", "spam"]
        
        # Keywords for rule-based categorization
        self.work_keywords = [
            "meeting", "project", "deadline", "report", "invoice", "budget",
            "presentation", "conference", "review", "agenda", "schedule",
            "proposal", "contract", "client", "customer", "task", "assignment",
            "quarterly", "annual", "performance", "strategy", "deliverable"
        ]
        
        self.personal_keywords = [
            "birthday", "dinner", "weekend", "family", "friend", "vacation",
            "party", "wedding", "anniversary", "celebration", "lunch",
            "coffee", "drinks", "movie", "concert", "trip", "holiday"
        ]
        
        self.promotional_keywords = [
            "sale", "discount", "offer", "deal", "save", "free", "limited",
            "exclusive", "promo", "coupon", "special", "buy", "shop",
            "unsubscribe", "newsletter", "marketing", "advertisement",
            "%", "off", "clearance", "flash sale"
        ]
        
        self.spam_keywords = [
            "winner", "congratulations", "click here", "urgent", "act now",
            "guarantee", "risk-free", "viagra", "pills", "weight loss",
            "make money", "work from home", "nigerian prince", "inheritance",
            "verify account", "suspended", "refund"
        ]
        
        # Domain patterns for categorization
        self.work_domains = ["company.com", "corp.com", "org", "edu", "gov"]
        self.promotional_domains = ["marketing", "newsletter", "noreply", "promo", "deals"]
        
    def categorize(self, email_data: Dict) -> Tuple[str, float, Dict]:
        """
        Categorize an email with confidence score
        
        Args:
            email_data: Dictionary containing email details
            
        Returns:
            Tuple of (category, confidence, metadata)
        """
        
        # Extract email components
        subject = email_data.get("subject", "").lower()
        body = email_data.get("body", "").lower()
        sender = email_data.get("sender_email", "").lower()
        sender_name = email_data.get("sender", "").lower()
        
        # Combined text for analysis
        full_text = f"{subject} {body} {sender_name}"
        
        # Calculate scores for each category
        scores = {
            "work": self._calculate_work_score(full_text, sender),
            "personal": self._calculate_personal_score(full_text, sender),
            "promotional": self._calculate_promotional_score(full_text, sender, body),
            "spam": self._calculate_spam_score(full_text, subject)
        }
        
        # Get highest scoring category
        category = max(scores, key=scores.get)
        base_confidence = scores[category]
        
        # Boost confidence based on specific signals
        confidence = self._adjust_confidence(base_confidence, email_data, category)
        
        # Create metadata
        metadata = {
            "scores": scores,
            "keywords_found": self._extract_keywords(full_text),
            "analysis_timestamp": datetime.now().isoformat(),
            "confidence_factors": self._get_confidence_factors(email_data, category)
        }
        
        return category, confidence, metadata
    
    def _calculate_work_score(self, text: str, sender: str) -> float:
        """Calculate work email score"""
        score = 0.0
        
        # Check keywords
        keyword_matches = sum(1 for kw in self.work_keywords if kw in text)
        score += min(keyword_matches * 0.15, 0.6)
        
        # Check sender domain
        if any(domain in sender for domain in self.work_domains):
            score += 0.3
            
        # Check for formal language patterns
        if any(pattern in text for pattern in ["please review", "attached", "regards", "sincerely"]):
            score += 0.2
            
        # Time-based scoring (business hours boost)
        now = datetime.now()
        if 9 <= now.hour <= 17 and now.weekday() < 5:  # Business hours on weekdays
            score += 0.1
            
        return min(score, 1.0)
    
    def _calculate_personal_score(self, text: str, sender: str) -> float:
        """Calculate personal email score"""
        score = 0.0
        
        # Check keywords
        keyword_matches = sum(1 for kw in self.personal_keywords if kw in text)
        score += min(keyword_matches * 0.2, 0.6)
        
        # Check for informal language
        if any(pattern in text for pattern in ["hey", "hi!", "lol", "haha", "btw"]):
            score += 0.2
            
        # Check for personal domains (gmail, yahoo, etc)
        if any(domain in sender for domain in ["gmail", "yahoo", "hotmail", "outlook.com"]):
            score += 0.2
            
        return min(score, 1.0)
    
    def _calculate_promotional_score(self, text: str, sender: str, body: str) -> float:
        """Calculate promotional email score"""
        score = 0.0
        
        # Check keywords
        keyword_matches = sum(1 for kw in self.promotional_keywords if kw in text)
        score += min(keyword_matches * 0.2, 0.7)
        
        # Check for unsubscribe link
        if "unsubscribe" in body:
            score += 0.3
            
        # Check sender patterns
        if any(pattern in sender for pattern in self.promotional_domains):
            score += 0.2
            
        # Check for price patterns
        price_pattern = r'\$\d+|\d+%|save \$|off'
        if re.search(price_pattern, text):
            score += 0.2
            
        return min(score, 1.0)
    
    def _calculate_spam_score(self, text: str, subject: str) -> float:
        """Calculate spam email score"""
        score = 0.0
        
        # Check keywords
        keyword_matches = sum(1 for kw in self.spam_keywords if kw in text)
        score += min(keyword_matches * 0.3, 0.7)
        
        # Check for all caps subject
        if subject.isupper() and len(subject) > 5:
            score += 0.2
            
        # Check for excessive punctuation
        if subject.count("!") > 2 or subject.count("$") > 1:
            score += 0.2
            
        # Check for suspicious patterns
        if re.search(r'[A-Z]{5,}', subject):  # Multiple consecutive caps
            score += 0.1
            
        return min(score, 1.0)
    
    def _adjust_confidence(self, base_confidence: float, email_data: Dict, category: str) -> float:
        """Adjust confidence based on additional factors"""
        confidence = base_confidence
        
        # Boost confidence if multiple signals agree
        if category == "work" and "@company.com" in email_data.get("sender_email", ""):
            confidence = min(confidence + 0.15, 0.95)
            
        if category == "promotional" and "unsubscribe" in email_data.get("body", "").lower():
            confidence = min(confidence + 0.1, 0.95)
            
        # Ensure minimum confidence threshold
        if confidence < 0.5:
            confidence = 0.5
            
        return confidence
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords found in the email"""
        found_keywords = []
        
        all_keywords = (self.work_keywords + self.personal_keywords + 
                        self.promotional_keywords + self.spam_keywords)
        
        for keyword in all_keywords:
            if keyword in text:
                found_keywords.append(keyword)
                
        return found_keywords[:10]  # Return top 10 keywords
    
    def _get_confidence_factors(self, email_data: Dict, category: str) -> List[str]:
        """Get factors that influenced the confidence score"""
        factors = []
        
        if category == "work":
            if any(domain in email_data.get("sender_email", "") for domain in self.work_domains):
                factors.append("work_domain")
            if "meeting" in email_data.get("subject", "").lower():
                factors.append("meeting_keyword")
                
        elif category == "promotional":
            if "unsubscribe" in email_data.get("body", "").lower():
                factors.append("unsubscribe_link")
            if "%" in email_data.get("subject", ""):
                factors.append("discount_symbol")
                
        return factors
    
    def batch_categorize(self, emails: List[Dict]) -> List[Dict]:
        """
        Categorize multiple emails in batch
        
        Args:
            emails: List of email dictionaries
            
        Returns:
            List of emails with categorization results
        """
        results = []
        
        for email in emails:
            category, confidence, metadata = self.categorize(email)
            
            email_result = email.copy()
            email_result.update({
                "category": category,
                "confidence": confidence,
                "ai_metadata": metadata
            })
            
            results.append(email_result)
            
        return results
    
    def get_category_stats(self, emails: List[Dict]) -> Dict:
        """
        Get statistics about categorized emails
        
        Args:
            emails: List of categorized emails
            
        Returns:
            Dictionary with category statistics
        """
        stats = {
            "total": len(emails),
            "by_category": {},
            "avg_confidence": {},
            "high_confidence_count": 0
        }
        
        category_counts = {cat: 0 for cat in self.categories}
        category_confidences = {cat: [] for cat in self.categories}
        
        for email in emails:
            if "category" in email:
                cat = email["category"]
                category_counts[cat] += 1
                
                if "confidence" in email:
                    category_confidences[cat].append(email["confidence"])
                    
                    if email["confidence"] > 0.8:
                        stats["high_confidence_count"] += 1
        
        stats["by_category"] = category_counts
        
        for cat, confidences in category_confidences.items():
            if confidences:
                stats["avg_confidence"][cat] = sum(confidences) / len(confidences)
            else:
                stats["avg_confidence"][cat] = 0
                
        return stats


# Singleton instance
_categorizer = None

def get_categorizer() -> EmailCategorizer:
    """Get or create the singleton categorizer instance"""
    global _categorizer
    if _categorizer is None:
        _categorizer = EmailCategorizer()
    return _categorizer


# OpenAI integration (optional)
def categorize_with_openai(email_data: Dict) -> Tuple[str, float, Dict]:
    """
    Use OpenAI for advanced categorization (requires API key)
    
    This is a placeholder for OpenAI integration.
    Set OPENAI_API_KEY environment variable to enable.
    """
    
    openai_key = os.getenv("OPENAI_API_KEY")
    
    if not openai_key:
        # Fall back to rule-based categorization
        categorizer = get_categorizer()
        return categorizer.categorize(email_data)
    
    # OpenAI implementation would go here
    # For now, use rule-based system
    categorizer = get_categorizer()
    return categorizer.categorize(email_data)