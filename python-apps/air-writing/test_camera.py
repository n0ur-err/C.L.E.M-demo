"""
Camera Detection Diagnostic Tool
Tests all available cameras to help troubleshoot OBS Virtual Camera issues
"""
import cv2
import sys
import time

def test_camera(index, backend=None):
    """Test a specific camera index and backend"""
    backend_name = "DirectShow" if backend == cv2.CAP_DSHOW else "Default"
    
    try:
        print(f"\n{'='*60}")
        print(f"Testing Camera Index: {index} | Backend: {backend_name}")
        print('='*60)
        
        if backend is not None:
            cap = cv2.VideoCapture(index, backend)
        else:
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
        time.sleep(1.0)  # Give camera time to initialize
        
        success_count = 0
        for attempt in range(5):
            ret, frame = cap.read()
            if ret and frame is not None and frame.size > 0:
                success_count += 1
                print(f"  [OK] Frame {attempt+1} captured successfully ({frame.shape})")
            else:
                print(f"  [FAIL] Frame {attempt+1} capture failed")
            time.sleep(0.1)
        
        cap.release()
        
        if success_count >= 3:
            print(f"\n  *** CAMERA {index} ({backend_name}) WORKS! ***")
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

def main():
    print("="*60)
    print("CAMERA DIAGNOSTIC TOOL FOR OBS VIRTUAL CAMERA")
    print("="*60)
    print("\nThis will test all camera indices with different backends")
    print("to find which one works with your OBS Virtual Camera.\n")
    
    working_cameras = []
    
    # Test indices 0-5 with both default and DirectShow backends
    for idx in range(6):
        # Test with default backend
        if test_camera(idx, backend=None):
            working_cameras.append((idx, "Default"))
        
        # Test with DirectShow backend
        if test_camera(idx, backend=cv2.CAP_DSHOW):
            working_cameras.append((idx, "DirectShow"))
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    if working_cameras:
        print("\nWorking cameras found:")
        for idx, backend in working_cameras:
            print(f"  - Camera {idx} with {backend} backend")
        
        print("\n*** SOLUTION ***")
        print(f"Edit your main.py to use camera index {working_cameras[0][0]}")
        print(f"with {working_cameras[0][1]} backend")
    else:
        print("\nNo working cameras found!")
        print("\nPlease check:")
        print("  1. Is OBS Virtual Camera started? (Tools > Start Virtual Camera)")
        print("  2. Are camera permissions granted in Windows Settings?")
        print("  3. Try restarting OBS Studio")
        print("  4. Check Windows Device Manager for camera drivers")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    main()
