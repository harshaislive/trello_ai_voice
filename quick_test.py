#!/usr/bin/env python3
"""
Quick System Test for Voice MCP Agent
"""

import sys
import os
import subprocess
from datetime import datetime

def log(message, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    colors = {
        "INFO": "\033[94m",
        "SUCCESS": "\033[92m",
        "ERROR": "\033[91m",
        "RESET": "\033[0m"
    }
    
    color = colors.get(level, colors["INFO"])
    print(f"{color}[{timestamp}] {level}: {message}{colors['RESET']}")

def main():
    log("=== Voice MCP Agent Quick Test ===", "INFO")
    
    # Check Python
    log(f"Python: {sys.version.split()[0]}", "SUCCESS")
    
    # Check virtual environment
    in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
    log(f"Virtual Env: {'Active' if in_venv else 'Not Active'}", "SUCCESS" if in_venv else "ERROR")
    
    # Check files
    files = ['frontend/server.py', 'frontend/index.html', 'frontend/script.js']
    for file in files:
        exists = os.path.exists(file)
        log(f"File {file}: {'Found' if exists else 'Missing'}", "SUCCESS" if exists else "ERROR")
    
    log("=== Starting Frontend Server ===", "INFO")
    log("Press Ctrl+C to stop", "INFO")
    
    try:
        # Start server and stream output
        process = subprocess.Popen(
            [sys.executable, 'server.py'],
            cwd='frontend'
        )
        
        process.wait()
        
    except KeyboardInterrupt:
        log("Server stopped by user", "SUCCESS")
        if process:
            process.terminate()

if __name__ == "__main__":
    main() 