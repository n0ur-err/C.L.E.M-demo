import cv2
import os
import time
import numpy as np
import json
from datetime import datetime
import random
import sys
import tkinter as tk
from tkinter import simpledialog, messagebox

# Use a global flag to track application state
dialog_shown = False
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

# Function to create a simple dialog
def create_simple_dialog(title, fields, defaults=None):
    """Creates a simple dialog with the given fields and returns the input values"""
    if defaults is None:
        defaults = {}
    
    result = {}
    
    # Create a top-level window
    dialog = tk.Tk()
    dialog.title(title)
    dialog.geometry("400x500")
    
    # Center the window
    dialog.eval('tk::PlaceWindow . center')
    
    # Create label and entry for each field
    entries = {}
    
    # Add a title
    tk.Label(dialog, text=title, font=("Arial", 12, "bold")).pack(pady=10)
    
    # Add form fields
    for i, (field, type_hint) in enumerate(fields.items()):
        frame = tk.Frame(dialog)
        frame.pack(fill=tk.X, padx=20, pady=5)
        
        tk.Label(frame, text=f"{field.capitalize()}:", width=15, anchor="w").pack(side=tk.LEFT)
        
        if type_hint == "text":
            # For multi-line text input
            entries[field] = tk.Text(frame, height=4, width=30)
            if field in defaults:
                entries[field].insert(tk.END, defaults[field])
            entries[field].pack(side=tk.RIGHT, expand=True, fill=tk.X)
        elif type_hint == "combo":
            # For dropdown selections
            var = tk.StringVar(value=defaults.get(field, ""))
            options = []
            
            if field == "gender":
                options = ["Male", "Female", "Other"]
            elif field == "status":
                options = ["CIVILIAN", "PERSON OF INTEREST", "UNDER SURVEILLANCE", "WANTED"]
            elif field == "threat_level":
                options = ["LOW", "MODERATE", "HIGH"]
            elif field == "auto_capture":
                options = ["Yes", "No"]
            
            # Create dropdown - fixed to provide a list of options instead of individual arguments
            combo = tk.OptionMenu(frame, var, *options)
            combo.pack(side=tk.RIGHT, expand=True, fill=tk.X)
            entries[field] = var
        else:
            # For standard text input
            var = tk.StringVar(value=defaults.get(field, ""))
            entry = tk.Entry(frame, textvariable=var)
            entry.pack(side=tk.RIGHT, expand=True, fill=tk.X)
            entries[field] = var
    
    # Function to handle submit
    def on_submit():
        # Collect all values
        for field, entry in entries.items():
            if isinstance(entry, tk.Text):
                result[field] = entry.get("1.0", tk.END).strip()
            elif isinstance(entry, tk.StringVar):
                result[field] = entry.get()
        
        dialog.destroy()
    
    # Add submit button
    submit_btn = tk.Button(dialog, text="Submit", command=on_submit, 
                          bg="#4CAF50", fg="white", padx=10, pady=5)
    submit_btn.pack(pady=20)
    
    # Start the dialog loop
    dialog.mainloop()
    
    return result

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
    """Main entry point with GUI support for use in CLEM"""
    print("Starting Face Scanner...")
    
    try:
        # Get person's name
        person_name = simpledialog.askstring("Face Scanner - New Profile", "Enter the person's name:")
        if not person_name:
            print("No name provided. Exiting.")
            messagebox.showinfo("Face Scanner", "Operation cancelled. No name provided.")
            return
        
        # Collect profile information
        fields = {
            "age": "entry",
            "gender": "combo",
            "occupation": "entry",
            "nationality": "entry",
            "status": "combo",
            "threat_level": "combo",
            "notes": "text"
        }
        defaults = {
            "age": str(random.randint(18, 65)),
            "gender": random.choice(["Male", "Female"]),
            "occupation": random.choice(["Student", "Engineer", "Teacher", "Doctor", "Artist", "Programmer"]),
            "nationality": random.choice(["USA", "Canada", "UK", "Germany", "Japan", "China", "India", "Australia"]),
            "status": "CIVILIAN",
            "threat_level": "LOW",
            "notes": "Profile created during face scanning session."
        }
        profile_info = create_simple_dialog(f"Create Profile for {person_name}", fields, defaults)
        profile_info["name"] = person_name
        profile_info["last_seen"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        profile_info["sightings"] = 1
        
        # Save profile information
        save_profile_info(profile_info)
        
        # Create dataset directory if it doesn't exist
        dataset_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
        os.makedirs(dataset_dir, exist_ok=True)
        
        # Create person's directory if it doesn't exist
        person_dir = os.path.join(dataset_dir, person_name)
        os.makedirs(person_dir, exist_ok=True)
        
        # Count existing files to continue numbering
        existing_files = [f for f in os.listdir(person_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
        start_index = len(existing_files) + 1
        
        print(f"\nFound {len(existing_files)} existing images for {person_name}")
        print(f"Saving new images to {person_dir}")
        
        # Get capture settings
        capture_settings = create_simple_dialog("Capture Settings", {
            "auto_capture": "combo",
            "interval": "entry",
            "target_count": "entry"
        }, {
            "auto_capture": "Yes",
            "interval": "3.0",
            "target_count": "10"
        })
        
        # Process settings
        auto_capture = capture_settings.get("auto_capture", "Yes") == "Yes"
        try:
            interval = float(capture_settings.get("interval", "3.0"))
        except ValueError:
            interval = 3.0
            
        try:
            target_count = int(capture_settings.get("target_count", "10"))
        except ValueError:
            target_count = 10
        
        if auto_capture:
            print(f"Auto-capture enabled: Will capture an image every {interval} seconds when a face is detected")
        else:
            print("Press 'c' to capture an image")
        
        print("\nCONTROLS:")
        print("  - Press 'c' to manually capture an image")
        print("  - Press 'a' to toggle auto-capture mode")
        print("  - Press 'q' to quit")
        
        # Initialize webcam with better error handling
        print("Initializing camera...")
        
        # Try different camera backends and indices
        video_capture = None
        camera_backends = [
            (cv2.CAP_DSHOW, "DirectShow"),  # Windows preferred
            (cv2.CAP_MSMF, "Windows Media Foundation"),
            (cv2.CAP_ANY, "Any available")
        ]
        
        for backend, backend_name in camera_backends:
            for camera_index in range(3):  # Try first 3 camera indices
                try:
                    print(f"Trying camera {camera_index} with {backend_name} backend...")
                    cap = cv2.VideoCapture(camera_index, backend)
                    
                    # Wait a moment for camera to initialize
                    time.sleep(0.5)
                    
                    # Try to read a frame to verify camera works
                    ret, test_frame = cap.read()
                    if ret and test_frame is not None:
                        print(f"Successfully initialized camera {camera_index} with {backend_name}")
                        video_capture = cap
                        break
                    else:
                        cap.release()
                except Exception as e:
                    print(f"Failed with camera {camera_index} and {backend_name}: {e}")
                    continue
            
            if video_capture is not None:
                break
        
        if video_capture is None:
            error_msg = "Could not open webcam. Please check:\n1. Camera is connected\n2. No other app is using the camera\n3. Camera permissions are granted"
            print(error_msg)
            messagebox.showerror("Camera Error", error_msg)
            return
            
        video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        video_capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        # Variables for FPS calculation
        prev_time = time.time()
        frame_count = 0
        fps = 0
        
        # Counter for captured images
        capture_count = 0
        
        # Countdown variables
        countdown_active = False
        countdown_start = 0
        countdown_duration = 3  # seconds
        
        # Auto-capture variables
        last_auto_capture_time = time.time()
        
        # Set window properties for better UI
        cv2.namedWindow('Face Scanner', cv2.WINDOW_NORMAL)
        cv2.setWindowProperty('Face Scanner', cv2.WND_PROP_TOPMOST, 1)
        
        while True:
            # Capture frame-by-frame
            ret, frame = video_capture.read()
            
            if not ret:
                print("Failed to grab frame")
                break
            
            # Calculate FPS
            frame_count += 1
            current_time = time.time()
            if current_time - prev_time >= 1.0:
                fps = frame_count / (current_time - prev_time)
                prev_time = current_time
                frame_count = 0
            
            # Create a copy of the frame for display
            display_frame = frame.copy()
            
            # Detect faces in the frame
            face_boxes = detect_faces(frame)
            
            # Draw rectangles around detected faces
            for (left, top, right, bottom) in face_boxes:
                cv2.rectangle(display_frame, (left, top), (right, bottom), (0, 255, 0), 2)
            
            # Check for auto-capture
            if auto_capture and len(face_boxes) > 0 and (current_time - last_auto_capture_time) >= interval:
                if not countdown_active:  # Only start auto-capture if not already counting down
                    countdown_active = True
                    countdown_start = current_time
                    print("Starting auto-capture countdown...")
            
            # Handle countdown
            if countdown_active:
                seconds_left = max(0, int(countdown_duration - (current_time - countdown_start)))
                if seconds_left > 0:
                    # Show countdown
                    cv2.putText(display_frame, f"Capturing in: {seconds_left}", 
                                (display_frame.shape[1]//2 - 100, display_frame.shape[0]//2), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
                else:
                    # Save the frame if at least one face is detected
                    if len(face_boxes) > 0:
                        # Get the largest face (assuming it's the main subject)
                        largest_face = max(face_boxes, key=lambda box: (box[2]-box[0])*(box[3]-box[1]))
                        left, top, right, bottom = largest_face
                        
                        # Extract face with some margin (20%)
                        margin_x = int((right - left) * 0.2)
                        margin_y = int((bottom - top) * 0.2)
                        face_img = frame[
                            max(0, top - margin_y):min(frame.shape[0], bottom + margin_y),
                            max(0, left - margin_x):min(frame.shape[1], right + margin_x)
                        ]
                        
                        # Save the face image
                        image_path = os.path.join(person_dir, f"{person_name}_{start_index + capture_count}.jpg")
                        cv2.imwrite(image_path, face_img)
                        print(f"Saved {image_path}")
                        capture_count += 1
                        
                        # Update last auto-capture time
                        last_auto_capture_time = current_time
                        
                        # Flash effect for feedback
                        flash_frame = np.ones_like(display_frame) * 255
                        cv2.imshow('Face Scanner', flash_frame)
                        cv2.waitKey(50)  # Flash for 50ms
                        
                        if capture_count >= target_count:
                            print(f"Captured {capture_count} images. Finished!")
                            break
                    else:
                        print("No face detected, skipping capture")
                    
                    countdown_active = False
            
            # Show the number of faces detected
            cv2.putText(display_frame, f"Detected: {len(face_boxes)} face(s)", 
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            # Show FPS
            cv2.putText(display_frame, f"FPS: {fps:.1f}", 
                        (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            # Show capture count
            cv2.putText(display_frame, f"Captured: {capture_count}/{target_count}", 
                        (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            # Show person name and profile info
            cv2.putText(display_frame, f"Person: {person_name}", 
                        (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            
            # Add key instructions at the bottom of the screen
            cv2.putText(display_frame, "Press 'c' to capture", 
                        (10, display_frame.shape[0] - 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Show auto-capture status
            auto_status = "ON" if auto_capture else "OFF"
            cv2.putText(display_frame, f"Auto-capture: {auto_status}", 
                        (10, display_frame.shape[0] - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, 
                        (0, 255, 0) if auto_capture else (0, 0, 255), 2)
            
            # Display frame
            cv2.imshow('Face Scanner', display_frame)
            
            # Handle keypresses
            key = cv2.waitKey(1) & 0xFF
            
            # Press 'q' to quit
            if key == ord('q'):
                break
            
            # Press 'c' to start countdown for capture
            if key == ord('c') and not countdown_active:
                countdown_active = True
                countdown_start = current_time
                print("Countdown started...")
            
            # Press 'a' to toggle auto-capture mode
            if key == ord('a'):
                auto_capture = not auto_capture
                if auto_capture:
                    print("Auto-capture mode enabled")
                else:
                    print("Auto-capture mode disabled")
        
        # Release resources
        video_capture.release()
        cv2.destroyAllWindows()
        
        completion_message = f"\nFace scanning complete. {capture_count} images saved to {person_dir}"
        print(completion_message)
        print("The profile has been created and saved.")
        print("\nYou can now use Face Recognition to identify this person in the future.")
        
        messagebox.showinfo("Face Scanner", completion_message)
            
    except Exception as e:
        error_message = f"An error occurred: {str(e)}"
        print(error_message)
        messagebox.showerror("Error", error_message)

if __name__ == "__main__":
    main()
