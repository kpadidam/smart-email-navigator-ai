# Domain Model - Smart Email Categorizer

## Bounded Context
Email Intelligence System - A single bounded context for intelligent email management and categorization

## Aggregates

### Email Aggregate
- **Root Entity**: Email
- **Value Objects**: 
  - EmailCategory (work, personal, promotional, spam)
  - Priority (urgent, normal, low)
  - EmailMetadata (sender, subject, timestamp)
- **Business Rules**: 
  - Every email must be categorized within 2 seconds of receipt
  - AI categorization confidence must exceed 70% threshold
  - Emails cannot belong to multiple primary categories

### User Aggregate  
- **Root Entity**: User
- **Value Objects**:
  - EmailAccount (provider, credentials)
  - CategoryPreferences (custom rules, filters)
- **Business Rules**:
  - User must authenticate via OAuth before accessing emails
  - Each user can connect up to 5 email accounts
  - Custom category rules override AI suggestions

## Domain Events
1. **EmailReceived** - New email arrives in inbox
2. **EmailCategorized** - AI completes categorization 
3. **CategoryChanged** - User manually updates category
4. **SyncCompleted** - Email provider sync finishes

## Ubiquitous Language
- **Categorization**: AI-powered process of assigning emails to predefined groups
- **Smart Inbox**: Organized view of emails grouped by AI-determined categories
- **Sync**: Process of fetching new emails from provider (Gmail, Outlook)
- **Confidence Score**: AI's certainty level (0-100%) for a categorization
- **Priority Detection**: Algorithm determining email urgency based on content
- **Email Provider**: External service (Gmail API) supplying email data
- **Category Rule**: User-defined filter overriding AI categorization