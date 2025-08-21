# Google OAuth Setup Guide

## The Issue
The error you're seeing indicates that your Google OAuth app isn't properly configured. Here's how to fix it:

## Step-by-Step Fix

### 1. **Go to Google Cloud Console**
- Visit: https://console.cloud.google.com/
- Make sure you're logged in with the correct Google account

### 2. **Select or Create a Project**
- Click on the project dropdown at the top
- Select your existing project or create a new one

### 3. **Enable Required APIs**
- Go to **APIs & Services** → **Library**
- Search and enable these APIs:
  - **Google+ API** (or Google Identity)
  - **Gmail API** (for email access)
  - Click "Enable" for each

### 4. **Configure OAuth Consent Screen**
- Go to **APIs & Services** → **OAuth consent screen**
- Select **External** user type
- Fill in the required fields:
  - App name: "Smart Email Navigator"
  - User support email: Your email
  - Developer contact: Your email
  - Authorized domains: Leave empty for local testing
- Click **Save and Continue**

### 5. **Add Scopes**
- Click **Add or Remove Scopes**
- Add these scopes:
  - `openid`
  - `email`
  - `profile`
  - `https://www.googleapis.com/auth/gmail.readonly`
- Click **Update** and then **Save and Continue**

### 6. **Add Test Users** (if in testing mode)
- Add your email address as a test user
- Click **Save and Continue**

### 7. **Update OAuth 2.0 Credentials**
- Go to **APIs & Services** → **Credentials**
- Click on your OAuth 2.0 Client ID (or create new one)
- Set Application type: **Web application**
- Add Authorized JavaScript origins:
  ```
  http://localhost:5001
  http://localhost
  ```
- Add Authorized redirect URIs:
  ```
  http://localhost:5001/api/auth/google/callback
  ```
- Click **Save**

### 8. **Get New Credentials**
If you created a new OAuth client:
1. Download the credentials JSON
2. Update your `.env` file with:
   - `GOOGLE_CLIENT_ID=your-new-client-id`
   - `GOOGLE_CLIENT_SECRET=your-new-client-secret`

### 9. **Restart the App**
```bash
# Stop the server (Ctrl+C)
# Start it again
python main.py
```

## Alternative: Use Demo Account

While you're setting up Google OAuth, you can use the **Demo Account** to test the app:
1. Go to http://localhost:5001
2. Click **"🚀 Try Demo Account"**
3. You'll be logged in instantly with sample data

## Common Issues

### "Access blocked: This app's request is invalid"
- Make sure redirect URI matches EXACTLY (including trailing slashes)
- Check that you've enabled all required APIs

### "Error 400: redirect_uri_mismatch"
- The redirect URI in your code must match exactly what's in Google Console
- Check for `http` vs `https` and port numbers

### "This app hasn't been verified"
- This is normal for development
- Click "Advanced" → "Go to [App Name] (unsafe)" to proceed

## Still Having Issues?

If Google OAuth is still not working:
1. **Use the Demo Account** - It works immediately without any setup
2. **Deploy to Railway** - Sometimes OAuth works better with a public URL
3. **Create a new OAuth app** - Sometimes starting fresh helps

## For Production (Railway)

When deploying to Railway, add these redirect URIs:
```
https://your-app.railway.app/api/auth/google/callback
```

And update your Railway environment variables:
- `GOOGLE_REDIRECT_URI=https://your-app.railway.app/api/auth/google/callback`