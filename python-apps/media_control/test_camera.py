"""
Camera Detection Diagnostic Tool for Media Control
"""
import cv2
import time

def test_camera(index):
    """Test a specific camera index"""
    try:
        print(f"\n{'='*60}")
        print(f"Testing Camera Index: {index}")
        print('='*60)
        
        cap = cv2.VideoCapture(index)
        
        if not cap.isOpened():
            print(f"  [FAIL] Cannot open camera {index}")
            return False
        
        print(f"  [OK] Camera {index} opened successfully")
        
        # Get camera properties
        width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
        height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        print(f"  Resolution: {int(width)}x{int(height)}")
        print(f"  FPS: {fps}")
        
        # Try to read frames
        time.sleep(1.0)
        
        success_count = 0
        for attempt in range(5):
            ret, frame = cap.read()
            if ret and frame is not None and frame.size > 0:
                success_count += 1
                print(f"  [OK] Frame {attempt+1} captured ({frame.shape})")
            else:
                print(f"  [FAIL] Frame {attempt+1} capture failed")
            time.sleep(0.1)
        
        cap.release()
        
        if success_count >= 3:
            print(f"\n  *** CAMERA {index} WORKS! ***")
            return True
        else:
            print(f"\n  [FAIL] Camera {index} unreliable ({success_count}/5 frames)")
            return False
            
    except Exception as e:
        print(f"  [ERROR] Exception: {str(e)}")
        if 'cap' in locals():
            try:
                cap.release()
            except:
                pass
        return False

print("="*60)
print("CAMERA DIAGNOSTIC FOR MEDIA CONTROL")
print("="*60)

working_cameras = []
for idx in range(4):
    if test_camera(idx):
        working_cameras.append(idx)

print("\n" + "="*60)
print("SUMMARY")
print("="*60)

if working_cameras:
    print(f"\nWorking cameras: {working_cameras}")
    print(f"\nRecommended: Use camera index {working_cameras[0]}")
else:
    print("\nNo working cameras found!")
    print("Check OBS Virtual Camera or camera permissions")
