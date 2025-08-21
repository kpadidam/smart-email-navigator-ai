#!/usr/bin/env python3
"""
Enhanced Smart Email Navigator AI - Main Entry Point
Launches the FastAPI server with enhanced email categorization
"""

import os
import sys
import subprocess
import webbrowser
import time
from pathlib import Path

def check_dependencies():
    """Check and install required dependencies"""
    required = [
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'pydantic',
        'python-jose',
        'httpx',
        'python-multipart',
        'behave',
        'openai'
    ]
    
    print("📦 Checking dependencies...")
    missing = []
    
    for package in required:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing.append(package)
    
    if missing:
        print(f"📥 Installing missing packages: {', '.join(missing)}")
        subprocess.run([sys.executable, '-m', 'pip', 'install'] + missing, check=True)
        print("✅ Dependencies installed!")
    else:
        print("✅ All dependencies are installed!")

def setup_environment():
    """Setup environment variables"""
    env_file = Path(".env")
    
    if not env_file.exists():
        print("⚠️  No .env file found. Creating with defaults...")
        env_content = """# Enhanced Smart Email Navigator Configuration
DATABASE_URL=sqlite:///./email_navigator.db
JWT_SECRET=your-secret-key-change-in-production
ENVIRONMENT=development
PORT=5001

# OpenAI Configuration (optional - for enhanced categorization)
OPENAI_API_KEY=

# Google OAuth (optional - for Gmail sync)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
"""
        env_file.write_text(env_content)
        print("✅ Created .env file with defaults")
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Check for OpenAI key
    if not os.getenv("OPENAI_API_KEY"):
        print("\n⚠️  OpenAI API key not configured")
        print("   Enhanced categorization will use rule-based fallback")
        print("   To enable AI categorization, add OPENAI_API_KEY to .env file\n")

def run_tests():
    """Run BDD tests for enhanced categorization"""
    print("\n🧪 Running enhanced categorization tests...")
    result = subprocess.run(
        ["behave", "features/enhanced_simple.feature"],
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        print("✅ All tests passed!")
    else:
        print("⚠️  Some tests failed. Check the output above.")
        if input("Continue anyway? (y/n): ").lower() != 'y':
            sys.exit(1)

def start_server():
    """Start the FastAPI server"""
    port = int(os.getenv("PORT", 5001))
    
    print(f"\n🚀 Starting Enhanced Smart Email Navigator AI on port {port}...")
    print(f"📧 Categories: Meetings, Deliveries, Important, Phishing/Spam/Scam")
    print(f"🤖 AI Mode: {'Enabled' if os.getenv('OPENAI_API_KEY') else 'Disabled (using rules)'}")
    print(f"\n🌐 Opening browser at http://localhost:{port}")
    print("📝 Press Ctrl+C to stop the server\n")
    
    # Open browser after a short delay
    def open_browser():
        time.sleep(2)
        webbrowser.open(f"http://localhost:{port}")
    
    import threading
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Start the server
    subprocess.run([
        sys.executable, "-m", "uvicorn",
        "main:app",
        "--reload",
        "--port", str(port),
        "--host", "0.0.0.0"
    ])

def main():
    """Main entry point"""
    print("=" * 60)
    print("🎯 Enhanced Smart Email Navigator AI")
    print("   With Advanced Categorization & Security Detection")
    print("=" * 60)
    
    try:
        # Check dependencies
        check_dependencies()
        
        # Setup environment
        setup_environment()
        
        # Run tests if requested
        if "--test" in sys.argv or "--tests" in sys.argv:
            run_tests()
        
        # Start server
        start_server()
        
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down Enhanced Email Navigator...")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()