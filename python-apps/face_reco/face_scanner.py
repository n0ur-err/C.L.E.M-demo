import cv2
import os
import time
import numpy as np
import json
import base64
import threading
import queue
from datetime import datetime
import sys

# Use a global flag to track application state
profile_data = {}

# Check for GPU support
has_cuda = cv2.cuda.getCudaEnabledDeviceCount() > 0
if has_cuda:
    print(f"CUDA-enabled GPU detected: {cv2.cuda.getDevice()}")
else:
    print("No CUDA GPU detected. Running on CPU.")

# Load face detection model
print("Loading face detection model...")
face_detector_model = None

# Check if script path is being used properly
script_dir = os.path.dirname(os.path.abspath(__file__))
prototxt_path = os.path.join(script_dir, "deploy.prototxt")
caffemodel_path = os.path.join(script_dir, "res10_300x300_ssd_iter_140000.caffemodel")

# Make sure model files exist
if not os.path.exists(prototxt_path) or not os.path.exists(caffemodel_path):
    print(f"Model files not found at {prototxt_path} or {caffemodel_path}")
    print("Please run main.py first to download the models.")
    sys.exit(1)

face_detector_model = cv2.dnn.readNetFromCaffe(
    prototxt_path,
    caffemodel_path
)

# Enable GPU if available
if has_cuda:
    print("Setting DNN backend to CUDA")
    face_detector_model.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
    face_detector_model.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)

def detect_faces(frame, confidence_threshold=0.5):
    """Detect faces in a frame using DNN model"""
    (h, w) = frame.shape[:2]
    blob = cv2.dnn.blobFromImage(
        cv2.resize(frame, (300, 300)), 1.0,
        (300, 300), (104.0, 177.0, 123.0)
    )
    
    face_detector_model.setInput(blob)
    detections = face_detector_model.forward()
    
    face_boxes = []
    
    for i in range(0, detections.shape[2]):
        confidence = detections[0, 0, i, 2]
        
        if confidence > confidence_threshold:
            box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
            (startX, startY, endX, endY) = box.astype("int")
            
            # Ensure bounding box is within frame
            startX, startY = max(0, startX), max(0, startY)
            endX, endY = min(w - 1, endX), min(h - 1, endY)
            
            # Skip invalid boxes
            if startX >= endX or startY >= endY:
                continue
                
            # Format is (left, top, right, bottom) for OpenCV rectangle drawing
            face_boxes.append((startX, startY, endX, endY))
            
    return face_boxes

def save_profile_info(profile_info):
    """Save profile information to the person's dataset directory"""
    # Save profile file in the person's dataset directory
    person_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                             "dataset", profile_info["name"])
    os.makedirs(person_dir, exist_ok=True)
    
    personal_profile_path = os.path.join(person_dir, "profile.json")
    with open(personal_profile_path, 'w') as f:
        json.dump(profile_info, f, indent=4)
    
    print(f"Profile saved to {personal_profile_path}")

