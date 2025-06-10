#!/usr/bin/env python3
"""
Railway deployment startup script for Trello Voice Assistant
Automatically detects which service to run based on environment
"""

import os
import sys
from pathlib import Path

def main():
    # Add current directory to Python path
    sys.path.insert(0, str(Path(__file__).parent))
    
    # Get Railway service type from environment
    service_type = os.environ.get('RAILWAY_SERVICE_TYPE', 'frontend')
    port = int(os.environ.get('PORT', 8080))
    
    print(f"🚀 Starting Trello Voice Assistant on Railway")
    print(f"📋 Service Type: {service_type}")
    print(f"🌐 Port: {port}")
    print(f"🔧 Environment: {os.environ.get('RAILWAY_ENVIRONMENT', 'unknown')}")
    
    if service_type == 'frontend':
        # Start frontend server
        print("🎨 Starting Frontend Server...")
        from frontend.server import serve_frontend
        serve_frontend(port=port)
        
    elif service_type == 'voice_agent':
        # Start voice agent (LiveKit)
        print("🎤 Starting Voice Agent...")
        from main import main as voice_main
        voice_main()
        
    else:
        # Default to frontend
        print("🎨 Starting Frontend Server (default)...")
        from frontend.server import serve_frontend
        serve_frontend(port=port)

if __name__ == "__main__":
    main() 