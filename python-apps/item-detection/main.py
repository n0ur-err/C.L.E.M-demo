import cv2
import torch
import time
import numpy as np
import sys
import json
import base64
import threading
import argparse
from pathlib import Path

# -- stdout helpers ------------------------------------------------------------
def send_frame(frame, quality=55):
    ret, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if ret:
        b64 = base64.b64encode(buf).decode('ascii')
        sys.stdout.write(f'FRAME:{b64}\n')
        sys.stdout.flush()

def send_status(data: dict):
    sys.stdout.write(f'STATUS:{json.dumps(data)}\n')
    sys.stdout.flush()

# -- stdin quit listener -------------------------------------------------------
_quit = threading.Event()

def _stdin_watcher():
    for line in sys.stdin:
        if line.strip().upper() == 'QUIT':
            _quit.set()
            break

threading.Thread(target=_stdin_watcher, daemon=True).start()

# -- model loading -------------------------------------------------------------
def load_model(weights='yolov5s.pt', device=''):
    if not device:
        device = 'cuda:0' if torch.cuda.is_available() else 'cpu'

    # Resolve weights path relative to this script's directory
    weights_path = Path(weights)
    if not weights_path.is_absolute():
        weights_path = Path(__file__).parent / weights

    # Use ultralytics YOLO API — loads directly from local file, no network needed
    from ultralytics import YOLO
    model = YOLO(str(weights_path))

    return model, device

# -- detection loop ------------------------------------------------------------
def run_detection(model, device, source=0, conf_thres=0.25, iou_thres=0.45):
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        send_status({'error': f'Cannot open camera/source {source}'})
        return

    names = model.names
    np.random.seed(42)
    colors = {i: [int(c) for c in np.random.randint(50, 255, 3)] for i in range(len(names))}

    prev_time = time.time()
    frame_count = 0
    fps = 0.0
    last_stream = 0.0
    STREAM_INTERVAL = 0.08

    send_status({'info': 'Camera open, running detection...'})

    while not _quit.is_set():
        ret, frame = cap.read()
        if not ret:
            send_status({'error': 'Frame grab failed'})
            break

        frame_count += 1
        now = time.time()
        elapsed = now - prev_time
        if elapsed >= 1.0:
            fps = frame_count / elapsed
            prev_time = now
            frame_count = 0

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = model(rgb, conf=conf_thres, iou=iou_thres, verbose=False, device=device)

        detected_objects = []
        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                label = f'{names[cls_id]} {conf:.2f}'
                color = colors.get(cls_id, [0, 255, 0])

                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
                cv2.rectangle(frame, (int(x1), int(y1) - th - 8), (int(x1) + tw + 4, int(y1)), color, -1)
                cv2.putText(frame, label, (int(x1) + 2, int(y1) - 4),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1, cv2.LINE_AA)

                detected_objects.append({'label': names[cls_id], 'conf': round(conf, 2)})

        cv2.rectangle(frame, (5, 5), (240, 60), (0, 0, 0), -1)
        cv2.putText(frame, f'FPS: {fps:.1f}', (12, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, f'Objects: {len(detected_objects)}', (12, 52),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 200), 1)

        if now - last_stream >= STREAM_INTERVAL:
            send_frame(frame)
            send_status({
                'fps': round(fps, 1),
                'objects': len(detected_objects),
                'detections': detected_objects[:10],
                'device': device,
            })
            last_stream = now

    cap.release()
    send_status({'info': 'Stopped'})

# -- entry point ---------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--weights', default='yolov5s.pt')
    parser.add_argument('--source',  default='0')
    parser.add_argument('--conf-thres', type=float, default=0.25)
    parser.add_argument('--iou-thres',  type=float, default=0.45)
    parser.add_argument('--device',     default='')
    args = parser.parse_args()

    try:
        send_status({'info': f'Loading model {args.weights}...'})
        model, device = load_model(args.weights, args.device)
        send_status({'info': f'Model loaded on {device}'})
    except Exception as e:
        send_status({'error': f'Model load failed: {e}'})
        sys.exit(1)

    source = int(args.source) if args.source.isdigit() else args.source
    run_detection(model, device, source=source,
                  conf_thres=args.conf_thres, iou_thres=args.iou_thres)

if __name__ == '__main__':
    main()