def main():
    """Main entry point - accepts JSON args from CLEM launcher."""
    print("Starting Face Scanner...")

    try:
        if len(sys.argv) < 2:
            print("ERROR: No profile data provided. Launch face-scanner from the CLEM interface.")
            sys.exit(1)

        profile_info = json.loads(sys.argv[1])
        person_name = profile_info.get("name", "").strip()
        if not person_name:
            print("ERROR: No name provided in profile data.")
            sys.exit(1)

        capture_settings = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}

        profile_info["last_seen"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        profile_info["sightings"] = 1
        save_profile_info(profile_info)

        dataset_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
        os.makedirs(dataset_dir, exist_ok=True)
        person_dir = os.path.join(dataset_dir, person_name)
        os.makedirs(person_dir, exist_ok=True)

        existing_files = [f for f in os.listdir(person_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
        start_index = len(existing_files) + 1
        print(f"Found {len(existing_files)} existing images for {person_name}")
        print(f"Saving new images to {person_dir}")

        auto_capture = capture_settings.get("auto_capture", "Yes") == "Yes"
        try:
            interval = float(capture_settings.get("interval", "3.0"))
        except ValueError:
            interval = 3.0
        try:
            target_count = int(capture_settings.get("target_count", "10"))
        except ValueError:
            target_count = 10

        # --- stdin command listener (receives CAPTURE / TOGGLE_AUTO / QUIT) ---
        cmd_queue = queue.Queue()
        def _stdin_reader():
            while True:
                try:
                    line = sys.stdin.readline()
                    if line:
                        cmd_queue.put(line.strip())
                except Exception:
                    break
        threading.Thread(target=_stdin_reader, daemon=True).start()

        # --- Open camera ---
        print("Initializing camera...")
        video_capture = None
        for backend, name in [(cv2.CAP_DSHOW, "DirectShow"), (cv2.CAP_MSMF, "MSMF"), (cv2.CAP_ANY, "Any")]:
            for idx in range(3):
                try:
                    cap = cv2.VideoCapture(idx, backend)
                    time.sleep(0.5)
                    ret, test_frame = cap.read()
                    if ret and test_frame is not None:
                        print(f"Camera {idx} opened via {name}")
                        video_capture = cap
                        break
                    cap.release()
                except Exception as e:
                    print(f"Camera {idx}/{name} failed: {e}")
            if video_capture:
                break

        if video_capture is None:
            print("ERROR: Could not open webcam.")
            return

        video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        video_capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        prev_time = time.time()
        frame_count = 0
        fps = 0
        capture_count = 0
        countdown_active = False
        countdown_start = 0
        countdown_duration = 3
        last_auto_capture_time = time.time()

        # Frame-rate limiter for streaming (15 fps)
        stream_interval = 1.0 / 15
        last_stream_time = 0.0

        print("Camera ready. Streaming to CLEM interface.")

        while True:
            ret, frame = video_capture.read()
            if not ret:
                print("Failed to grab frame")
                break

            # FPS calculation
            frame_count += 1
            current_time = time.time()
            if current_time - prev_time >= 1.0:
                fps = frame_count / (current_time - prev_time)
                prev_time = current_time
                frame_count = 0

            # Process commands from stdin
            try:
                while True:
                    cmd = cmd_queue.get_nowait()
                    if cmd == 'CAPTURE' and not countdown_active:
                        countdown_active = True
                        countdown_start = current_time
                        print("Manual capture countdown started...")
                    elif cmd == 'TOGGLE_AUTO':
                        auto_capture = not auto_capture
                        print(f"Auto-capture: {'ON' if auto_capture else 'OFF'}")
                    elif cmd == 'QUIT':
                        raise StopIteration
            except queue.Empty:
                pass
            except StopIteration:
                break

            display_frame = frame.copy()
            face_boxes = detect_faces(frame)

            for (left, top, right, bottom) in face_boxes:
                cv2.rectangle(display_frame, (left, top), (right, bottom), (0, 255, 0), 2)

            # Auto-capture trigger
            if auto_capture and len(face_boxes) > 0 and (current_time - last_auto_capture_time) >= interval:
                if not countdown_active:
                    countdown_active = True
                    countdown_start = current_time

            # Countdown handling
            if countdown_active:
                seconds_left = max(0, int(countdown_duration - (current_time - countdown_start)))
                if seconds_left > 0:
                    cv2.putText(display_frame, f"Capturing in: {seconds_left}",
                                (display_frame.shape[1]//2 - 100, display_frame.shape[0]//2),
                                cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
                else:
                    if len(face_boxes) > 0:
                        largest_face = max(face_boxes, key=lambda b: (b[2]-b[0])*(b[3]-b[1]))
                        left, top, right, bottom = largest_face
                        mx = int((right - left) * 0.2)
                        my = int((bottom - top) * 0.2)
                        face_img = frame[
                            max(0, top - my):min(frame.shape[0], bottom + my),
                            max(0, left - mx):min(frame.shape[1], right + mx)
                        ]
                        image_path = os.path.join(person_dir, f"{person_name}_{start_index + capture_count}.jpg")
                        cv2.imwrite(image_path, face_img)
                        print(f"CAPTURED:{image_path}")
                        capture_count += 1
                        last_auto_capture_time = current_time
                        if capture_count >= target_count:
                            print(f"Done! {capture_count} images saved.")
                            break
                    else:
                        print("No face detected, skipping capture")
                    countdown_active = False

            # Overlay text on frame
            cv2.putText(display_frame, f"Faces: {len(face_boxes)}",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(display_frame, f"FPS: {fps:.1f}",
                        (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(display_frame, f"Captured: {capture_count}/{target_count}",
                        (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            cv2.putText(display_frame, f"Person: {person_name}",
                        (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            auto_status = "Auto: ON" if auto_capture else "Auto: OFF"
            cv2.putText(display_frame, auto_status,
                        (10, display_frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        (0, 255, 0) if auto_capture else (0, 0, 255), 2)

            # Stream frame to Electron at limited rate
            if current_time - last_stream_time >= stream_interval:
                ret2, buf = cv2.imencode('.jpg', display_frame, [cv2.IMWRITE_JPEG_QUALITY, 55])
                if ret2:
                    b64 = base64.b64encode(buf).decode('ascii')
                    sys.stdout.write(f'FRAME:{b64}\n')
                    sys.stdout.flush()
                last_stream_time = current_time

            # Send status update (parsed by renderer)
            status = json.dumps({"faces": len(face_boxes), "fps": round(fps, 1),
                                 "captured": capture_count, "target": target_count,
                                 "auto": auto_capture})
            sys.stdout.write(f'STATUS:{status}\n')
            sys.stdout.flush()

        video_capture.release()
        print(f"Face scanning complete. {capture_count} images saved to {person_dir}")

    except Exception as e:
        print(f"ERROR: {str(e)}")


if __name__ == "__main__":
    main()

