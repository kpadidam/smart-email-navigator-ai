# Domain Model - Enhanced Email Categorizer

## Bounded Context
Enhanced Email Intelligence System - A specialized context for advanced email categorization with security focus

## Aggregates

### Email Aggregate
- **Root Entity**: Email
- **Value Objects**: 
  - EnhancedCategory (Meetings, Deliveries, Important, Phishing/Spam/Scam)
  - SecurityScore (0-100 risk assessment)
  - ImportanceLevel (Critical, High, Normal, Low)
  - MeetingMetadata (date, time, location, platform)
  - DeliveryMetadata (tracking number, carrier, status)
- **Business Rules**: 
  - Every email must be categorized within 1 second
  - Phishing detection must have 95%+ accuracy
  - Important emails must be flagged immediately
  - Meeting invites must extract date/time information

### SecurityAnalysis Aggregate  
- **Root Entity**: ThreatAssessment
- **Value Objects**:
  - SuspiciousPatterns (URLs, requests for info, urgency tactics)
  - SenderReputation (verified, suspicious, blacklisted)
  - AttachmentRisk (safe, suspicious, malicious)
- **Business Rules**:
  - Any phishing indicator triggers high-priority alert
  - Suspicious URLs must be sandboxed
  - Unknown senders get additional scrutiny

## Domain Events
1. **EmailReceived** - New email enters system
2. **ThreatDetected** - Phishing/scam identified
3. **MeetingScheduled** - Calendar event detected
4. **DeliveryTracked** - Package tracking identified
5. **ImportantFlagged** - Critical email marked

## Ubiquitous Language
- **Meeting Detection**: Identifying calendar invites, video calls, and scheduling emails
- **Delivery Tracking**: Recognizing shipping notifications and package updates
- **Importance Scoring**: Algorithm determining email urgency and priority
- **Phishing Detection**: Security analysis to identify scams and threats
- **Confidence Score**: Certainty level (0-100%) for categorization
- **Security Risk**: Threat level assessment (LOW, MEDIUM, HIGH, CRITICAL)
- **Category Reasoning**: Explanation of why email was categorized
- **Metadata Extraction**: Pulling relevant data (dates, tracking numbers, etc.)