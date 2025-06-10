#!/usr/bin/env python3
"""
Railway deployment startup script for Trello Voice Assistant
Automatically detects which service to run based on environment
"""

import os
import sys
from pathlib import Path
from multiprocessing import Process

# Ensure the project root is on the Python path
sys.path.insert(0, str(Path(__file__).parent))

def run_voice_agent():
    """Target function for the agent process. Imports are local to the process."""
    print("Initializing Voice Agent process...")
    from main import entrypoint as voice_entrypoint
    from livekit.agents import cli, WorkerOptions
    
    # This is a blocking call that runs the agent's event loop
    cli.run_app(WorkerOptions(entrypoint_fnc=voice_entrypoint))

def run_frontend_server(port: int):
    """Target function for the frontend process. Imports are local to the process."""
    print(f"Initializing Frontend Server process on port {port}...")
    from frontend.server import serve_frontend
    
    # This is a blocking call that runs the server's event loop
    serve_frontend(port=port)

def main():
    """
    Parses environment variables and starts the required services in separate processes.
    """
    # Get Railway service type from environment, defaulting to 'unified'
    service_type = os.environ.get('RAILWAY_SERVICE_TYPE', 'unified')
    port = int(os.environ.get('PORT', 8080))
    
    print("="*50)
    print("🚀 Starting Trello Voice Assistant")
    print(f"📋 Service Mode: {service_type.upper()}")
    print(f"🌐 Port: {port}")
    print(f"🔧 Environment: {os.environ.get('RAILWAY_ENVIRONMENT', 'Local')}")
    print("="*50)
    
    if service_type == 'unified':
        print("🚀 Starting in Unified Mode: Frontend and Voice Agent")
        
        # We use multiprocessing to run both servers in parallel
        # since they both have blocking event loops.
        frontend_process = Process(target=run_frontend_server, args=(port,))
        agent_process = Process(target=run_voice_agent)

        # Start both processes
        frontend_process.start()
        agent_process.start()

        # Wait for both processes to complete (they won't, in normal operation)
        frontend_process.join()
        agent_process.join()

    elif service_type == 'frontend':
        # Start only the frontend server
        run_frontend_server(port)
        
    elif service_type == 'voice_agent':
        # Start only the voice agent
        run_voice_agent()
        
    else:
        print(f"⚠️ Unknown service type '{service_type}'. Defaulting to Unified Mode.")
        # Default to unified mode
        frontend_process = Process(target=run_frontend_server, args=(port,))
        agent_process = Process(target=run_voice_agent)
        frontend_process.start()
        agent_process.start()
        frontend_process.join()
        agent_process.join()

if __name__ == "__main__":
    # This check is crucial for multiprocessing to work correctly,
    # especially on platforms like Windows.
    main() 