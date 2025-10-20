import cv2
import numpy as np
import json
import os
from datetime import datetime
import random
from pathlib import Path
import time

class ProfileManager:
    def __init__(self):
        self.profiles = {}
        # Load all existing profiles from the dataset directory
        self.load_all_profiles()
        
    def load_all_profiles(self):
        """Load all profiles from the dataset directory"""
        dataset_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
        if os.path.exists(dataset_dir):
            for person_name in os.listdir(dataset_dir):
                person_dir = os.path.join(dataset_dir, person_name)
                if os.path.isdir(person_dir):
                    profile = self.get_profile(person_name)
                    if profile:
                        self.profiles[person_name] = profile
    
    def get_profile(self, name):
        """Get a person's profile, from cache or create if needed"""
        # If already in cache, return it
        if name in self.profiles:
            return self.profiles[name]
        
        # Otherwise get from file system or create new
        profile = get_profile(name)
        self.profiles[name] = profile
        return profile
        
    def update_profile(self, name, **kwargs):
        """Update a person's profile with new information"""
        profile = self.get_profile(name)
        for key, value in kwargs.items():
            if hasattr(profile, key):
                setattr(profile, key, value)
        
        # Save updates to file
        dataset_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
        person_dir = os.path.join(dataset_dir, name)
        if not os.path.exists(person_dir):
            os.makedirs(person_dir)
        
        profile_path = os.path.join(person_dir, "profile.json")
        try:
            with open(profile_path, 'w') as f:
                json.dump(profile.to_dict(), f, indent=4)
        except Exception as e:
            print(f"Error saving profile for {name}: {e}")
            
        return profile

