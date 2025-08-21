"""
Backend utilities and implementation for Smart Email Navigator AI
All business logic, database operations, and helper functions
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from jose import jwt
import httpx
import base64
import re
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import create_engine, Column, String, Text, DateTime, Boolean, ForeignKey, Integer, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func
from passlib.context import CryptContext
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# ====================== Configuration ======================

class Config:
    """Application configuration"""
    # Database - Use Railway URL if available, otherwise SQLite for local dev
    DATABASE_URL = os.getenv(
        "DATABASE_PUBLIC_URL",
        os.getenv("DATABASE_URL", "sqlite:///./email_navigator.db")
    )
    
    # JWT Settings
    JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_HOURS = 24
    
    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5001/api/auth/google/callback")
    
    # OpenAI (optional)
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    # App Settings
    APP_NAME = "Smart Email Navigator AI"
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    ENVIRONMENT = os.getenv("RAILWAY_ENVIRONMENT", "development")
    PORT = int(os.getenv("PORT", 5001))

config = Config()

# ====================== Database Setup ======================

# Determine if we're on Railway
is_railway = os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID")

# Create engine
engine = create_engine(
    config.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=config.DEBUG
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ====================== Database Models ======================

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    picture = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=True)
    google_refresh_token = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    email_accounts = relationship("EmailAccount", back_populates="user", cascade="all, delete-orphan")
    emails = relationship("Email", back_populates="user", cascade="all, delete-orphan")

class EmailAccount(Base):
    __tablename__ = "email_accounts"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, nullable=False)
    provider = Column(String, default="gmail")
    is_primary = Column(Boolean, default=False)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Foreign key
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="email_accounts")
    emails = relationship("Email", back_populates="email_account", cascade="all, delete-orphan")

class Email(Base):
    __tablename__ = "emails"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    gmail_id = Column(String, unique=True, nullable=True)
    thread_id = Column(String, nullable=True)
    
    # Email fields
    sender = Column(String, nullable=False)
    sender_email = Column(String, nullable=False)
    recipient = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    full_content = Column(Text, nullable=True)
    html_content = Column(Text, nullable=True)
    
    # Categorization
    category = Column(String, nullable=True)
    priority = Column(String, default="normal")
    tags = Column(JSON, default=list)
    
    # Status
    status = Column(String, default="unread")
    is_starred = Column(Boolean, default=False)
    is_important = Column(Boolean, default=False)
    
    # Metadata
    attachments = Column(JSON, default=list)
    email_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign keys
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    email_account_id = Column(String, ForeignKey("email_accounts.id"), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="emails")
    email_account = relationship("EmailAccount", back_populates="emails")

# ====================== Database Functions ======================

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_database():
    """Initialize database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created/verified")
        return True
    except Exception as e:
        print(f"❌ Database initialization error: {e}")
        if not is_railway:
            raise
        return False

# ====================== Authentication Functions ======================

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=config.JWT_EXPIRATION_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        return payload
    except jwt.JWTError:
        return None

def get_user_from_token(token: str, db: Session) -> Optional[User]:
    """Get user from JWT token"""
    payload = verify_token(token)
    if not payload:
        return None
    
    email = payload.get("sub")
    if not email:
        return None
    
    return db.query(User).filter(User.email == email).first()

# ====================== Google OAuth Functions ======================

