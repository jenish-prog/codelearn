import subprocess
import time
import os
import signal
import sys

def start_services():
    # Get absolute paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    js_service_dir = os.path.join(base_dir, 'backend', 'js_service')
    python_main = os.path.join(base_dir, 'backend', 'main.py')
    venv_python = os.path.join(base_dir, 'backend', 'venv', 'bin', 'python')

    print(f"Starting services from {base_dir}...")

    # Start Node.js Service
    print("Starting Node.js Service (Port 3001)...")
    js_process = subprocess.Popen(
        ['npm', 'start'], 
        cwd=js_service_dir,
        stdout=sys.stdout,
        stderr=sys.stderr
    )

    # Start Python Backend
    print("Starting Python Backend (Port 8000)...")
    python_process = subprocess.Popen(
        [venv_python, python_main],
        cwd=base_dir,
        stdout=sys.stdout,
        stderr=sys.stderr
    )

    def signal_handler(sig, frame):
        print("\nShutting down services...")
        js_process.terminate()
        python_process.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    try:
        # Keep running until interrupted
        python_process.wait()
        js_process.wait()
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    start_services()
