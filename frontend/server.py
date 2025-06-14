#!/usr/bin/env python3
"""
Simple HTTP server to serve the Trello Voice Assistant frontend
Enhanced with detailed logging for debugging
"""

import os
import http.server
import socketserver
import webbrowser
import json
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse, parse_qs
import uuid
from livekit import api

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Color coding for different request types
        colors = {
            "GET": "\033[94m",     # Blue
            "POST": "\033[92m",    # Green
            "ERROR": "\033[91m",   # Red
            "RESET": "\033[0m"     # Reset
        }
        
        method = args[0].split()[0] if args else "UNKNOWN"
        color = colors.get(method, colors.get("GET"))
        
        print(f"{color}[{timestamp}] {format % args}{colors['RESET']}")
    
    def end_headers(self):
        # Enable CORS for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        # Log detailed request info
        client_ip = self.client_address[0]
        user_agent = self.headers.get('User-Agent', 'Unknown')
        
        print(f"\033[96m[{datetime.now().strftime('%H:%M:%S')}] 📥 REQUEST: {self.path}")
        print(f"   Client: {client_ip}")
        print(f"   User-Agent: {user_agent[:50]}...\033[0m")
        
        # Handle special endpoints
        if self.path == '/token':
            self.send_token_response()
            return
        elif self.path == '/api/status':
            self.send_status_response()
            return
        elif self.path == '/test':
            self.send_test_response()
            return
        
        # Default file serving
        super().do_GET()
    
    def do_POST(self):
        # Handle POST requests (for voice data, etc.)
        content_length = int(self.headers.get('Content-Length', 0))
        content_type = self.headers.get('Content-Type', '')
        
        print(f"\033[93m[{datetime.now().strftime('%H:%M:%S')}] 📤 POST: {self.path}")
        print(f"   Content-Length: {content_length}")
        print(f"   Content-Type: {content_type}\033[0m")
        
        if content_length > 0:
            post_data = self.rfile.read(content_length)
            try:
                if 'json' in content_type:
                    data = json.loads(post_data.decode('utf-8'))
                    print(f"\033[93m   Data: {json.dumps(data, indent=2)[:200]}...\033[0m")
                else:
                    print(f"\033[93m   Raw Data Length: {len(post_data)} bytes\033[0m")
            except:
                print(f"\033[93m   Raw Data Length: {len(post_data)} bytes\033[0m")
        
        # Send a simple response
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            "status": "received",
            "timestamp": datetime.now().isoformat(),
            "path": self.path
        }
        self.wfile.write(json.dumps(response).encode())

    def do_OPTIONS(self):
        print(f"\033[95m[{datetime.now().strftime('%H:%M:%S')}] ⚙️ OPTIONS: {self.path}\033[0m")
        self.send_response(200)
        self.end_headers()
    
    def send_token_response(self):
        """Generate and send a LiveKit access token."""
        livekit_url = os.environ.get('LIVEKIT_URL')
        livekit_api_key = os.environ.get('LIVEKIT_API_KEY')
        livekit_api_secret = os.environ.get('LIVEKIT_API_SECRET')

        if not all([livekit_url, livekit_api_key, livekit_api_secret]):
            self.send_error(500, "LiveKit server environment variables are not set")
            print("\033[91mError: Missing LiveKit environment variables (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)\033[0m")
            return

        # Simple unique identity for the user, can be expanded later
        identity = f"user-{uuid.uuid4()}"
        
        # Create a grant for a specific room and identity
        # The room name should match the one the agent connects to
        room_name = os.environ.get('LIVEKIT_ROOM', 'trello-voice-agent-room')
        
        token = (
            api.AccessToken(livekit_api_key, livekit_api_secret)
            .with_identity(identity)
            .with_name("Frontend User")
            .with_grant(api.VideoGrant(room=room_name))
            .to_jwt()
        )
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "token": token,
            "url": livekit_url,
            "identity": identity
        }
        
        print(f"\033[92m[{datetime.now().strftime('%H:%M:%S')}] 🔑 Token generated for identity: {identity}\033[0m")
        self.wfile.write(json.dumps(response).encode())

    def send_test_response(self):
        """Send test response"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        test_data = {
            "status": "ok",
            "message": "Test endpoint working",
            "timestamp": datetime.now().isoformat(),
            "server": "Voice MCP Agent Frontend"
        }
        
        print(f"\033[92m[{datetime.now().strftime('%H:%M:%S')}] ✅ TEST ENDPOINT ACCESSED\033[0m")
        self.wfile.write(json.dumps(test_data, indent=2).encode())
    
    def send_status_response(self):
        """Send status response"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # Get current port from environment or default
        current_port = int(os.environ.get('PORT', 8080))
        
        status_data = {
            "frontend_server": "running",
            "timestamp": datetime.now().isoformat(),
            "port": current_port,
            "environment": "railway" if os.environ.get('RAILWAY_ENVIRONMENT') else "local",
            "endpoints": {
                "main": "/",
                "debug": "/debug.html",
                "test": "/test",
                "status": "/api/status"
            }
        }
        
        print(f"\033[92m[{datetime.now().strftime('%H:%M:%S')}] 📊 STATUS ENDPOINT ACCESSED\033[0m")
        self.wfile.write(json.dumps(status_data, indent=2).encode())

