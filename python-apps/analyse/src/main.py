#!/usr/bin/env python
"""
Main entry point for health analysis application — CLEM streaming mode.
Streams frames and health data via stdout (no popup window).
"""

import os
import sys
import time
import base64
import json
import queue
import threading
import cv2
import numpy as np

from realtime_analysis import RealtimeFacialAnalyzer


class StreamingFacialAnalyzer(RealtimeFacialAnalyzer):
    """Subclass that streams frames to Electron via stdout instead of cv2.imshow."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._cmd_queue = queue.Queue()
        self._stream_interval = 1.0 / 15  # 15 fps cap
        self._last_stream = 0.0

        # Start stdin reader for QUIT command
        def _stdin():
            while True:
                try:
                    line = sys.stdin.readline()
                    if line:
                        self._cmd_queue.put(line.strip())
                except Exception:
                    break
        threading.Thread(target=_stdin, daemon=True).start()

    def _do_capture(self):
        """Save current analysis state as a health report JSON readable by the Health Reports app."""
        if not self.primary_face:
            sys.stdout.write('CAPTURE_FAILED:No face detected — position yourself in frame first.\n')
            sys.stdout.flush()
            return

        latest_health = self.health_history[-1] if self.health_history else {}

        def _serialize(v):
            if hasattr(v, 'item'):  # numpy scalar
                return v.item()
            if isinstance(v, dict):
                return {k2: _serialize(v2) for k2, v2 in v.items()}
            if isinstance(v, (list, tuple)):
                return [_serialize(i) for i in v]
            return v

        from datetime import datetime as _dt
        ts = _dt.now().strftime("%Y-%m-%d %H:%M:%S")
        file_ts = _dt.now().strftime("%Y%m%d_%H%M%S")

        record = {
            "timestamp": ts,
            "health_score": round(float(latest_health.get('overall_composite_score', self.overall_health_score)), 1),
            "health_status": self.health_status,
            "recommendations": list(self.health_recommendations),
            "category_scores": {
                "symmetry":    float(latest_health.get('symmetry_score',   0)),
                "fatigue":     float(latest_health.get('fatigue_score',    0)),
                "stress":      float(latest_health.get('stress_score',     0)),
                "skin":        float(latest_health.get('skin_score',       0)),
                "structural":  float(latest_health.get('structural_score', 0)),
                "circulation": float(latest_health.get('circulation_score',0)),
            },
            "facial_analysis": {
                "health_analysis": _serialize(latest_health)
            },
            "raw_data": _serialize({
                k: v for k, v in (self.primary_face_features or {}).items()
                if k != 'landmarks'
            })
        }

        output_path = os.path.join(self.output_dir, f"capture_{file_ts}.json")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump([record], f, indent=2)

        sys.stdout.write(f'CAPTURED:{output_path}\n')
        sys.stdout.flush()

    def _display_loop(self):
        """Override: stream frames to stdout, no cv2 window."""
        print("Camera ready. Streaming to CLEM.", flush=True)

        while self.running:
            ret, frame = self.video_capture.read()
            if not ret:
                print("Failed to grab frame.", flush=True)
                break

            # Check for quit command
            try:
                cmd = self._cmd_queue.get_nowait()
                if cmd == 'QUIT':
                    self.running = False
                    break
                elif cmd == 'CAPTURE':
                    self._do_capture()
            except queue.Empty:
                pass

            with self.lock:
                self.current_frame = frame

            # Use processed frame if ready, otherwise stream raw frame so video starts immediately
            with self.lock:
                display_frame = self.processed_frame.copy() if self.processed_frame is not None else frame.copy()

            self.frame_count += 1

            current_time = time.time()
            if current_time - self._last_stream >= self._stream_interval:
                ret2, buf = cv2.imencode('.jpg', display_frame, [cv2.IMWRITE_JPEG_QUALITY, 55])
                if ret2:
                    b64 = base64.b64encode(buf).decode('ascii')
                    sys.stdout.write(f'FRAME:{b64}\n')
                    sys.stdout.flush()
                self._last_stream = current_time

            # Stream status
            latest_health = self.health_history[-1] if self.health_history else {}
            status = {
                "score": self.overall_health_score,
                "status": self.health_status,
                "fps": round(self.processing_fps, 1),
                "face": bool(self.primary_face),
                "symmetry": round(float(latest_health.get("facial_symmetry", 0)), 3),
                "eye_fatigue": latest_health.get("eye_fatigue", "—"),
                "skin_texture": round(float(latest_health.get("skin_texture", 0)), 1),
                "recommendations": self.health_recommendations[:2],
            }
            sys.stdout.write(f'STATUS:{json.dumps(status)}\n')
            sys.stdout.flush()


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--camera', '-c', type=int, default=0)
    parser.add_argument('--method', type=str, default='opencv',
                        choices=['opencv', 'dlib'])
    parser.add_argument('--interval', '-i', type=int, default=10)
    parser.add_argument('--cpu', action='store_true')
    parser.add_argument('--no-landmarks', action='store_true')
    args = parser.parse_args()

    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'output')
    os.makedirs(output_dir, exist_ok=True)

    print("Initializing Facial Analysis...", flush=True)

    analyzer = StreamingFacialAnalyzer(
        detection_method=args.method,
        output_dir=output_dir,
        save_format='json',
        use_gpu=not args.cpu,
        camera_id=args.camera,
        save_interval=args.interval,
        display_landmarks=not args.no_landmarks,
    )

    try:
        analyzer.start()
    except KeyboardInterrupt:
        pass
    finally:
        analyzer.stop()

    print("Facial analysis complete.", flush=True)


if __name__ == "__main__":
    main()

