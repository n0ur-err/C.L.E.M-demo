"""
Gesture Control wrapper for Node.js addon
"""
import cv2
from handTracking import HandDetector
import time
import ctypes
from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume


class GestureController:
    def __init__(self):
        self.cap = cv2.VideoCapture(0)
        self.detector = HandDetector(detectionCon=0.7, maxHands=2)
        
        # Audio control setup
        devices = AudioUtilities.GetSpeakers()
        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        self.volume = cast(interface, POINTER(IAudioEndpointVolume))
        self.volRange = self.volume.GetVolumeRange()
        self.minVol = self.volRange[0]
        self.maxVol = self.volRange[1]
        
        # State
        self.mode = "LOCKED"
        self.last_action_time = 0
        self.action_delay = 1.5
        self.gesture_stability = {}
        self.stability_threshold = 3
        
    def recognize_gesture(self, hand):
        """Recognize gesture from hand landmarks"""
        if not hand or 'lmList' not in hand or len(hand['lmList']) < 21:
            return "none"
        
        lmList = hand['lmList']
        
        # Finger tip and base indices
        fingers_extended = []
        
        # Thumb
        if hand['type'] == 'Right':
            fingers_extended.append(lmList[4][0] > lmList[3][0])
        else:
            fingers_extended.append(lmList[4][0] < lmList[3][0])
        
        # Other fingers
        for tip, pip in [(8,6), (12,10), (16,14), (20,18)]:
            fingers_extended.append(lmList[tip][1] < lmList[pip][1])
        
        # Gesture recognition
        extended_count = sum(fingers_extended)
        
        if extended_count == 5:
            return "open"
        elif extended_count == 0:
            return "fist"
        elif extended_count == 2 and fingers_extended[1] and fingers_extended[2]:
            return "peace"
        elif extended_count == 1 and fingers_extended[1]:
            return "index"
        elif extended_count == 2 and fingers_extended[0] and fingers_extended[4]:
            return "thumb_pinky"
        
        # Check for pinch
        thumb_tip = lmList[4]
        index_tip = lmList[8]
        distance = ((thumb_tip[0] - index_tip[0])**2 + 
                   (thumb_tip[1] - index_tip[1])**2)**0.5
        if distance < 30:
            return "pinch"
        
        return "none"
    
    def is_stable_gesture(self, hand_type, gesture):
        """Check if gesture has been stable for threshold frames"""
        key = f"{hand_type}_{gesture}"
        
        if gesture == "none":
            self.gesture_stability = {}
            return False
        
        if key not in self.gesture_stability:
            self.gesture_stability = {key: 1}
        else:
            self.gesture_stability[key] += 1
        
        return self.gesture_stability[key] >= self.stability_threshold
    
    def execute_action(self, gesture, hand_type):
        """Execute action based on gesture"""
        current_time = time.time()
        if current_time - self.last_action_time < self.action_delay:
            return
        
        # Left hand controls (mode switching and locking)
        if hand_type == "Left":
            if gesture == "peace":
                self.mode = "LOCKED"
                self.last_action_time = current_time
            elif gesture == "open":
                self.mode = "MEDIA"
                self.last_action_time = current_time
            elif gesture == "thumb_pinky":
                self.mode = "VOLUME" if self.mode == "MEDIA" else "MEDIA"
                self.last_action_time = current_time
        
        # Right hand controls (actions based on mode)
        elif hand_type == "Right" and self.mode != "LOCKED":
            if self.mode == "MEDIA":
                if gesture == "open":
                    # Play/Pause
                    ctypes.windll.user32.keybd_event(0xB3, 0, 0, 0)  # VK_MEDIA_PLAY_PAUSE
                    self.last_action_time = current_time
                elif gesture == "fist":
                    # Stop
                    ctypes.windll.user32.keybd_event(0xB2, 0, 0, 0)  # VK_MEDIA_STOP
                    self.last_action_time = current_time
                elif gesture == "peace":
                    # Next track
                    ctypes.windll.user32.keybd_event(0xB0, 0, 0, 0)  # VK_MEDIA_NEXT_TRACK
                    self.last_action_time = current_time
                elif gesture == "index":
                    # Previous track
                    ctypes.windll.user32.keybd_event(0xB1, 0, 0, 0)  # VK_MEDIA_PREV_TRACK
                    self.last_action_time = current_time
    
    def run_once(self):
        """Process one frame and return current state"""
        success, img = self.cap.read()
        if not success:
            return {
                "gesture": "none",
                "hand": "none",
                "mode": self.mode,
                "error": "Camera read failed"
            }
        
        hands, img = self.detector.findHands(img, draw=False)
        
        result = {
            "gesture": "none",
            "hand": "none",
            "mode": self.mode
        }
        
        if hands:
            for hand in hands:
                gesture = self.recognize_gesture(hand)
                hand_type = hand['type']
                
                if self.is_stable_gesture(hand_type, gesture):
                    self.execute_action(gesture, hand_type)
                    result["gesture"] = gesture
                    result["hand"] = hand_type
        
        return result
    
    def cleanup(self):
        """Release resources"""
        self.cap.release()
        cv2.destroyAllWindows()


# For testing
if __name__ == "__main__":
    controller = GestureController()
    try:
        while True:
            state = controller.run_once()
            print(f"Mode: {state['mode']}, Hand: {state['hand']}, Gesture: {state['gesture']}")
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    finally:
        controller.cleanup()