class PersonProfile:
    def __init__(self, name, age=None, gender=None, occupation=None, nationality=None, 
                 status="CIVILIAN", threat_level="LOW", last_seen=None, notes=None):
        self.name = name
        self.age = age if age else random.randint(20, 65)
        self.gender = gender if gender else random.choice(["Male", "Female"])
        self.occupation = occupation if occupation else "Unknown"
        self.nationality = nationality if nationality else "Unknown"
        self.status = status
        self.threat_level = threat_level
        self.last_seen = last_seen if last_seen else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.notes = notes if notes else "No additional information available."
        self.sightings = 1
    
    def to_dict(self):
        return {
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "occupation": self.occupation,
            "nationality": self.nationality,
            "status": self.status,
            "threat_level": self.threat_level,
            "last_seen": self.last_seen,
            "notes": self.notes,
            "sightings": self.sightings
        }
    
    @classmethod
    def from_dict(cls, data):
        profile = cls(data["name"])
        profile.age = data.get("age", random.randint(20, 65))
        profile.gender = data.get("gender", random.choice(["Male", "Female"]))
        profile.occupation = data.get("occupation", "Unknown")
        profile.nationality = data.get("nationality", "Unknown")
        profile.status = data.get("status", "CIVILIAN")
        profile.threat_level = data.get("threat_level", "LOW")
        profile.last_seen = data.get("last_seen", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        profile.notes = data.get("notes", "No additional information available.")
        profile.sightings = data.get("sightings", 1)
        return profile
    
    def update_sighting(self):
        """Update the last seen timestamp and increment sighting count"""
        self.sightings += 1
        self.last_seen = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        # Save the updated profile
        dataset_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
        person_dir = os.path.join(dataset_dir, self.name)
        if os.path.exists(person_dir):
            profile_path = os.path.join(person_dir, "profile.json")
            if os.path.exists(profile_path):
                try:
                    with open(profile_path, 'w') as f:
                        json.dump(self.to_dict(), f, indent=4)
                except Exception as e:
                    print(f"Error updating profile: {e}")


def get_profile(name):
    """Get a person's profile from their individual profile.json file"""
    # If name is Unknown, return a generic unknown profile
    if name.lower() == "unknown":
        return PersonProfile("Unknown", 
                           age="?", 
                           gender="Unknown",
                           occupation="Unknown",
                           nationality="Unknown",
                           status="UNIDENTIFIED",
                           threat_level="UNKNOWN",
                           notes="Subject not in database.")
    
    # Look for the profile in the person's directory
    dataset_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
    person_dir = os.path.join(dataset_dir, name)
    
    if os.path.exists(person_dir):
        profile_path = os.path.join(person_dir, "profile.json")
        if os.path.exists(profile_path):
            try:
                with open(profile_path, 'r') as f:
                    profile_data = json.load(f)
                profile = PersonProfile.from_dict(profile_data)
                profile.update_sighting()  # Update last seen and increment sightings
                return profile
            except Exception as e:
                print(f"Error loading profile for {name}: {e}")
    
    # If no profile exists, create a new one with default/random values
    new_profile = PersonProfile(
        name=name,
        age=random.randint(20, 65),
        gender=random.choice(["Male", "Female"]),
        occupation=random.choice(["Student", "Engineer", "Teacher", "Doctor", "Artist", "Programmer"]),
        nationality=random.choice(["USA", "Canada", "UK", "Germany", "Japan", "Brazil", "India"]),
        status="NEW SUBJECT",
        threat_level=random.choice(["LOW", "MODERATE", "HIGH"]),
        notes="New subject detected. Profile autogenerated."
    )
    
    # Save the new profile
    if os.path.exists(person_dir):
        profile_path = os.path.join(person_dir, "profile.json")
        try:
            with open(profile_path, 'w') as f:
                json.dump(new_profile.to_dict(), f, indent=4)
        except Exception as e:
            print(f"Error saving new profile: {e}")
    
    return new_profile


def draw_profile_box(frame, face_location, person_profile, show_details=True, frame_count=0):
    """Draw a modern profile box next to a detected face with dynamic effects"""
    left, top, right, bottom = face_location
    frame_height, frame_width = frame.shape[:2]
    
    # Dynamic profile box dimensions - fill more of the left side
    box_width = min(int(frame_width * 0.45), frame_width - 40)  # 45% of screen width
    box_height = min(int(frame_height * 0.75), frame_height - 120)  # 75% of screen height
    
    # Position on left side - centered vertically
    box_left = 20
    box_top = (frame_height - box_height) // 2
    
    # Modern dark theme background with alpha for semi-transparency
    overlay = frame.copy()
    
    # Main background - dark with blue tint
    background_color = (40, 44, 52)
    cv2.rectangle(overlay, 
                 (box_left, box_top), 
                 (box_left + box_width, box_top + box_height), 
                 background_color, -1)
    
    # Draw border based on threat level - modernized colors
    if person_profile.threat_level == "LOW":
        border_color = (0, 230, 118)  # Green - Material design green
    elif person_profile.threat_level == "MODERATE":
        border_color = (255, 152, 0)  # Material design orange
    elif person_profile.threat_level == "HIGH":
        border_color = (244, 67, 54)  # Material design red
    else:
        border_color = (120, 144, 156)  # Material design blue grey
    
    # Create a dynamic border effect
    border_thickness = 2 + (frame_count % 10) // 5  # Border thickness changes from 2-3px
    
    # Draw pulsing border 
    pulse_intensity = 0.7 + 0.3 * abs(np.sin(frame_count * 0.05))  # Pulsing effect
    animated_color = tuple(int(c * pulse_intensity) for c in border_color)
    cv2.rectangle(overlay, 
                 (box_left, box_top), 
                 (box_left + box_width, box_top + box_height), 
                 animated_color, border_thickness)
    
    # Modern header with accent color
    header_height = 55
    accent_color = (66, 165, 245)  # Material design blue
    
    if person_profile.status == "CIVILIAN":
        header_color = accent_color
    elif person_profile.status == "UNIDENTIFIED":
        header_color = (120, 144, 156)  # Material design blue grey
    else:
        header_color = border_color
    
    # Animated gradient header (simulated)
    gradient_offset = frame_count % 20
    for i in range(header_height):
        alpha = 0.7 + 0.3 * abs(np.sin((i + gradient_offset) * 0.1))
        color = tuple(int(header_color[j] * alpha) for j in range(3))
        cv2.line(overlay, 
                (box_left, box_top + i), 
                (box_left + box_width, box_top + i), 
                color, 1)
    
    # Add system name with modern font
    cv2.putText(frame, "L1GHT REC0N", 
                (box_left, box_top - 10), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
    
    # Modern typography for name - larger, bold
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(overlay, person_profile.name, 
                (box_left + 25, box_top + 38), 
                font, 1.2, (255, 255, 255), 2)  # White text
    
    # Status with animated pill-shaped background
    status_text = f"{person_profile.status}"
    status_size = cv2.getTextSize(status_text, font, 0.7, 1)[0]
    status_bg_left = box_left + box_width - status_size[0] - 50
    status_bg_right = box_left + box_width - 20
    status_bg_top = box_top + 15
    status_bg_bottom = box_top + 45
    
    # Animated pill background (pulsing effect)
    pulse = abs(np.sin(frame_count * 0.1)) * 30
    highlight_color = tuple(min(255, c + int(pulse)) for c in border_color)
    
    # Draw the pill with a glow effect
    cv2.rectangle(overlay, 
                 (status_bg_left-3, status_bg_top-3), 
                 (status_bg_right+3, status_bg_bottom+3), 
                 highlight_color, -1, cv2.LINE_AA)
    
    cv2.rectangle(overlay, 
                 (status_bg_left, status_bg_top), 
                 (status_bg_right, status_bg_bottom), 
                 border_color, -1, cv2.LINE_AA)
    
    # Status text (centered in pill)
    text_x = status_bg_left + (status_bg_right - status_bg_left - status_size[0]) // 2
    text_y = status_bg_top + (status_bg_bottom - status_bg_top + status_size[1]) // 2
    cv2.putText(overlay, status_text, 
                (text_x, text_y + 5), 
                font, 0.7, (255, 255, 255), 1, cv2.LINE_AA)
    
    # Draw threat level with modern animated indicator
    threat_y = box_top + header_height + 45
    threat_text = f"THREAT LEVEL:"
    cv2.putText(overlay, threat_text, 
                (box_left + 25, threat_y), 
                font, 0.75, (200, 200, 200), 1)
    
    # Draw the threat level indicator - horizontal bar with animation
    bar_length = box_width - 230
    bar_height = 14
    bar_left = box_left + 200
    bar_top = threat_y - 18
    
    # Background bar (gradient)
    for i in range(bar_length):
        alpha = 0.3 + (0.2 * i / bar_length)
        color = (70, 70, 70 + int(20 * alpha))
        cv2.line(overlay, 
                (bar_left + i, bar_top), 
                (bar_left + i, bar_top + bar_height), 
                color, 1)
    
    # Threat level indicator with scanning animation effect
    if person_profile.threat_level == "LOW":
        level_width = bar_length * 0.33
    elif person_profile.threat_level == "MODERATE":
        level_width = bar_length * 0.66
    else:  # HIGH or UNKNOWN
        level_width = bar_length
        
    # Create a scanning effect that moves across the threat bar
    scan_pos = (frame_count * 5) % bar_length
    
    # Draw the filled threat level bar
    for i in range(int(level_width)):
        # Create an intensity gradient - brighter near the scan position
        distance = min(abs(i - scan_pos), bar_length) 
        intensity = max(0, 1.0 - distance / 50.0) * 0.6 + 0.4
        
        color = tuple(int(c * intensity) for c in border_color)
        cv2.line(overlay, 
                (bar_left + i, bar_top), 
                (bar_left + i, bar_top + bar_height), 
                color, 1, cv2.LINE_AA)
    
    # Start drawing basic info with modern typography and layout
    y_offset = threat_y + 45
    line_height = 32  # Increased for better readability
    
    # Info section with animated separator
    separator_width = box_width - 50
    separator_phase = (frame_count * 2) % (separator_width * 2)
    
    if separator_phase < separator_width:
        # Moving left to right
        start_x = box_left + 25
        end_x = start_x + separator_phase
    else:
        # Moving right to left
        start_x = box_left + 25 + (separator_phase - separator_width)
        end_x = box_left + 25 + separator_width
    
    cv2.line(overlay, 
            (start_x, y_offset - 15), 
            (end_x, y_offset - 15), 
            (100, 100, 100), 1)
    
    # ID with modern icon simulation (square) and subtle animation
    icon_pulse = 0.7 + 0.3 * abs(np.sin(frame_count * 0.08))
    id_text = f"#{hash(person_profile.name) % 100000:05d}"
    
    # Animated ID icon
    cv2.rectangle(overlay, 
                 (box_left + 25, y_offset - 7), 
                 (box_left + 45, y_offset + 8), 
                 tuple(int(200 * icon_pulse) for _ in range(3)), 1, cv2.LINE_AA)
    
    cv2.putText(overlay, id_text, 
                (box_left + 55, y_offset), 
                font, 0.75, (200, 200, 200), 1)
    y_offset += line_height
    
    # Age with animated icon simulation (circle)
    age_text = f"{person_profile.age}"
    cv2.circle(overlay, 
              (box_left + 35, y_offset - 5), 
              8 + (frame_count % 6) // 3, 
              tuple(int(200 * icon_pulse) for _ in range(3)), 
              1, cv2.LINE_AA)
    
    cv2.putText(overlay, f"Age: {age_text}", 
                (box_left + 55, y_offset), 
                font, 0.75, (200, 200, 200), 1)
    y_offset += line_height
    
    # Gender with animated icon
    gender_text = f"{person_profile.gender}"
    if gender_text == "Male":
        # Male symbol (circle with arrow)
        cv2.circle(overlay, 
                  (box_left + 35, y_offset - 5), 
                  8, tuple(int(200 * icon_pulse) for _ in range(3)), 1, cv2.LINE_AA)
        cv2.line(overlay,
                (box_left + 41, y_offset - 11),
                (box_left + 45, y_offset - 15),
                tuple(int(200 * icon_pulse) for _ in range(3)), 1, cv2.LINE_AA)
    else:
        # Female symbol (circle with cross below)
        cv2.circle(overlay, 
                  (box_left + 35, y_offset - 10), 
                  8, tuple(int(200 * icon_pulse) for _ in range(3)), 1, cv2.LINE_AA)
        cv2.line(overlay,
                (box_left + 35, y_offset - 2),
                (box_left + 35, y_offset + 4),
                tuple(int(200 * icon_pulse) for _ in range(3)), 1, cv2.LINE_AA)
    
    cv2.putText(overlay, gender_text, 
                (box_left + 55, y_offset), 
                font, 0.75, (200, 200, 200), 1)
    y_offset += line_height
    
    # Sightings with animated eye icon simulation
    eye_size = 7 + (frame_count % 6) // 3  # Eye size changes to simulate blinking
    cv2.ellipse(overlay, 
               (box_left + 35, y_offset - 5), 
               (eye_size, 5), 0, 0, 360, 
               tuple(int(200 * icon_pulse) for _ in range(3)), 1, cv2.LINE_AA)
    
    pupil_size = 2 + (frame_count % 20) // 10
    cv2.circle(overlay, 
              (box_left + 35, y_offset - 5), 
              pupil_size, tuple(int(200 * icon_pulse) for _ in range(3)), -1, cv2.LINE_AA)
    
    cv2.putText(overlay, f"Sightings: {person_profile.sightings}", 
                (box_left + 55, y_offset), 
                font, 0.75, (200, 200, 200), 1)
    y_offset += line_height
    
    # Draw animated separator line
    gradient_color1 = (100, 100, 100)
    gradient_color2 = (40, 44, 52)  # Fades to background
    progress = abs(np.sin(frame_count * 0.03))
    
    for i in range(box_width - 50):
        # Create animated wave effect in the separator
        offset = int(5 * np.sin(i * 0.05 + frame_count * 0.05))
        blend_factor = i / (box_width - 50)
        color = tuple(int(gradient_color1[j] * (1 - blend_factor) + gradient_color2[j] * blend_factor) for j in range(3))
        cv2.line(overlay, 
                (box_left + 25 + i, y_offset + offset), 
                (box_left + 25 + i, y_offset + offset), 
                color, 1)
    y_offset += 30
    
    # Draw additional information with better organization
    if show_details:
        # Two-column layout that uses more horizontal space
        col_width = (box_width - 60) // 2
        
        # Row 1: Occupation and Nationality
        cv2.putText(overlay, "Occupation:", 
                   (box_left + 25, y_offset), 
                   font, 0.6, (150, 150, 150), 1)
        cv2.putText(overlay, str(person_profile.occupation), 
                   (box_left + 25, y_offset + 25), 
                   font, 0.75, (200, 200, 200), 1)
        
        cv2.putText(overlay, "Nationality:", 
                   (box_left + 25 + col_width, y_offset), 
                   font, 0.6, (150, 150, 150), 1)
        cv2.putText(overlay, str(person_profile.nationality), 
                   (box_left + 25 + col_width, y_offset + 25), 
                   font, 0.75, (200, 200, 200), 1)
        
        y_offset += 60
        
        # Row 2: Last seen with animated clock icon
        clock_x, clock_y = box_left + 40, y_offset - 16
        clock_r = 10
        
        # Draw clock face
        cv2.circle(overlay, (clock_x, clock_y), clock_r, (150, 150, 150), 1, cv2.LINE_AA)
        
        # Draw animated clock hands
        hand_angle = (frame_count * 10) % 360
        hour_x = clock_x + int(clock_r * 0.5 * np.sin(np.radians(hand_angle)))
        hour_y = clock_y - int(clock_r * 0.5 * np.cos(np.radians(hand_angle)))
        cv2.line(overlay, (clock_x, clock_y), (hour_x, hour_y), (150, 150, 150), 1, cv2.LINE_AA)
        
        minute_angle = (frame_count * 20) % 360
        minute_x = clock_x + int(clock_r * 0.8 * np.sin(np.radians(minute_angle)))
        minute_y = clock_y - int(clock_r * 0.8 * np.cos(np.radians(minute_angle)))
        cv2.line(overlay, (clock_x, clock_y), (minute_x, minute_y), (150, 150, 150), 1, cv2.LINE_AA)
        
        cv2.putText(overlay, "Last Seen:", 
                   (box_left + 65, y_offset), 
                   font, 0.6, (150, 150, 150), 1)
        cv2.putText(overlay, str(person_profile.last_seen), 
                   (box_left + 65, y_offset + 25), 
                   font, 0.75, (200, 200, 200), 1)
        
        y_offset += 60
        
        # Notes section with modern card-like appearance and dynamic effects
        notes_top = y_offset
        notes_height = box_height - (notes_top - box_top) - 25
        
        # Notes card background with animated gradient
        for i in range(notes_height):
            # Create subtle wave effect
            wave = int(5 * np.sin((i + frame_count) * 0.05))
            color_intensity = 50 + int(15 * abs(np.sin(i * 0.02 + frame_count * 0.01)))
            cv2.line(overlay,
                    (box_left + 25, notes_top + i),
                    (box_left + box_width - 25, notes_top + i),
                    (color_intensity, color_intensity + 5, color_intensity + 15), 1)
        
        # Notes card border 
        cv2.rectangle(overlay,
                     (box_left + 25, notes_top),
                     (box_left + box_width - 25, notes_top + notes_height),
                     (80, 80, 90), 1, cv2.LINE_AA)
        
        # Animated notes title with accent
        title_color = tuple(int(c * (0.7 + 0.3 * abs(np.sin(frame_count * 0.1)))) for c in accent_color)
        cv2.putText(overlay, "NOTES", 
                   (box_left + 45, notes_top + 30), 
                   font, 0.8, title_color, 1)
        
        # Notes content with word wrapping and better typography
        notes = person_profile.notes if person_profile.notes else "No additional information available."
        max_chars = int((box_width - 100) / 11)  # Characters per line
        words = notes.split()
        line = ""
        y_text = notes_top + 65
        
        for word in words:
            test_line = line + word + " "
            if len(test_line) <= max_chars:
                line = test_line
            else:
                cv2.putText(overlay, line, 
                           (box_left + 45, y_text), 
                           font, 0.65, (180, 180, 180), 1, cv2.LINE_AA)
                y_text += line_height - 10  # Tighter spacing
                line = word + " "
        
        # Print the last line
        if line:
            cv2.putText(overlay, line, 
                       (box_left + 45, y_text), 
                       font, 0.65, (180, 180, 180), 1, cv2.LINE_AA)
    
    # Semi-transparent overlay with dynamic opacity
    # Fade in effect when a new face is detected
    alpha = 0.9
    cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)
    
    # Connect box to face with an animated line and dot
    face_center_x = (left + right) // 2
    face_center_y = (top + bottom) // 2
    
    # Calculate connection point on profile box
    connection_x = box_left + box_width
    connection_y = box_top + header_height // 2
    
    # Animate line with data flow effect (dots moving along the line)
    for i in range(5):
        # Create 5 flowing dots along the line path
        t = ((frame_count * 2) + i * 20) % 100 / 100.0
        dot_x = int(connection_x + (face_center_x - connection_x) * t)
        dot_y = int(connection_y + (face_center_y - connection_y) * t)
        
        # Draw flowing dots
        cv2.circle(frame, 
                  (dot_x, dot_y), 
                  2, animated_color, -1, cv2.LINE_AA)
    
    # Draw main connection line
    cv2.line(frame, 
             (face_center_x, face_center_y), 
             (connection_x, connection_y), 
             border_color, 1, cv2.LINE_AA)
    
    # Add pulsing dot at face end of connection
    pulse_size = 3 + int(2 * abs(np.sin(frame_count * 0.1)))
    cv2.circle(frame, 
              (face_center_x, face_center_y), 
              pulse_size, animated_color, -1, cv2.LINE_AA)
    
    # Add scanning effect over the detected face
    scan_height = 5 + int(5 * abs(np.sin(frame_count * 0.2)))
    scan_y = top + ((frame_count * 3) % (bottom - top - scan_height))
    cv2.rectangle(frame,
                 (left, scan_y),
                 (right, scan_y + scan_height),
                 animated_color, 1, cv2.LINE_AA)
    
    return frame

def get_monitor_size():
    """Get the size of the primary monitor"""
    try:
        # Try to get screen size using OpenCV's window handling
        screen = cv2.getWindowImageRect("temp")
        cv2.destroyWindow("temp")
        return screen[2], screen[3]
    except:
        # Fallback to a large default size
        return 1920, 1080

def detect_faces(frame, face_detector_model, confidence_threshold=0.5):
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

def load_known_faces(dataset_dir, face_detector_model, face_recognizer_model):
    """Load known faces from dataset directory"""
    known_face_encodings = []
    known_face_names = []
    
    # Check if dataset directory exists
    if not os.path.exists(dataset_dir):
        print(f"Dataset directory {dataset_dir} does not exist.")
        return known_face_encodings, known_face_names
        
    # Walk through all directories in the dataset folder
    for person_name in os.listdir(dataset_dir):
        person_dir = os.path.join(dataset_dir, person_name)
        if os.path.isdir(person_dir):
            print(f"Loading images for {person_name}...")
            # Load each image file in the person's directory
            image_files = [f for f in os.listdir(person_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
            
            for img_file in image_files:
                img_path = os.path.join(person_dir, img_file)
                try:
                    # Load image
                    image = cv2.imread(img_path)
                    if image is None:
                        continue
                        
                    # Detect faces
                    face_locations = detect_faces(image, face_detector_model, confidence_threshold=0.5)
                    
                    if face_locations:
                        # For each face detected in the image
                        for face_loc in face_locations:
                            left, top, right, bottom = face_loc
                            face_image = image[top:bottom, left:right]
                            
                            # Get face embedding
                            try:
                                # Resize to required size
                                face_blob = cv2.dnn.blobFromImage(
                                    face_image, 1.0/255, (96, 96),
                                    (0, 0, 0), swapRB=True, crop=False
                                )
                                face_recognizer_model.setInput(face_blob)
                                face_encoding = face_recognizer_model.forward()[0]
                                
                                known_face_encodings.append(face_encoding)
                                known_face_names.append(person_name)
                            except Exception as e:
                                pass
                except Exception as e:
                    pass
    
    return known_face_encodings, known_face_names

def face_distance(known_embeddings, face_embedding):
    """Compute cosine similarity between face embeddings"""
    if len(known_embeddings) == 0:
        return np.empty(0)
        
    # Normalize embeddings
    face_embedding = face_embedding / np.linalg.norm(face_embedding)
    distances = []
    
    for emb in known_embeddings:
        emb = emb / np.linalg.norm(emb)
        # Compute cosine similarity (higher values = more similar)
        similarity = np.dot(face_embedding, emb)
        # Convert to a distance (lower values = more similar)
        distance = 1.0 - similarity
        distances.append(distance)
        
    return np.array(distances)

def main():
    """Run the L1GHT REC0N interface with live camera feed"""
    print("L1GHT REC0N - Live Camera Mode")
    print("----------------------------------------------")
    print("This program demonstrates the L1GHT REC0N profile interface with a live camera feed.")
    print("Profile data is loaded from individual profile.json files in each person's dataset folder.")
    print("")
    print("Controls:")
    print("  F: Toggle fullscreen mode")
    print("  ESC or Q: Quit")
    print("")
    
    # Initialize face detection model
    print("Loading face detection model...")
    face_detector_model = None
    
    # Make sure model files exist
    prototxt_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "deploy.prototxt")
    caffemodel_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "res10_300x300_ssd_iter_140000.caffemodel")
    openface_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "openface_nn4.small2.v1.t7")
    
    if not os.path.exists(prototxt_path) or not os.path.exists(caffemodel_path) or not os.path.exists(openface_path):
        print("Model files not found. Please run main_gpu.py first to download the models.")
        return
    
    face_detector_model = cv2.dnn.readNetFromCaffe(prototxt_path, caffemodel_path)
    
    # Check for GPU support
    has_cuda = cv2.cuda.getCudaEnabledDeviceCount() > 0
    if has_cuda:
        print(f"CUDA-enabled GPU detected. Using GPU acceleration.")
        face_detector_model.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
        face_detector_model.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)
    
    # Load face recognition model
    print("Loading face recognition model...")
    face_recognizer_model = cv2.dnn.readNetFromTorch(openface_path)
    
    if has_cuda:
        face_recognizer_model.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
        face_recognizer_model.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)
    
    # Load known faces
    dataset_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
    print(f"Loading faces from dataset: {dataset_dir}")
    known_face_encodings, known_face_names = load_known_faces(dataset_dir, face_detector_model, face_recognizer_model)
    
    unique_people = set(known_face_names)
    print(f"Loaded {len(known_face_encodings)} faces for {len(unique_people)} unique people")
    if unique_people:
        print(f"People in database: {', '.join(unique_people)}")
    
    # Initialize window
    window_name = "L1GHT REC0N - Advanced Face Recognition System"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    
    # Configure for fullscreen
    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
    
    # Get monitor dimensions
    screen_w, screen_h = get_monitor_size()
    
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
        print("Error: Could not initialize any camera!")
        print("Please check that:")
        print("  1. A camera is connected to your computer")
        print("  2. No other application is using the camera")
        print("  3. Camera drivers are properly installed")
        return
    
    # Set camera properties
    video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)  # HD resolution
    video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    video_capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer to minimize latency
    
    # Variables
    fullscreen = True
    process_this_frame = True
    show_detailed_profiles = True
    fps = 0
    prev_time = time.time()
    frame_count = 0
    
    # Create a modern splash screen
    splash = np.zeros((screen_h, screen_w, 3), dtype=np.uint8)
    splash[:, :] = (40, 44, 52)  # Dark blue-gray background

    # Create animated loading sequence
    for i in range(10):
        splash_copy = splash.copy()
        
        # Draw animated loading text
        loading_dots = "." * (i % 4)
        cv2.putText(splash_copy, f"L1GHT REC0N", 
                    (screen_w//2 - 250, screen_h//2 - 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 2.0, (66, 165, 245), 3)
                    
        cv2.putText(splash_copy, f"ADVANCED RECOGNITION SYSTEM INITIALIZING{loading_dots}", 
                    (screen_w//2 - 350, screen_h//2 + 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (200, 200, 200), 2)
        
        # Draw animated loading bar
        bar_width = 600
        bar_height = 10
        bar_progress = int((i / 9) * bar_width)
        
        # Bar background
        cv2.rectangle(splash_copy, 
                    (screen_w//2 - bar_width//2, screen_h//2 + 100),
                    (screen_w//2 + bar_width//2, screen_h//2 + 100 + bar_height),
                    (70, 70, 70), -1)
        
        # Progress fill
        cv2.rectangle(splash_copy, 
                    (screen_w//2 - bar_width//2, screen_h//2 + 100),
                    (screen_w//2 - bar_width//2 + bar_progress, screen_h//2 + 100 + bar_height),
                    (66, 165, 245), -1)
                    
        # Show the splash screen frame
        cv2.imshow(window_name, splash_copy)
        cv2.waitKey(100)  # Delay between frames
    
    # Track consecutive failures
    consecutive_failures = 0
    max_failures = 10
    
    while True:
        # Capture frame from camera
        ret, frame = video_capture.read()
        if not ret or frame is None:
            consecutive_failures += 1
            print(f"Warning: Failed to grab frame from camera (attempt {consecutive_failures}/{max_failures})")
            
            if consecutive_failures >= max_failures:
                print("Error: Too many consecutive frame capture failures. Exiting...")
                break
            
            # Wait a bit before trying again
            time.sleep(0.1)
            continue
        
        # Reset failure counter on successful read
        consecutive_failures = 0
        
        # Calculate FPS
        frame_count += 1
        current_time = time.time()
        if current_time - prev_time >= 1.0:
            fps = frame_count / (current_time - prev_time)
            prev_time = current_time
            frame_count = 0
        
        # Create modern dark background
        background = np.zeros((screen_h, screen_w, 3), dtype=np.uint8)
        background[:, :] = (40, 44, 52)  # Dark blue-gray background
        
        # Draw modern tech grid lines
        grid_spacing = 50
        grid_color = (50, 55, 65)  # Slightly lighter blue-gray
        
        # Draw animated grid lines
        grid_offset = frame_count % grid_spacing
        
        # Draw vertical grid lines with data flow effect
        for x in range(grid_offset, screen_w, grid_spacing):
            # Create "data packets" flowing down some lines
            if x % (grid_spacing * 3) == 0:  # Every 3rd line
                packet_y = (frame_count * 5) % screen_h
                # Draw brighter point to represent data
                cv2.line(background, (x, packet_y-5), (x, packet_y+5), (66, 165, 245), 2)
            
            cv2.line(background, (x, 0), (x, screen_h), grid_color, 1)
        
        # Draw horizontal grid lines with similar effect
        for y in range(grid_offset, screen_h, grid_spacing):
            # Create "data packets" flowing across some lines
            if y % (grid_spacing * 3) == 0:  # Every 3rd line
                packet_x = (frame_count * 5) % screen_w
                # Draw brighter point to represent data
                cv2.line(background, (packet_x-5, y), (packet_x+5, y), (66, 165, 245), 2)
                
            cv2.line(background, (0, y), (screen_w, y), grid_color, 1)
        
        # Draw header bar with gradient effect
        header_height = 60
        for i in range(header_height):
            alpha = 0.7 + 0.3 * (i / header_height)
            color = tuple(int(c * alpha) for c in (40, 44, 52))
            cv2.line(background, (0, i), (screen_w, i), color, 1)
        
        # Draw the header text with glow effect
        # Add subtle animation to the header
        pulse = 0.8 + 0.2 * abs(np.sin(frame_count * 0.05))
        text_color = tuple(int(c * pulse) for c in (66, 165, 245))  # Animated blue
        
        cv2.putText(background, "L1GHT REC0N — ADVANCED RECOGNITION SYSTEM", 
                    (20, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, text_color, 2)
        
        # Add current date and time in top right with animated separator
        current_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        date_text = f"DATE: {current_time_str}"
        date_size = cv2.getTextSize(date_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 1)[0]
        
        # Animated separator to left of date
        sep_x = screen_w - date_size[0] - 40
        for i in range(20):
            y_offset = int(3 * np.sin((i + frame_count) * 0.3))
            cv2.circle(background, (sep_x + i, 40 + y_offset), 1, text_color, -1)
            
        cv2.putText(background, date_text, 
                   (screen_w - date_size[0] - 20, 40), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)
        
        # Draw FPS with dynamic color based on performance
        if fps >= 25:
            fps_color = (0, 230, 118)  # Good performance - green
        elif fps >= 15:
            fps_color = (255, 152, 0)  # Moderate performance - orange
        else:
            fps_color = (244, 67, 54)  # Poor performance - red
            
        cv2.putText(background, f"FPS: {fps:.1f}", 
                    (20, 90), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, fps_color, 2)
        
        # Add GPU status if available with pulsing effect
        if has_cuda:
            pulse = abs(np.sin(frame_count * 0.1))
            gpu_color = tuple(int((0.7 + 0.3 * pulse) * c) for c in (0, 230, 118))  # Pulsing green
            
            cv2.putText(background, "GPU ACCELERATED", 
                        (200, 90), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, gpu_color, 2)
        
        # Set up camera view on right side with modern border
        cam_width = min(screen_w // 2, frame.shape[1])
        cam_height = min(screen_h - header_height - 60, frame.shape[0])
        cam_x = screen_w - cam_width - 30
        cam_y = header_height + 40
        
        # Draw camera border with animation
        border_pulse = 1 + abs(np.sin(frame_count * 0.05)) * 0.5
        border_color = tuple(int(c * border_pulse) for c in (66, 165, 245))
        
        # Camera feed border
        cv2.rectangle(background, 
                     (cam_x - 5, cam_y - 5), 
                     (cam_x + cam_width + 5, cam_y + cam_height + 5), 
                     border_color, 2)
        
        # Add scanning effect to camera border (top line moving down)
        scan_y = cam_y + (frame_count * 3) % cam_height
        cv2.line(background, 
                (cam_x - 5, scan_y), 
                (cam_x + cam_width + 5, scan_y), 
                (255, 255, 255), 1)
        
        # Resize the frame if needed
        if frame.shape[1] != cam_width or frame.shape[0] != cam_height:
            display_frame = cv2.resize(frame, (cam_width, cam_height))
        else:
            display_frame = frame.copy()
        
        # Place camera feed on the background
        background[cam_y:cam_y+cam_height, cam_x:cam_x+cam_width] = display_frame
        
        # Process every other frame for face detection (for better performance)
        if process_this_frame:
            # Detect faces in the frame
            face_locations = detect_faces(frame, face_detector_model)
            
            face_names = []
            
            # Process each face
            for (left, top, right, bottom) in face_locations:
                # Extract the face region
                face_image = frame[top:bottom, left:right]
                
                # Skip if face image is empty or too small
                if face_image.size == 0 or face_image.shape[0] < 20 or face_image.shape[1] < 20:
                    face_names.append("Unknown")
                    continue
                
                # Get face embedding
                try:
                    # Resize to required size
                    face_blob = cv2.dnn.blobFromImage(
                        face_image, 1.0/255, (96, 96),
                        (0, 0, 0), swapRB=True, crop=False
                    )
                    face_recognizer_model.setInput(face_blob)
                    face_encoding = face_recognizer_model.forward()[0]
                    
                    # Calculate distances to known faces
                    if len(known_face_encodings) > 0:
                        distances = face_distance(known_face_encodings, face_encoding)
                        best_match_index = np.argmin(distances)
                        
                        # Check if it's a close match
                        if distances[best_match_index] < 0.6:  # Threshold for face match
                            name = known_face_names[best_match_index]
                        else:
                            name = "Unknown"
                    else:
                        name = "Unknown"
                except:
                    name = "Unknown"
                    
                face_names.append(name)
        
        process_this_frame = not process_this_frame
        
        # Calculate scale for displaying face boxes on the camera view
        scale_x = cam_width / frame.shape[1]
        scale_y = cam_height / frame.shape[0]
        
        # Draw rectangles around faces and display profiles
        for i, ((left, top, right, bottom), name) in enumerate(zip(face_locations, face_names)):
            # Scale coordinates to fit the display frame
            disp_left = int(left * scale_x) + cam_x
            disp_top = int(top * scale_y) + cam_y
            disp_right = int(right * scale_x) + cam_x
            disp_bottom = int(bottom * scale_y) + cam_y
            
            # Modern face detection box with animated corners
            highlight_color = (66, 165, 245)
            pulse = abs(np.sin(frame_count * 0.1))
            animated_color = tuple(int((0.7 + 0.3 * pulse) * c) for c in highlight_color)
            
            # Draw the main box - subtle
            cv2.rectangle(background, 
                         (disp_left, disp_top), 
                         (disp_right, disp_bottom), 
                         (80, 80, 100), 1)
            
            # Corner size
            corner_length = 10
            
            # Draw animated corners
            # Top-left
            cv2.line(background, (disp_left, disp_top), (disp_left + corner_length, disp_top), animated_color, 2)
            cv2.line(background, (disp_left, disp_top), (disp_left, disp_top + corner_length), animated_color, 2)
            
            # Top-right
            cv2.line(background, (disp_right, disp_top), (disp_right - corner_length, disp_top), animated_color, 2)
            cv2.line(background, (disp_right, disp_top), (disp_right, disp_top + corner_length), animated_color, 2)
            
            # Bottom-left
            cv2.line(background, (disp_left, disp_bottom), (disp_left + corner_length, disp_bottom), animated_color, 2)
            cv2.line(background, (disp_left, disp_bottom), (disp_left, disp_bottom - corner_length), animated_color, 2)
            
            # Bottom-right
            cv2.line(background, (disp_right, disp_bottom), (disp_right - corner_length, disp_bottom), animated_color, 2)
            cv2.line(background, (disp_right, disp_bottom), (disp_right, disp_bottom - corner_length), animated_color, 2)
            
            # Get profile for this person
            profile = get_profile(name)
            
            # Only show profile for the first detected face to avoid clutter
            if i == 0:
                # Draw profile information with animation effects
                face_location = (disp_left, disp_top, disp_right, disp_bottom)
                background = draw_profile_box(background, face_location, profile, show_details=True, frame_count=frame_count)
        
        # Display help text at bottom of screen with subtle pulse
        help_y = screen_h - 30
        help_color = tuple(int((0.7 + 0.3 * abs(np.sin(frame_count * 0.05))) * c) for c in (200, 200, 200))
        
        cv2.putText(background, "Press 'F' to toggle fullscreen | 'Q' to quit", 
                    (20, help_y), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, help_color, 1)
        
        # Show the final display
        cv2.imshow(window_name, background)
        
        # Handle key events
        key = cv2.waitKey(1) & 0xFF
        
        # Exit on ESC or 'q'
        if key == 27 or key == ord('q'):
            break
        # Toggle fullscreen on 'f'
        elif key == ord('f'):
            fullscreen = not fullscreen
            if fullscreen:
                cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
            else:
                cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_NORMAL)
    
    # Release resources
    video_capture.release()
    cv2.destroyAllWindows()
    print("Program terminated")

if __name__ == "__main__":
    main()