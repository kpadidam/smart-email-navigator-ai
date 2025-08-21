#EagleAI

An intelligent email management system powered by AI that automatically categorizes, prioritizes, and organizes your emails using advanced machine learning techniques.

 Features

- AI-Powered Email Categorization: Automatically categorizes emails into Meetings, Deliveries, Important, and Phishing/Spam/Scam
- Google OAuth Integration: Secure authentication with Gmail integration
- Real-time Email Sync: Synchronize and categorize emails from Gmail
- Smart Security Detection: Advanced phishing and spam detection with threat analysis
- RESTful API: FastAPI-based backend with comprehensive endpoints
- Material Design UI: Modern, responsive interface with Fuse Material Design
- Database Support: SQLAlchemy ORM with PostgreSQL/SQLite support
- Production Ready: Deployed on Railway with health monitoring

 Tech Stack

# Backend
- Framework: FastAPI (Python 3.11)
- Database: SQLAlchemy with PostgreSQL (production) / SQLite (development)
- Authentication: JWT tokens with Google OAuth 2.0
- AI/ML: OpenAI GPT-3.5 integration with fallback rule-based system
- Email Integration: Google Gmail API

# Frontend
- UI Framework: Material Design (Fuse theme)
- Languages: HTML5, CSS3, JavaScript
- Styling: Responsive design with modern UI components

# Deployment
- Platform: Railway
- Server: Uvicorn ASGI server
- Build: Nixpacks
- Monitoring: Health check endpoints

 Project Structure

```
smart_email_navigator_ai/
├── main.py                      # FastAPI application entry point
├── utils.py                     # Core utilities and database models
├── ai_categorizer.py            # Basic AI categorization engine
├── enhanced_email_categorizer.py # Advanced OpenAI-powered categorizer
├── requirements.txt             # Python dependencies
├── runtime.txt                  # Python version specification
├── railway.json                 # Railway deployment configuration
├── email_navigator.db           # SQLite database (local development)
├── static/                      # Frontend assets
│   ├── fuse-index.html         # Main Fuse Material Design UI
│   ├── index.html              # Basic UI fallback
│   ├── fuse-app.js             # Fuse frontend logic
│   ├── fuse-styles.css         # Fuse styling
│   └── ...                     # Other static assets
├── features/                    # BDD test features
│   ├── environment.py          # Test configuration
│   ├── steps/                  # Test step definitions
│   └── *.feature               # Gherkin test scenarios
├── LABS/                       # Experimental features
├── markdown/                   # Documentation
└── pseudocode/                 # System design specifications
```

 Installation

# Prerequisites
- Python 3.11+
- PostgreSQL (for production) or SQLite (for development)
- Google Cloud Console account for OAuth setup
- OpenAI API key (optional, for AI categorization)

# Local Development Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/smart_email_navigator_ai.git
cd smart_email_navigator_ai
```

2. Create virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Set up environment variables
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL=sqlite:///./email_navigator.db  # Or PostgreSQL URL

# JWT Secret
JWT_SECRET=your-secret-key-change-in-production

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback

# OpenAI (Optional)
OPENAI_API_KEY=your-openai-api-key

# Environment
ENVIRONMENT=development
DEBUG=True
PORT=5001
```

5. Run the application
```bash
python main.py
# Or using uvicorn directly:
uvicorn main:app --reload --host 0.0.0.0 --port 5001
```

6. Access the application
- Web UI: http://localhost:5001
- API Documentation: http://localhost:5001/docs
- Health Check: http://localhost:5001/health

 API Endpoints

# Authentication
- `GET /api/auth/google` - Get Google OAuth URL
- `POST /api/auth/google/callback` - Handle OAuth callback
- `POST /api/auth/logout` - Logout user

# Email Management
- `GET /api/emails` - Get user emails with filtering
- `GET /api/emails/{email_id}` - Get specific email
- `POST /api/emails/sync` - Sync emails from Gmail
- `POST /api/emails/categorize/{email_id}` - Re-categorize an email
- `PATCH /api/emails/{email_id}` - Update email properties
- `DELETE /api/emails/{email_id}` - Delete an email

# Statistics
- `GET /api/emails/stats` - Get email statistics
- `GET /api/emails/category-stats` - Get category distribution

# Health
- `GET /health` - Service health check
- `GET /api/health` - API health status

 Email Categories

The system categorizes emails into four main categories:

1. Meetings: Calendar invites, meeting requests, conference calls
2. Deliveries: Package tracking, shipping notifications, order confirmations
3. Important: Urgent messages, priority communications, critical updates
4. Phishing/Spam/Scam: Security threats, suspicious content, unwanted emails

 Security Features

- OAuth 2.0 Authentication: Secure Google login
- JWT Token Management: Stateless authentication
- Phishing Detection: Advanced pattern matching and AI analysis
- Data Encryption: Secure storage of sensitive information
- CORS Protection: Configured for production security
- SQL Injection Prevention: Parameterized queries via SQLAlchemy

 Testing

Run the BDD tests using Behave:
```bash
behave features/
```

Run integration tests:
```bash
python test_integration.py
python test_enhanced.py
```

 Deployment

# Railway Deployment

1. Connect to Railway
```bash
railway login
railway link
```

2. Set environment variables in Railway dashboard
- Add all required environment variables
- Configure PostgreSQL database addon

3. Deploy
```bash
railway up
```

The application will be available at your Railway-provided URL.

 Development Tools

# Interactive Testing
```bash
python play.py              # Test basic categorizer
python play_enhanced.py     # Test enhanced AI categorizer
```

# Database Population
```bash
python populate_enhanced_categories.py  # Populate test data
```

 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

 License

This project is licensed under the MIT License - see the LICENSE file for details.

 Acknowledgments

- FastAPI for the excellent web framework
- Google for Gmail API and OAuth services
- OpenAI for GPT-3.5 integration
- Railway for hosting platform
- Material Design for UI components

 Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the karthikreddy.p1998@gmail.com
