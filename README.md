
# 📬 Smart Email Navigator AI – FrontEnd




# 📬 Smart Email Navigator AI – Backend

This is the backend server for the Smart Email Navigator AI system — a productivity dashboard that fetches, categorizes, and summarizes emails using AI, and emits real-time updates to the frontend via WebSockets.

---

## 🚀 Features

- ✅ Gmail OAuth2 integration (secure Gmail fetch)
- ✅ OpenAI-powered email classification & summarization
- ✅ JWT-based user authentication
- ✅ MongoDB-based persistence
- ✅ Real-time updates via Socket.IO
- ✅ Shared inboxes / team collaboration
- ✅ RESTful API for emails, users, dashboard
- ✅ Email sync via cron jobs

---

## 🧱 Tech Stack

| Layer         | Tech                     |
|---------------|--------------------------|
| API Framework | Express.js               |
| Database      | MongoDB + Mongoose       |
| Auth          | JWT + bcrypt             |
| Gmail Access  | Gmail API (OAuth2)       |
| AI/ML         | OpenAI GPT-4             |
| Real-time     | Socket.IO (WebSockets)   |
| Logging       | Winston                  |

---

## 📁 Project Structure

backend/
├── config/             # Gmail & DB config
├── controllers/        # REST logic (auth, emails, dashboard)
├── middleware/         # Auth, rate limit, error handling
├── models/             # Mongoose schemas
├── routes/             # Express routes
├── services/           # GmailService, AIService, EmailProcessor
├── sockets/            # Socket.IO handlers
├── utils/              # Logging, parsing, prompts
├── app.js              # Main Express + Socket.IO app
└── package.json

---

## 🧠 Architecture Overview

```text
User ───> [ REST API ]
     │           │
     │           └──> MongoDB (User, Emails)
     │
     └── Socket.IO <── Email Processor <── Gmail API + OpenAI

	•	Gmail OAuth2 fetches unread emails
	•	OpenAI classifies and summarizes each message
	•	Emails and metadata stored in MongoDB
	•	Socket.IO emits real-time events to frontend

⸻

🔧 Setup Instructions

1. Clone the Repo

git clone https://github.com/your-org/smart-email-navigator-ai.git
cd smart-email-navigator-ai/backend

2. Install Dependencies

npm install

3. Create .env File

PORT=3000
MONGODB_URI=mongodb://localhost:27017/email-navigator
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_key

GMAIL_CLIENT_ID=your_google_client_id
GMAIL_CLIENT_SECRET=your_google_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

FRONTEND_URL=http://localhost:5173

4. Run the Server

npm run dev


⸻

📡 API Reference

Auth Endpoints
	•	POST /api/auth/register
	•	POST /api/auth/login
	•	GET /api/auth/me
	•	PUT /api/auth/change-password

Email Endpoints
	•	GET /api/emails?category=meetings
	•	POST /api/emails/sync
	•	PUT /api/emails/:id/archive
	•	PUT /api/emails/:id/mark-done

Dashboard
	•	GET /api/dashboard/stats
	•	GET /api/dashboard/recent

Shared Inbox
	•	POST /api/email-accounts/:id/share
	•	GET /api/shared-inboxes

⸻

🔄 Real-time WebSocket Events
	•	connected – socket connection successful
	•	email:new – new Gmail message fetched
	•	email:processed – AI summary ready
	•	dashboard:stats_updated – live update of stats
	•	email:status_changed – read/unread/starred updates

Connect from frontend:

import io from 'socket.io-client';
const socket = io('http://localhost:3000', {
  auth: { token: yourJWT }
});


⸻

⏱️ Cron-based Sync
	•	Runs every 5 minutes by default
	•	Fetches unread Gmail messa
	•	Processes and emits live updates

⸻