async def exchange_code_for_tokens(code: str) -> Optional[Dict[str, Any]]:
    """Exchange Google OAuth code for tokens"""
    try:
        print(f"Exchanging code for tokens...")
        print(f"Client ID: {config.GOOGLE_CLIENT_ID}")
        print(f"Redirect URI: {config.GOOGLE_REDIRECT_URI}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": config.GOOGLE_CLIENT_ID,
                    "client_secret": config.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": config.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code"
                }
            )
            
            if response.status_code != 200:
                print(f"Token exchange failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return None
            
            print("Token exchange successful!")
            return response.json()
    except Exception as e:
        print(f"Error exchanging code for tokens: {e}")
        return None

async def get_google_user_info(access_token: str) -> Optional[Dict[str, Any]]:
    """Get user info from Google"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                print(f"Failed to get user info: {response.text}")
                return None
            
            return response.json()
    except Exception as e:
        print(f"Error getting user info: {e}")
        return None

def create_or_update_user(user_data: Dict[str, Any], tokens: Dict[str, Any], db: Session) -> User:
    """Create or update user in database"""
    user = db.query(User).filter(User.email == user_data["email"]).first()
    
    if not user:
        # Create new user first
        user = User(
            email=user_data["email"],
            name=user_data.get("name", ""),
            picture=user_data.get("picture"),
            google_id=user_data.get("id"),
            google_refresh_token=tokens.get("refresh_token")
        )
        db.add(user)
        db.flush()  # Flush to get the user.id without committing
        
        # Now create email account with the user.id
        email_account = EmailAccount(
            email=user_data["email"],
            provider="gmail",
            is_primary=True,
            access_token=tokens.get("access_token"),
            refresh_token=tokens.get("refresh_token"),
            user_id=user.id  # Now user.id will have a value
        )
        db.add(email_account)
    else:
        # Update existing user
        user.name = user_data.get("name", user.name)
        user.picture = user_data.get("picture", user.picture)
        user.google_id = user_data.get("id", user.google_id)
        if tokens.get("refresh_token"):
            user.google_refresh_token = tokens.get("refresh_token")
        
        # Update or create email account
        email_account = db.query(EmailAccount).filter(
            EmailAccount.user_id == user.id,
            EmailAccount.is_primary == True
        ).first()
        
        if email_account:
            email_account.access_token = tokens.get("access_token")
            if tokens.get("refresh_token"):
                email_account.refresh_token = tokens.get("refresh_token")
        else:
            # Create email account if it doesn't exist
            email_account = EmailAccount(
                email=user_data["email"],
                provider="gmail",
                is_primary=True,
                access_token=tokens.get("access_token"),
                refresh_token=tokens.get("refresh_token"),
                user_id=user.id
            )
            db.add(email_account)
    
    db.commit()
    db.refresh(user)
    return user

# ====================== Gmail Functions ======================

class GmailService:
    def __init__(self, access_token: str, refresh_token: str = None):
        """Initialize Gmail service with access token"""
        # Create credentials with all required fields
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=config.GOOGLE_CLIENT_ID,
            client_secret=config.GOOGLE_CLIENT_SECRET,
            scopes=['https://www.googleapis.com/auth/gmail.readonly']
        )
        self.service = build('gmail', 'v1', credentials=credentials)
    
    def get_messages(self, query: str = "", max_results: int = 50) -> List[Dict[str, Any]]:
        """Get Gmail messages"""
        try:
            results = self.service.users().messages().list(
                userId='me',
                q=query,
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            return messages
        except HttpError as error:
            print(f'Gmail API error: {error}')
            return []
    
    def get_message_details(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Get full message details"""
        try:
            message = self.service.users().messages().get(
                userId='me',
                id=message_id
            ).execute()
            
            # Parse message
            headers = message['payload'].get('headers', [])
            
            # Extract header info
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
            sender = next((h['value'] for h in headers if h['name'] == 'From'), '')
            date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
            
            # Extract sender email
            email_match = re.search(r'<(.+?)>', sender)
            sender_email = email_match.group(1) if email_match else sender
            sender_name = sender.split('<')[0].strip() if '<' in sender else sender
            
            # Extract body
            body = self._get_message_body(message['payload'])
            
            # Check for attachments
            attachments = self._get_attachments(message['payload'])
            
            return {
                'id': message_id,
                'threadId': message.get('threadId'),
                'subject': subject,
                'sender': sender_name,
                'senderEmail': sender_email,
                'date': date,
                'body': body,
                'snippet': message.get('snippet', ''),
                'attachments': attachments,
                'labelIds': message.get('labelIds', [])
            }
            
        except HttpError as error:
            print(f'Gmail API error: {error}')
            return None
    
    def _get_message_body(self, payload: Dict) -> str:
        """Extract message body from payload"""
        body = ''
        
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body']['data']
                    body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                    break
                elif part['mimeType'] == 'text/html' and not body:
                    data = part['body']['data']
                    html = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                    # Simple HTML to text conversion
                    body = re.sub('<[^<]+?>', '', html)
        elif payload['body'].get('data'):
            body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='ignore')
        
        return body.strip()
    
    def _get_attachments(self, payload: Dict) -> List[Dict[str, str]]:
        """Extract attachment information"""
        attachments = []
        
        if 'parts' in payload:
            for part in payload['parts']:
                if part.get('filename'):
                    attachments.append({
                        'name': part['filename'],
                        'size': str(part['body'].get('size', 0)),
                        'mimeType': part.get('mimeType', '')
                    })
        
        return attachments

# ====================== Email Functions ======================

