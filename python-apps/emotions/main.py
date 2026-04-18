"""
Emotion Detection with GPU-accelerated CNN and OpenCV GUI.

Features:
- OpenCV window with video feed and inline bar chart
- Real-time emotion probability bar chart (matplotlib rendered to numpy)
- Improved emotion prediction display
- Modular code and error handling

Developed by: L1ght (c) 2025
"""
import cv2
import numpy as np
import os
import tensorflow as tf
from tensorflow.keras.models import load_model
import argparse
import time
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io

LABELS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']


def load_emotion_model(model_path):
    try:
        model = load_model(model_path)
        return model
    except Exception as e:
        print(f"Error loading model: {e}")
        sys.exit(1)


def get_video_capture(source):
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Error: Unable to open video source {source}.")
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


def render_bar_chart(probs, height):
    """Render the emotion probability bar chart as a BGR numpy array."""
    fig, ax = plt.subplots(figsize=(4, 3), dpi=80)
    colors = ['#e74c3c' if p == max(probs) else '#3498db' for p in probs]
    ax.bar(LABELS, probs, color=colors)
    ax.set_ylim(0, 1)
    ax.set_ylabel('Probability')
    ax.set_title('Emotion Probabilities')
    ax.tick_params(axis='x', labelrotation=30, labelsize=8)
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    arr = np.frombuffer(buf.getvalue(), dtype=np.uint8)
    chart_img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if chart_img is None:
        # Fallback: blank chart if decode failed
        chart_img = np.zeros((height, 320, 3), dtype=np.uint8)
        return chart_img
    # Resize chart to match frame height
    chart_img = cv2.resize(chart_img, (int(chart_img.shape[1] * height / chart_img.shape[0]), height))
    return chart_img


def main():
    parser = argparse.ArgumentParser(description="Emotion Detection with OpenCV GUI.")
    parser.add_argument('--source', type=str, default='0', help='Video source (default: 0 for webcam, or path to video file)')
    parser.add_argument('--model', type=str, default='emotion_cnn_gpu.h5', help='Path to emotion model file')
    args = parser.parse_args()
    source = int(args.source) if args.source.isdigit() else args.source

    # Resolve model path relative to this script's directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = args.model if os.path.isabs(args.model) else os.path.join(script_dir, args.model)
    model = load_emotion_model(model_path)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    cap = get_video_capture(source)

    cv2.namedWindow('Emotion Detection', cv2.WINDOW_NORMAL)

    prev_time = time.time()
    frame_count = 0
    fps = 0
    probs = np.zeros(len(LABELS))

    print("Press 'q' or ESC to quit.")
    sys.stdout.flush()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to grab frame.", flush=True)
                break

            frame, label, probs = detect_and_predict(frame, face_cascade, model)

            # FPS calculation
            frame_count += 1
            if frame_count >= 10:
                curr_time = time.time()
                fps = frame_count / (curr_time - prev_time)
                prev_time = curr_time
                frame_count = 0

            cv2.putText(frame, f"FPS: {fps:.2f}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            cv2.putText(frame, "Press Q to quit", (10, frame.shape[0] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

            # Render bar chart and combine side-by-side
            chart = render_bar_chart(probs, frame.shape[0])
            combined = np.hstack((frame, chart))

            cv2.imshow('Emotion Detection', combined)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:
                break
    except Exception as e:
        import traceback
        print(f"ERROR in main loop: {e}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        sys.stderr.flush()
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
