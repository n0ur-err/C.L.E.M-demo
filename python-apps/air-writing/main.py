import cv2
import mediapipe as mp
import numpy as np
from collections import deque
import sys
import time
import os
import base64
import json
import threading

# stdout helpers for Electron integration
def send_frame(frame, quality=60):
    ret, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if ret:
        b64 = base64.b64encode(buf).decode('ascii')
        sys.stdout.write(f'FRAME:{b64}\n')
        sys.stdout.flush()

def send_status(data: dict):
    sys.stdout.write(f'STATUS:{json.dumps(data)}\n')
    sys.stdout.flush()

# Stdin watcher for QUIT signal from Electron
_quit = threading.Event()

def _stdin_watcher():
    for line in sys.stdin:
        if line.strip().upper() == 'QUIT':
            _quit.set()
            break

threading.Thread(target=_stdin_watcher, daemon=True).start()

mp_hands = mp.solutions.hands

# Function to find and initialize camera (works with OBS Virtual Camera)
def initialize_camera():
    print("Searching for available cameras...")
    
    # Try different camera indices and backends
    # Prioritize regular cameras (0, 2, 3) before OBS Virtual Camera (1)
    camera_configs = [
        (0, None),           # Camera 0 - Default camera (usually built-in or USB)
        (0, cv2.CAP_DSHOW),  # Camera 0 with DirectShow
        (2, None),           # Third camera
        (2, cv2.CAP_DSHOW),  # Third camera with DirectShow
        (3, None),           # Fourth camera
        (3, cv2.CAP_DSHOW),  # Fourth camera with DirectShow
        (1, None),           # Camera 1 - OBS Virtual Camera (fallback)
        (1, cv2.CAP_DSHOW),  # Camera 1 with DirectShow
    ]
    
    for cam_idx, backend in camera_configs:
        try:
            print(f"Trying camera index {cam_idx} with {('DirectShow' if backend else 'default')} backend...")
            
            if backend is not None:
                cap = cv2.VideoCapture(cam_idx, backend)
                backend_name = "DirectShow"
            else:
                cap = cv2.VideoCapture(cam_idx)
                backend_name = "default"
            
            if cap.isOpened():
                # Try to set resolution BEFORE reading (important for some cameras)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
                cap.set(cv2.CAP_PROP_FPS, 30)
                
                # Give camera time to initialize
                time.sleep(1.5)
                
                # Try to read a test frame multiple times with validation
                for attempt in range(5):
                    try:
                        ret, test_frame = cap.read()
                        if ret and test_frame is not None and test_frame.size > 0:
                            # Validate frame dimensions and data
                            h, w = test_frame.shape[:2]
                            if h > 0 and w > 0 and test_frame.dtype == np.uint8:
                                print(f"SUCCESS! Camera found at index {cam_idx} using {backend_name} backend")
                                print(f"Camera resolution: {w}x{h}")
                                
                                # One more read to ensure stability
                                time.sleep(0.3)
                                ret2, test_frame2 = cap.read()
                                if ret2 and test_frame2 is not None and test_frame2.size > 0:
                                    return cap
                    except Exception as frame_error:
                        print(f"Frame read attempt {attempt + 1} failed: {str(frame_error)}")
                    time.sleep(0.3)
                
                cap.release()
        except Exception as e:
            print(f"Error with camera {cam_idx}: {str(e)}")
            if 'cap' in locals():
                try:
                    cap.release()
                except:
                    pass
            continue
    
    print("\nError: No working camera found. Please check:")
    print("1. OBS Virtual Camera is started (check OBS > Tools > Virtual Camera)")
    print("2. Camera permissions are granted in Windows settings")
    print("3. Camera drivers are properly installed")
    print("4. No other application is exclusively locking the camera")
    return None

# Initialize camera
cap = initialize_camera()
if cap is None:
    sys.exit(1)

print("Camera initialized successfully!")

# Drawing state
points = []
strokes = []
colors = {'red': (0, 0, 255), 'green': (0, 255, 0), 'blue': (255, 0, 0), 'black': (0, 0, 0)}
current_color = colors['red']
smoothing_queue = deque(maxlen=5)

# Zones
TOOL_ZONES = {
    'undo': (250, 20, 350, 80),
    'clear': (360, 20, 460, 80),
}
COLOR_ZONES = {
    'red': (50, 650, 150, 720),
    'green': (160, 650, 260, 720),
    'blue': (270, 650, 370, 720),
    'black': (380, 650, 480, 720),
}