def sync_gmail_emails(user_id: str, db: Session) -> Dict[str, Any]:
    """Sync emails from Gmail for a user"""
    try:
        # Get user and email account
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"success": False, "error": "User not found"}
        
        email_account = db.query(EmailAccount).filter(
            EmailAccount.user_id == user_id,
            EmailAccount.is_primary == True
        ).first()
        
        if not email_account or not email_account.access_token:
            return {"success": False, "error": "No email account configured"}
        
        # Initialize Gmail service with both tokens
        gmail = GmailService(
            access_token=email_account.access_token,
            refresh_token=email_account.refresh_token
        )
        
        # Get messages
        messages = gmail.get_messages(max_results=20)
        
        synced_count = 0
        for msg in messages:
            # Check if we already have this email
            existing = db.query(Email).filter(Email.gmail_id == msg['id']).first()
            if existing:
                continue
            
            # Get full message details
            details = gmail.get_message_details(msg['id'])
            if not details:
                continue
            
            # AI-powered categorization with confidence scoring
            category, confidence = categorize_email(
                details['subject'], 
                details['body'],
                details.get('senderEmail', ''),
                details.get('sender', '')
            )
            
            # Create email record with AI categorization
            email = Email(
                gmail_id=msg['id'],
                thread_id=details['threadId'],
                sender=details['sender'],
                sender_email=details['senderEmail'],
                subject=details['subject'],
                summary=details['snippet'][:200] if details['snippet'] else '',
                full_content=details['body'],
                category=category,
                priority=determine_priority(details['subject'], details['sender']),
                attachments=details['attachments'],
                email_date=parse_email_date(details['date']),
                user_id=user_id,
                email_account_id=email_account.id
            )
            db.add(email)
            synced_count += 1
        
        # Update last sync time
        email_account.last_sync_at = datetime.utcnow()
        db.commit()
        
        return {
            "success": True,
            "emailsSynced": synced_count,
            "totalFetched": len(messages)
        }
        
    except Exception as e:
        print(f"Error syncing emails: {e}")
        return {"success": False, "error": str(e)}

def categorize_email(subject: str, body: str, sender_email: str = "", sender_name: str = "") -> tuple:
    """AI-powered email categorization with confidence scoring"""
    # Try enhanced categorizer first, fallback to basic if needed
    try:
        from enhanced_email_categorizer import get_enhanced_categorizer
        
        # Prepare email data for enhanced categorizer
        email_data = {
            "subject": subject,
            "body": body,
            "sender": sender_email or sender_name,
            "sender_email": sender_email
        }
        
        # Get enhanced AI categorization
        categorizer = get_enhanced_categorizer(use_ai=True)
        result = categorizer.categorize(email_data)
        
        # Extract category and confidence
        category = result.get('category', 'Important')
        confidence = result.get('confidence', 0.7)
        
        # Store metadata if needed (for future use)
        metadata = result.get('metadata', {})
        
        return category, confidence
        
    except ImportError:
        # Fallback to original categorizer if enhanced not available
        from ai_categorizer import get_categorizer
        
        email_data = {
            "subject": subject,
            "body": body,
            "sender_email": sender_email,
            "sender": sender_name
        }
        
        categorizer = get_categorizer()
        category, confidence, metadata = categorizer.categorize(email_data)
        
        return category, confidence

def determine_priority(subject: str, sender: str) -> str:
    """Determine email priority"""
    subject_lower = subject.lower()
    
    if any(word in subject_lower for word in ['urgent', 'asap', 'important', 'critical']):
        return 'high'
    elif any(word in subject_lower for word in ['reminder', 'follow-up', 'update']):
        return 'medium'
    else:
        return 'normal'

def parse_email_date(date_str: str) -> Optional[datetime]:
    """Parse email date string to datetime"""
    try:
        # Gmail date format: "Mon, 15 Aug 2024 10:30:00 -0700"
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(date_str)
    except:
        return None

def get_user_emails(user_id: str, db: Session, filters: Dict[str, Any] = None) -> List[Email]:
    """Get emails for a user with optional filtering"""
    query = db.query(Email).filter(Email.user_id == user_id)
    
    if filters:
        if filters.get('category'):
            query = query.filter(Email.category == filters['category'])
        if filters.get('search'):
            search_term = f"%{filters['search']}%"
            query = query.filter(
                (Email.subject.ilike(search_term)) |
                (Email.sender.ilike(search_term)) |
                (Email.full_content.ilike(search_term))
            )
        if filters.get('status'):
            query = query.filter(Email.status == filters['status'])
    
    # Order by date
    query = query.order_by(Email.email_date.desc().nullslast(), Email.created_at.desc())
    
    # Apply limit and offset
    if filters and filters.get('limit'):
        query = query.limit(filters['limit'])
    if filters and filters.get('offset'):
        query = query.offset(filters['offset'])
    
    return query.all()

