"""
Emotion Detection — streams frames to CLEM via stdout (no popup window).
"""
import cv2
import numpy as np
import os
import sys
import time
import base64
import threading
import queue
import json
import tensorflow as tf
from tensorflow.keras.models import load_model
import argparse

LABELS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']


def load_emotion_model(model_path):
    try:
        model = load_model(model_path)
        return model
    except Exception as e:
        print(f"Error loading model: {e}", flush=True)
        sys.exit(1)


def get_video_capture(source):
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Error: Unable to open video source {source}.", flush=True)
        sys.exit(1)
    return cap


def detect_and_predict(frame, face_cascade, model):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    faces = sorted(faces, key=lambda x: x[2] * x[3], reverse=True)
    label = None
    probs = np.zeros(len(LABELS))
    if len(faces) > 0:
        x, y, w, h = faces[0]
        roi = gray[y:y+h, x:x+w]
        roi_resized = cv2.resize(roi, (48, 48))
        roi_normalized = roi_resized / 255.0
        roi_reshaped = np.expand_dims(roi_normalized, axis=(0, -1))
        prediction = model.predict(roi_reshaped, verbose=0)[0]
        label = LABELS[np.argmax(prediction)]
        probs = prediction
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        cv2.putText(frame, f"{label} ({probs[np.argmax(probs)]:.2f})", (x, y-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (36, 255, 12), 2)
    return frame, label, probs


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=str, default='0')
    parser.add_argument('--model', type=str, default='emotion_cnn_gpu.h5')
    args = parser.parse_args()
    source = int(args.source) if args.source.isdigit() else args.source

    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = args.model if os.path.isabs(args.model) else os.path.join(script_dir, args.model)

    print("Loading emotion model...", flush=True)
    model = load_emotion_model(model_path)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    cap = get_video_capture(source)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    # stdin command reader (QUIT)
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

    prev_time = time.time()
    frame_count = 0
    fps = 0
    probs = np.zeros(len(LABELS))
    stream_interval = 1.0 / 15
    last_stream = 0.0

    print("Camera ready. Streaming to CLEM.", flush=True)

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to grab frame.", flush=True)
                break

            # Check for quit command
            try:
                cmd = cmd_queue.get_nowait()
                if cmd == 'QUIT':
                    break
            except queue.Empty:
                pass

            frame, label, probs = detect_and_predict(frame, face_cascade, model)

            frame_count += 1
            current_time = time.time()
            if frame_count >= 10:
                fps = frame_count / (current_time - prev_time)
                prev_time = current_time
                frame_count = 0

            cv2.putText(frame, f"FPS: {fps:.1f}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

            if current_time - last_stream >= stream_interval:
                ret2, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 55])
                if ret2:
                    b64 = base64.b64encode(buf).decode('ascii')
                    sys.stdout.write(f'FRAME:{b64}\n')
                    sys.stdout.flush()
                last_stream = current_time

            status = json.dumps({
                "label": label or "none",
                "fps": round(fps, 1),
                "probs": [round(float(p), 3) for p in probs]
            })
            sys.stdout.write(f'STATUS:{status}\n')
            sys.stdout.flush()

    except Exception as e:
        import traceback
        print(f"ERROR: {e}", flush=True)
        traceback.print_exc()
    finally:
        cap.release()
        print("Emotion detection stopped.", flush=True)


if __name__ == "__main__":
    main()

