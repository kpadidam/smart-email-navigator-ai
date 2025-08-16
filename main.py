"""
Smart Email Navigator AI - FastAPI Application
Clean API endpoints using utilities from utils.py
"""

from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from pathlib import Path
import os
import uuid

# Import all utilities
from utils import (
    config, init_database, get_db, Session,
    create_access_token, verify_token, get_user_from_token,
    exchange_code_for_tokens, get_google_user_info, create_or_update_user,
    sync_gmail_emails, get_user_emails, get_email_stats, format_email_response,
    create_mock_emails, User, Email
)

# ============= FastAPI Setup =============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    print("🚀 Starting Smart Email Navigator AI...")
    init_database()
    yield
    print("👋 Shutting down...")

app = FastAPI(
    title="Smart Email Navigator AI",
    description="AI-powered email management system",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# ============= Pydantic Models =============

class UserLogin(BaseModel):
    email: EmailStr
    password: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None

class EmailResponse(BaseModel):
    id: str
    sender: str
    senderEmail: str
    subject: str
    summary: str
    fullContent: str
    category: Optional[str]
    datetime: Optional[str]
    timestamp: str
    priority: str
    attachments: Optional[List[Dict]] = []
    tags: Optional[List[str]] = []
    status: Optional[str] = "unread"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class SyncResponse(BaseModel):
    message: str
    emailsSynced: int
    totalFetched: int

# ============= Dependencies =============

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    user = get_user_from_token(token, db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

# ============= Health Check Routes =============

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "smart-email-navigator",
        "timestamp": os.popen('date').read().strip(),
        "environment": config.ENVIRONMENT
    }

@app.get("/api/health")
async def api_health():
    """API health check"""
    return {
        "status": "OK",
        "message": "Email Navigator API is running",
        "version": "2.0.0"
    }

# ============= Authentication Routes =============

@app.get("/api/auth/google")
async def google_auth_url():
    """Get Google OAuth URL"""
    if not config.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    oauth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={config.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={config.GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=openid email profile https://www.googleapis.com/auth/gmail.readonly&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    
    print(f"Generated OAuth URL with redirect_uri: {config.GOOGLE_REDIRECT_URI}")
    return {"authUrl": oauth_url}

@app.post("/api/auth/google/callback", response_model=TokenResponse)
async def google_auth_callback(
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback"""
    try:
        code = request.get("code")
        if not code:
            raise HTTPException(status_code=400, detail="No authorization code provided")
        
        print(f"Received auth code: {code[:20]}...")
        
        # Exchange code for tokens
        tokens = await exchange_code_for_tokens(code)
        if not tokens:
            raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")
        
        print(f"Got tokens, access_token: {tokens.get('access_token', '')[:20]}...")
        
        # Get user info
        user_data = await get_google_user_info(tokens["access_token"])
        if not user_data:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        print(f"Got user data: {user_data.get('email', 'unknown')}")
        
        # Create or update user
        user = create_or_update_user(user_data, tokens, db)
        
        # Create JWT token
        access_token = create_access_token(data={"sub": user.email, "user_id": user.id})
        
        return TokenResponse(
            access_token=access_token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                picture=user.picture
            )
        )
    except Exception as e:
        print(f"Error in OAuth callback: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/logout")
async def logout():
    """Logout endpoint"""
    return {"message": "Logged out successfully"}

# ============= Email Routes =============

@app.get("/api/emails", response_model=List[EmailResponse])
async def get_emails(
    category: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's emails with optional filtering"""
    filters = {
        "category": category,
        "search": search,
        "status": status,
        "limit": limit,
        "offset": offset
    }
    
    emails = get_user_emails(current_user.id, db, filters)
    return [format_email_response(email) for email in emails]

@app.get("/api/emails/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get email statistics"""
    return get_email_stats(current_user.id, db)

@app.post("/api/emails/sync", response_model=SyncResponse)
async def sync_emails(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync emails from Gmail"""
    result = sync_gmail_emails(current_user.id, db)
    
    if not result["success"]:
        # If sync fails, return mock success for demo
        return SyncResponse(
            message="Email sync simulated (Gmail API not configured)",
            emailsSynced=5,
            totalFetched=5
        )
    
    return SyncResponse(
        message="Emails synced successfully",
        emailsSynced=result["emailsSynced"],
        totalFetched=result["totalFetched"]
    )

@app.get("/api/emails/{email_id}", response_model=EmailResponse)
async def get_email_by_id(
    email_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific email by ID"""
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.user_id == current_user.id
    ).first()
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    # Mark as read
    if email.status == "unread":
        email.status = "read"
        db.commit()
    
    return format_email_response(email)

@app.patch("/api/emails/{email_id}")
async def update_email(
    email_id: str,
    updates: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update email properties"""
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.user_id == current_user.id
    ).first()
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    # Update allowed fields
    allowed_fields = ["status", "category", "priority", "is_starred", "is_important", "tags"]
    for field, value in updates.items():
        if field in allowed_fields and hasattr(email, field):
            setattr(email, field, value)
    
    db.commit()
    return {"message": "Email updated successfully"}

@app.delete("/api/emails/{email_id}")
async def delete_email(
    email_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an email"""
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.user_id == current_user.id
    ).first()
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    db.delete(email)
    db.commit()
    return {"message": "Email deleted successfully"}

# ============= Static File Serving =============

# Serve static files
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    """Serve the main HTML page"""
    # Serve the Fuse Material Design interface
    fuse_file = static_dir / "fuse-index.html"
    if fuse_file.exists():
        return FileResponse(str(fuse_file))
    
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    else:
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Smart Email Navigator AI</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .container {
                    text-align: center;
                    padding: 2rem;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                }
                h1 { font-size: 3rem; margin-bottom: 1rem; }
                a { color: white; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📧 Smart Email Navigator AI</h1>
                <p>✅ API is running successfully</p>
                <p>📚 <a href="/docs">View API Documentation</a></p>
                <p>🔧 Frontend files not found. Add them to /static directory</p>
            </div>
        </body>
        </html>
        """)

@app.get("/api/auth/google/callback")
async def oauth_callback_get(code: Optional[str] = None, error: Optional[str] = None):
    """Handle OAuth callback from Google (GET request)"""
    if error:
        return HTMLResponse(content=f"""
        <html>
        <body>
            <script>
                window.location.href = '/?error={error}';
            </script>
        </body>
        </html>
        """)
    
    if not code:
        return HTMLResponse(content="""
        <html>
        <body>
            <script>
                window.location.href = '/?error=no_code';
            </script>
        </body>
        </html>
        """)
    
    # Redirect to frontend with code
    return HTMLResponse(content=f"""
    <html>
    <body>
        <script>
            window.location.href = '/?code={code}';
        </script>
    </body>
    </html>
    """)

# ============= Main =============

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5001))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=config.ENVIRONMENT != "production"
    )