def get_email_stats(user_id: str, db: Session) -> Dict[str, int]:
    """Get email statistics for a user"""
    total = db.query(Email).filter(Email.user_id == user_id).count()
    unread = db.query(Email).filter(
        Email.user_id == user_id,
        Email.status == "unread"
    ).count()
    categorized = db.query(Email).filter(
        Email.user_id == user_id,
        Email.category != None
    ).count()
    high_priority = db.query(Email).filter(
        Email.user_id == user_id,
        Email.priority == "high"
    ).count()
    
    return {
        "totalEmails": total,
        "unreadEmails": unread,
        "categorizedEmails": categorized,
        "pendingActions": high_priority
    }

def format_email_response(email: Email) -> Dict[str, Any]:
    """Format email model to response dictionary"""
    return {
        "id": email.id,
        "sender": email.sender,
        "senderEmail": email.sender_email,
        "subject": email.subject,
        "summary": email.summary,
        "fullContent": email.full_content,
        "category": email.category,
        "datetime": email.email_date.isoformat() if email.email_date else None,
        "timestamp": email.created_at.isoformat(),
        "priority": email.priority,
        "attachments": email.attachments or [],
        "tags": email.tags or [],
        "status": email.status
    }

# ====================== Mock Data Functions ======================

def create_mock_emails(user_id: str, db: Session):
    """Create some mock emails for testing"""
    mock_data = [
        {
            "sender": "John Doe",
            "sender_email": "john@example.com",
            "subject": "Project Update - Q4 Planning",
            "summary": "Latest updates on the Q4 project timeline and deliverables",
            "full_content": "Hi team,\n\nI wanted to share the latest updates on our Q4 project planning. We've made significant progress on the following items:\n\n1. Completed market research\n2. Finalized technical specifications\n3. Started development phase\n\nPlease review the attached documents and provide your feedback by end of week.\n\nBest regards,\nJohn",
            "category": "Important",
            "priority": "high"
        },
        {
            "sender": "Jane Smith",
            "sender_email": "jane@example.com",
            "subject": "Team Sync Meeting Tomorrow - 2PM",
            "summary": "Reminder about tomorrow's team sync meeting",
            "full_content": "Hi,\n\nJust a quick reminder about our team sync meeting tomorrow at 2 PM in Conference Room B. We'll be discussing:\n\n- Sprint retrospective\n- Next sprint planning\n- Resource allocation\n\nPlease join via Zoom: https://zoom.us/j/123456789\n\nSee you there!\nJane",
            "category": "Meetings",
            "priority": "medium"
        },
        {
            "sender": "FedEx Tracking",
            "sender_email": "tracking@fedex.com",
            "subject": "Your package is on its way",
            "summary": "Tracking update for your recent order",
            "full_content": "Your package is being delivered today.\n\nTracking number: 1234567890\n\nExpected delivery: Today by 8 PM\n\nTrack your package: https://fedex.com/track",
            "category": "Deliveries",
            "priority": "normal"
        },
        {
            "sender": "Suspicious Sender",
            "sender_email": "noreply@suspicious-domain.xyz",
            "subject": "You won $1000000 - Claim Now!",
            "summary": "Congratulations! You've won a prize",
            "full_content": "Dear winner,\n\nYou have won $1,000,000 in our lottery! Click here immediately to claim your prize before it expires.\n\nProvide your bank account and SSN to receive the funds.\n\nAct now - limited time only!",
            "category": "Phishing/Spam/Scam",
            "priority": "low"
        },
        {
            "sender": "Boss",
            "sender_email": "boss@company.com",
            "subject": "URGENT: Board presentation deadline tomorrow",
            "summary": "Critical deadline for board presentation",
            "full_content": "Team,\n\nThis is urgent - we need the board presentation completed by tomorrow morning.\n\nThe CEO will be reviewing it at 9 AM sharp.\n\nPlease prioritize this above all other tasks.\n\nThanks",
            "category": "Important",
            "priority": "high"
        }
    ]
    
    # Get or create default email account
    email_account = db.query(EmailAccount).filter(
        EmailAccount.user_id == user_id,
        EmailAccount.is_primary == True
    ).first()
    
    if not email_account:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            email_account = EmailAccount(
                email=user.email,
                provider="gmail",
                is_primary=True,
                user_id=user_id
            )
            db.add(email_account)
            db.commit()
            db.refresh(email_account)
    
    for data in mock_data:
        email = Email(
            sender=data["sender"],
            sender_email=data["sender_email"],
            subject=data["subject"],
            summary=data["summary"],
            full_content=data["full_content"],
            category=data["category"],
            priority=data["priority"],
            email_date=datetime.utcnow() - timedelta(hours=len(mock_data)),
            user_id=user_id,
            email_account_id=email_account.id
        )
        db.add(email)
    
    db.commit()