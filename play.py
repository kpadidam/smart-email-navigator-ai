#!/usr/bin/env python3
"""
Smart Email Categorizer - One-Click Launcher
Starts the AI-powered email categorization system and opens your browser
"""

import os
import sys
import time
import socket
import webbrowser
import subprocess
import signal
from pathlib import Path

# ASCII art logo
LOGO = """
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     📧 SMART EMAIL CATEGORIZER with AI                       ║
║     Intelligent Email Organization Powered by FastAPI        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"""

def find_free_port(start_port=5001):
    """Find an available port starting from start_port"""
    port = start_port
    while port < 65535:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('', port))
                return port
            except:
                port += 1
    return start_port

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("\n📦 Installing dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        return True

def start_server(port):
    """Start the FastAPI server"""
    env = os.environ.copy()
    env["PORT"] = str(port)
    
    # Start the server process
    server_process = subprocess.Popen(
        [sys.executable, "main.py"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )
    
    return server_process

def wait_for_server(port, timeout=30):
    """Wait for the server to be ready"""
    import httpx
    
    print("⏳ Waiting for server to start...", end="")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            response = httpx.get(f"http://localhost:{port}/health")
            if response.status_code == 200:
                print(" ✅ Server is ready!")
                return True
        except:
            pass
        
        print(".", end="", flush=True)
        time.sleep(0.5)
    
    print(" ❌ Server failed to start")
    return False

def main():
    """Main entry point"""
    print(LOGO)
    
    # Check dependencies
    print("🔍 Checking dependencies...")
    if not check_dependencies():
        print("❌ Failed to install dependencies")
        sys.exit(1)
    
    # Find available port
    port = find_free_port(5001)
    print(f"🌐 Using port: {port}")
    
    # Initialize database
    print("🗄️  Initializing database...")
    from utils import init_database
    init_database()
    
    # Start the server
    print(f"🚀 Starting Smart Email Categorizer...")
    server_process = start_server(port)
    
    # Handle Ctrl+C gracefully
    def signal_handler(sig, frame):
        print("\n\n👋 Shutting down Smart Email Categorizer...")
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()
        print("✅ Goodbye!")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    # Wait for server to be ready
    if wait_for_server(port):
        # Open browser
        url = f"http://localhost:{port}"
        print(f"\n🌟 Smart Email Categorizer is running at: {url}")
        print("📧 Opening your browser to the email inbox...")
        
        # Give it a moment to fully load
        time.sleep(1)
        
        # Open the browser
        webbrowser.open(url)
        
        print("\n" + "="*60)
        print("✨ Smart Email Categorizer is ready!")
        print("="*60)
        print("\nFeatures:")
        print("  • 🤖 AI-powered email categorization")
        print("  • 📊 Smart inbox with categories: Work, Personal, Promotional, Spam")
        print("  • 🔍 Confidence scoring for each categorization")
        print("  • 🔄 Real-time Gmail sync")
        print("  • 📈 Category statistics and insights")
        print("\nPress Ctrl+C to stop the server")
        print("="*60 + "\n")
        
        # Keep the server running
        try:
            # Stream server output
            for line in server_process.stdout:
                if "ERROR" in line or "WARNING" in line:
                    print(f"  {line.strip()}")
        except KeyboardInterrupt:
            pass
        finally:
            signal_handler(None, None)
    else:
        print("❌ Failed to start the server")
        server_process.terminate()
        sys.exit(1)

if __name__ == "__main__":
    main()