def erase_by_thumb(thumb_pos):
    tx, ty = thumb_pos
    radius = 25
    new_strokes = []
    for stroke, color in strokes:
        new_stroke = [pt for pt in stroke if np.linalg.norm(np.array(pt) - np.array((tx, ty))) > radius]
        if len(new_stroke) > 1:
            new_strokes.append((new_stroke, color))
    return new_strokes

with mp_hands.Hands(min_detection_confidence=0.85, min_tracking_confidence=0.5, max_num_hands=1) as hands:
    frame_count = 0
    error_count = 0
    last_stream = 0.0
    STREAM_INTERVAL = 0.05
    send_status({'info': 'Camera open, ready to draw'})
    while cap.isOpened() and not _quit.is_set():
        try:
            success, frame = cap.read()
            if not success or frame is None or frame.size == 0:
                frame_count += 1
                if frame_count > 10:  # If we fail to read 10 times in a row, exit
                    print("Error: Lost connection to camera")
                    break
                time.sleep(0.1)
                continue
            
            # Validate frame data
            if not isinstance(frame, np.ndarray) or frame.dtype != np.uint8:
                print("Warning: Invalid frame data type, skipping frame")
                continue
                
            frame_count = 0  # Reset counter on successful read
            error_count = 0  # Reset error counter
        except cv2.error as e:
            error_count += 1
            print(f"OpenCV error reading frame: {str(e)}")
            if error_count > 10:
                print("Too many OpenCV errors, exiting...")
                break
            time.sleep(0.1)
            continue
        except Exception as e:
            error_count += 1
            print(f"Unexpected error reading frame: {str(e)}")
            if error_count > 10:
                print("Too many errors, exiting...")
                break
            time.sleep(0.1)
            continue

        frame = cv2.flip(frame, 1)
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        results = hands.process(image)
        image.flags.writeable = True
        canvas = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        frame_h, frame_w, _ = canvas.shape

        if results.multi_hand_landmarks:
            hand = results.multi_hand_landmarks[0]
            lm = hand.landmark
            x8, y8 = int(lm[8].x * frame_w), int(lm[8].y * frame_h)   # Index tip
            x4, y4 = int(lm[4].x * frame_w), int(lm[4].y * frame_h)   # Thumb tip
            x6, y6 = int(lm[6].x * frame_w), int(lm[6].y * frame_h)   # Index base

            smoothing_queue.append((x8, y8))
            sx, sy = np.mean(smoothing_queue, axis=0).astype(int)

            # --- Toolbar buttons (top) ---
            for name, (x1, y1, x2, y2) in TOOL_ZONES.items():
                cv2.rectangle(canvas, (x1, y1), (x2, y2), (50, 50, 50), -1)
                cv2.putText(canvas, name, (x1 + 10, y1 + 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)
                if x1 <= sx <= x2 and y1 <= sy <= y2:
                    if name == 'undo' and strokes:
                        strokes.pop()
                        points.clear()
                    elif name == 'clear':
                        strokes.clear()
                        points.clear()

            # --- Color Picker (bottom) ---
            for color, (x1, y1, x2, y2) in COLOR_ZONES.items():
                cv2.rectangle(canvas, (x1, y1), (x2, y2), colors[color], -1)
                cv2.putText(canvas, color, (x1 + 5, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)
                if x1 <= sx <= x2 and y1 <= sy <= y2:
                    current_color = colors[color]

            # --- Draw ---
            if y8 < y6:
                points.append((sx, sy))
            else:
                if len(points) > 1:
                    strokes.append((points.copy(), current_color))
                points.clear()

            # --- Erase with thumb ---
            if y4 < y6 - 40:
                strokes = erase_by_thumb((x4, y4))
                cv2.circle(canvas, (x4, y4), 25, (0, 255, 255), 3)

        # Draw strokes
        for stroke, color in strokes:
            for i in range(1, len(stroke)):
                cv2.line(canvas, stroke[i-1], stroke[i], color, 5)

        for i in range(1, len(points)):
            cv2.line(canvas, points[i-1], points[i], current_color, 5)

        cv2.putText(canvas, f"Color: {list(colors.keys())[list(colors.values()).index(current_color)]}",
                    (10, 140), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        now = time.time()
        if now - last_stream >= STREAM_INTERVAL:
            last_stream = now
            send_frame(canvas)
            send_status({'strokes': len(strokes), 'drawing': len(points) > 0})

print("Closing Air Writing application...")
cap.release()
print("Application closed successfully")