def serve_frontend(port=None):
    """Serve the frontend on the specified port"""
    
    # Get port from Railway environment variable or use default
    if port is None:
        port = int(os.environ.get('PORT', 8080))
    
    # Change to the frontend directory
    frontend_dir = Path(__file__).parent
    os.chdir(frontend_dir)
    
    # Create the server
    handler = CustomHTTPRequestHandler
    
    # Bind to 0.0.0.0 for Railway deployment, localhost for local dev
    host = "0.0.0.0" if os.environ.get('RAILWAY_ENVIRONMENT') else ""
    
    with socketserver.TCPServer((host, port), handler) as httpd:
        # Determine if running on Railway
        is_railway = bool(os.environ.get('RAILWAY_ENVIRONMENT'))
        base_url = f"http://{host if host else 'localhost'}:{port}"
        
        print("\033[95m" + "=" * 70)
        print("TRELLO VOICE ASSISTANT - FRONTEND SERVER")
        print("=" * 70 + "\033[0m")
        print(f"\033[92mServer running at: {base_url}\033[0m")
        print(f"\033[96mEnvironment: {'Railway' if is_railway else 'Local Development'}\033[0m")
        print(f"\033[96mPort: {port} {'(Railway assigned)' if is_railway else '(default/local)'}\033[0m")
        print(f"\033[94mDebug tool: {base_url}/debug.html\033[0m")
        print(f"\033[93mTest endpoint: {base_url}/test\033[0m")
        print(f"\033[96mStatus endpoint: {base_url}/api/status\033[0m")
        print(f"\033[90mServing from: {frontend_dir}\033[0m")
        
        print(f"\n\033[97mFeatures:\033[0m")
        print("  - \033[96mJarvis-style voice interface\033[0m")
        print("  - \033[96mPush-to-talk interaction\033[0m") 
        print("  - \033[96mReal-time speech recognition\033[0m")
        print("  - \033[96mSleek animations & glassmorphism\033[0m")
        print("  - \033[96mTrello integration ready\033[0m")
        
        print(f"\n\033[97mControls:\033[0m")
        print("  - \033[93mHold microphone button to speak\033[0m")
        print("  - \033[93mCtrl+Space for keyboard push-to-talk\033[0m")
        print("  - \033[93mUse quick action buttons for common tasks\033[0m")
        print("  - \033[91mPress Ctrl+C to stop the server\033[0m")
        
        print(f"\n\033[97mDebug Info:\033[0m")
        print("  - \033[90mCheck terminal for real-time request logs\033[0m")
        print("  - \033[90mOpen browser dev tools (F12) for client logs\033[0m")
        print("  - \033[90mUse debug.html for isolated voice testing\033[0m")
        
        print("\033[95m" + "=" * 70 + "\033[0m")
        print("\033[92mServer is ready! Logs will appear below...\033[0m")
        print("\033[95m" + "=" * 70 + "\033[0m")
        
        # Open browser automatically (commented out for debugging)
        # webbrowser.open(f'http://localhost:{port}')
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n\n\033[91mServer stopped by user\033[0m")
            print("\033[92mThank you for using Trello Voice Assistant!\033[0m")

if __name__ == "__main__":
    serve_frontend() 