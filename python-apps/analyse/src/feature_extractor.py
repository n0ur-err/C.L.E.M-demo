"""
Feature Extractor Module
Extracts facial features from detected faces for health analysis with GPU acceleration.
"""

import cv2
import numpy as np
import os
import time
import dlib

# Make torch optional
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("PyTorch not available. GPU acceleration for feature extraction disabled.")

class FeatureExtractor:
    """A class to extract facial features from detected faces with GPU acceleration"""
    
    def __init__(self, use_gpu=True):
        """
        Initialize the feature extractor with necessary models and GPU support
        
        Args:
            use_gpu (bool): Whether to use GPU acceleration if available
        """
        self.use_gpu = use_gpu and TORCH_AVAILABLE  # Only use GPU if torch is available
        
        # Check GPU availability for torch operations
        self.has_cuda = False
        if TORCH_AVAILABLE and self.use_gpu:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            self.has_cuda = torch.cuda.is_available()
            
            if self.use_gpu and not self.has_cuda:
                print("GPU requested but CUDA is not available. Using CPU for feature extraction.")
                self.use_gpu = False
        
        # Initialize dlib's face landmark predictor
        # Use absolute path based on the file's location
        models_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models'))
        predictor_path = os.path.join(models_dir, 'shape_predictor_68_face_landmarks.dat')
        
        if os.path.exists(predictor_path):
            self.landmark_predictor = dlib.shape_predictor(predictor_path)
            self.has_landmark_detector = True
            print(f"Loaded landmark model from: {predictor_path}")
        else:
            print(f"Dlib face landmark model not found at {predictor_path}")
            print("Please ensure it is in the models directory")
            self.has_landmark_detector = False
        
        # Define regions of interest for health analysis (using dlib's 68 point model indices)
        self.regions = {
            'eyes': [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
            'eyebrows': [17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
            'nose': [27, 28, 29, 30, 31, 32, 33, 34, 35],
            'mouth': [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67],
            'jaw': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
        }
        
        # Colors for visualization
        self.colors = {
            'eyes': (255, 0, 0),      # Blue
            'eyebrows': (0, 255, 0),  # Green
            'nose': (0, 0, 255),      # Red
            'mouth': (255, 255, 0),   # Cyan
            'jaw': (255, 0, 255),     # Magenta
        }
        
        # Performance metrics
        self.processing_time = 0
        self.fps = 0
    
    def extract_features_from_frame(self, frame, face_bbox):
        """
        Extract facial features from a video frame for real-time analysis
        
        Args:
            frame: Video frame as numpy array
            face_bbox: Face bounding box [x, y, width, height]
            
        Returns:
            dict: Extracted facial features
        """
        start_time = time.time()
        
        # Initialize features dictionary
        features = {
            'bbox': face_bbox,
            'landmarks': [],
            'metrics': {},
            'symmetry': {},
            'skin': {},
            'facial_ratios': {}
        }
        
        # If we don't have the landmark detector, just return basic features
        if not self.has_landmark_detector:
            features['skin'] = self._analyze_skin(frame, face_bbox)
            
            # Calculate processing time and FPS
            end_time = time.time()
            self.processing_time = end_time - start_time
            self.fps = 1.0 / self.processing_time if self.processing_time > 0 else 0
            
            return features
        
        # Convert to grayscale for dlib
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Extract face ROI
        x, y, w, h = face_bbox
        dlib_rect = dlib.rectangle(x, y, x + w, y + h)
        
        # Get facial landmarks
        try:
            shape = self.landmark_predictor(gray, dlib_rect)
            landmarks = []
            for i in range(68):  # dlib has 68 landmarks
                landmarks.append((shape.part(i).x, shape.part(i).y))
            
            features['landmarks'] = landmarks
            
            # Calculate facial metrics - use GPU if available
            if self.has_cuda:
                features['metrics'] = self._calculate_metrics_gpu(landmarks)
            else:
                features['metrics'] = self._calculate_metrics(landmarks)
            
            # Calculate facial symmetry
            features['symmetry'] = self._calculate_symmetry(landmarks)
            
            # Extract skin features
            features['skin'] = self._analyze_skin(frame, face_bbox)
            
            # Calculate facial ratios (golden ratio analysis)
            features['facial_ratios'] = self._calculate_facial_ratios(landmarks)

            # Extended metrics for executive health analysis
            features['eye_metrics']     = self._calculate_eye_metrics(landmarks)
            features['mouth_metrics']   = self._calculate_mouth_metrics(landmarks)
            features['eyebrow_metrics'] = self._calculate_eyebrow_metrics(landmarks)
            features['jaw_metrics']     = self._calculate_jaw_metrics(landmarks)
            features['nose_metrics']    = self._calculate_nose_metrics(landmarks)
            features['lip_color']       = self._analyze_lip_color(frame, landmarks)
            features['skin_regions']    = self._analyze_skin_regions(frame, landmarks)
            features['face_shape']      = self._classify_face_shape(landmarks)
        except Exception as e:
            print(f"Error extracting facial features: {e}")
        
        # Calculate processing time and FPS
        end_time = time.time()
        self.processing_time = end_time - start_time
        self.fps = 1.0 / self.processing_time if self.processing_time > 0 else 0
        
        return features
    
    def extract_features(self, image_path, face_bbox):
        """
        Extract facial features from an image file
        
        Args:
            image_path (str): Path to the image file
            face_bbox (list): Face bounding box [x, y, width, height]
            
        Returns:
            dict: Dictionary of extracted facial features
        """
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Failed to load image: {image_path}")
        
        # Use the frame processing function for consistency
        return self.extract_features_from_frame(image, face_bbox)
    
    def _calculate_metrics_gpu(self, landmarks):
        """Calculate facial metrics using GPU acceleration"""
        metrics = {}
        
        if len(landmarks) < 10 or not TORCH_AVAILABLE:
            # Fall back to CPU implementation if torch is not available
            return self._calculate_metrics(landmarks)
        
        # Convert landmarks to PyTorch tensors
        landmarks_tensor = torch.tensor(landmarks, dtype=torch.float32, device=self.device)
        
        # Eye measurements
        # Left eye (landmarks 36-41)
        left_eye_width = torch.norm(
            landmarks_tensor[36] - landmarks_tensor[39]
        )
        
        # Right eye (landmarks 42-47)
        right_eye_width = torch.norm(
            landmarks_tensor[42] - landmarks_tensor[45]
        )
        
        metrics['left_eye_width'] = left_eye_width.item()
        metrics['right_eye_width'] = right_eye_width.item()
        metrics['eye_width_ratio'] = (left_eye_width / right_eye_width).item() if right_eye_width > 0 else 0
        
        # Face width and height
        # Face width: distance between temples (landmarks 0 and 16)
        face_width = torch.norm(
            landmarks_tensor[16] - landmarks_tensor[0]
        )
        
        # Face height: distance from chin to forehead (landmarks 8 and 27)
        face_height = torch.norm(
            landmarks_tensor[8] - landmarks_tensor[27]
        )
        
        metrics['face_width'] = face_width.item()
        metrics['face_height'] = face_height.item()
        metrics['face_width_height_ratio'] = (face_width / face_height).item() if face_height > 0 else 0
        
        return metrics
    
    def _calculate_metrics(self, landmarks):
        """Calculate key facial metrics from landmarks (CPU version)"""
        metrics = {}
        
        # Organize landmarks by facial regions
        regions_landmarks = {}
        for region, indices in self.regions.items():
            regions_landmarks[region] = [landmarks[i] for i in indices if i < len(landmarks)]
        
        # Eye measurements
        if 'eyes' in regions_landmarks and len(regions_landmarks['eyes']) >= 6:
            # Left eye width (landmarks 36 and 39)
            left_eye_width = np.linalg.norm(
                np.array(landmarks[36]) - np.array(landmarks[39])
            )
            
            # Right eye width (landmarks 42 and 45)
            right_eye_width = np.linalg.norm(
                np.array(landmarks[42]) - np.array(landmarks[45])
            )
            
            metrics['left_eye_width'] = float(left_eye_width)
            metrics['right_eye_width'] = float(right_eye_width)
            metrics['eye_width_ratio'] = float(left_eye_width / right_eye_width if right_eye_width > 0 else 0)
        
        # Face width and height
        if len(landmarks) >= 17:
            # Face width: distance between temples (landmarks 0 and 16)
            face_width = np.linalg.norm(
                np.array(landmarks[16]) - np.array(landmarks[0])
            )
            
            # Face height: distance from chin to forehead (landmarks 8 and 27)
            face_height = np.linalg.norm(
                np.array(landmarks[8]) - np.array(landmarks[27])
            )
            
            metrics['face_width'] = float(face_width)
            metrics['face_height'] = float(face_height)
            metrics['face_width_height_ratio'] = float(face_width / face_height if face_height > 0 else 0)
        
        return metrics
    
    def _calculate_symmetry(self, landmarks):
        """Calculate facial symmetry metrics"""
        symmetry = {
            'eyes_level': 1.0,
            'overall_symmetry': 1.0
        }
        
        if len(landmarks) >= 68:  # Full set of dlib landmarks
            # Get vertical positions of the eyes
            left_eye_y = landmarks[37][1]  # Left eye upper point
            right_eye_y = landmarks[44][1]  # Right eye upper point
            
            # Calculate eye level difference (normalized by face height)
            face_height = landmarks[8][1] - landmarks[27][1]  # Chin to nose bridge
            if face_height > 0:
                eye_level_diff = abs(left_eye_y - right_eye_y) / face_height
                symmetry['eyes_level'] = 1.0 - min(1.0, eye_level_diff * 10)
            
            # Calculate overall symmetry by comparing left and right sides
            # Define the midpoint of the face (vertical line through nose)
            nose_tip = landmarks[30]  # Nose tip
            
            # Define pairs of landmarks to compare (left and right side of face)
            # Reduced number of pairs for real-time performance
            landmark_pairs = [
                (36, 45),    # Eyes outer corners
                (48, 54),    # Mouth corners
                (21, 22),    # Eyebrows
                (31, 35)     # Nose
            ]
            
            # Calculate asymmetry score
            asymmetry_score = 0
            for left_idx, right_idx in landmark_pairs:
                left_point = landmarks[left_idx]
                right_point = landmarks[right_idx]
                
                # Reflect right point across the vertical line through nose_tip
                reflected_right = (2 * nose_tip[0] - right_point[0], right_point[1])
                
                # Distance between left point and reflected right point
                distance = np.linalg.norm(np.array(left_point) - np.array(reflected_right))
                
                # Normalize by face width
                face_width = np.linalg.norm(np.array(landmarks[16]) - np.array(landmarks[0]))
                if face_width > 0:
                    asymmetry_score += distance / face_width
            
            # Average and convert to symmetry value (1.0 = perfect symmetry)
            if landmark_pairs:
                asymmetry_score /= len(landmark_pairs)
                symmetry['overall_symmetry'] = max(0.0, 1.0 - min(1.0, asymmetry_score * 3))
        
        return symmetry
    
    def _analyze_skin(self, image, face_bbox):
        """Analyze skin features in the face region - optimized for real-time"""
        x, y, w, h = face_bbox
        
        # Extract face ROI
        face_roi = image[y:y+h, x:x+w]
        
        # Skip processing for very small regions to prevent errors
        if face_roi.size == 0 or face_roi.shape[0] < 10 or face_roi.shape[1] < 10:
            return {'skin_tone': {'hue': 0, 'saturation': 0, 'value': 0}, 'texture': 0}
        
        # Convert to different color spaces for analysis
        face_hsv = cv2.cvtColor(face_roi, cv2.COLOR_BGR2HSV)
        face_gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        
        # Extract skin tone (average hue and saturation in HSV)
        h_channel, s_channel, v_channel = cv2.split(face_hsv)
        
        # For real-time performance, sample rather than process entire image
        sample_step = max(1, min(face_roi.shape[0], face_roi.shape[1]) // 30)
        h_sampled = h_channel[::sample_step, ::sample_step]
        s_sampled = s_channel[::sample_step, ::sample_step]
        v_sampled = v_channel[::sample_step, ::sample_step]
        
        avg_hue = np.mean(h_sampled)
        avg_sat = np.mean(s_sampled)
        avg_val = np.mean(v_sampled)
        
        # Detect skin texture features - downsample for speed
        face_gray_small = cv2.resize(face_gray, (0, 0), fx=0.5, fy=0.5)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(face_gray_small, (5, 5), 0)
        
        # Use Laplacian for edge detection (texture)
        laplacian = cv2.Laplacian(blurred, cv2.CV_64F)
        texture_variance = np.var(laplacian)
        
        # Basic skin conditions check
        skin_data = {
            'skin_tone': {
                'hue': float(avg_hue),
                'saturation': float(avg_sat),
                'value': float(avg_val)
            },
            'texture': float(texture_variance),
        }
        
        return skin_data
    
    def _calculate_facial_ratios(self, landmarks):
        """Calculate golden ratio and other important facial ratios - optimized for real-time"""
        ratios = {}
        
        if len(landmarks) >= 68:  # Full set of dlib landmarks
            # Calculate key facial distances
            
            # Vertical thirds (forehead, nose, lower face)
            # Note: dlib doesn't detect hairline, use eyebrow top as approximation
            eyebrow_to_nose = np.linalg.norm(np.array(landmarks[21]) - np.array(landmarks[27]))
            nose_to_mouth = np.linalg.norm(np.array(landmarks[27]) - np.array(landmarks[51]))
            mouth_to_chin = np.linalg.norm(np.array(landmarks[51]) - np.array(landmarks[8]))
            
            # The golden ratio is approximately 1.618
            golden_ratio = 1.618
            
            # Compare to golden ratio
            if nose_to_mouth > 0:
                top_ratio = eyebrow_to_nose / nose_to_mouth
                ratios['top_third_ratio'] = float(top_ratio)
                ratios['top_golden_ratio_diff'] = float(abs(top_ratio - golden_ratio))
            
            if mouth_to_chin > 0:
                middle_ratio = nose_to_mouth / mouth_to_chin
                ratios['middle_third_ratio'] = float(middle_ratio)
                ratios['middle_golden_ratio_diff'] = float(abs(middle_ratio - golden_ratio))
            
            # Eye spacing ratios
            inner_eye_distance = np.linalg.norm(np.array(landmarks[39]) - np.array(landmarks[42]))
            eye_width_left = np.linalg.norm(np.array(landmarks[36]) - np.array(landmarks[39]))
            eye_width_right = np.linalg.norm(np.array(landmarks[42]) - np.array(landmarks[45]))
            
            if (eye_width_left + eye_width_right) > 0:
                eye_spacing_ratio = inner_eye_distance / ((eye_width_left + eye_width_right) / 2)
                ratios['eye_spacing_ratio'] = float(eye_spacing_ratio)
        
        return ratios
        
    def _calculate_eye_metrics(self, landmarks):
        """Eye Aspect Ratio (EAR) and openness metrics from dlib 68 landmarks."""
        try:
            if len(landmarks) < 48:
                return {}
            def _ear(pts):
                A = np.linalg.norm(np.array(pts[1]) - np.array(pts[5]))
                B = np.linalg.norm(np.array(pts[2]) - np.array(pts[4]))
                C = np.linalg.norm(np.array(pts[0]) - np.array(pts[3]))
                return float((A + B) / (2.0 * C)) if C > 0 else 0.0
            l_pts = [landmarks[i] for i in range(36, 42)]
            r_pts = [landmarks[i] for i in range(42, 48)]
            l_ear = _ear(l_pts)
            r_ear = _ear(r_pts)
            avg   = (l_ear + r_ear) / 2
            asym  = abs(l_ear - r_ear) / avg if avg > 0 else 0
            l_h = (np.linalg.norm(np.array(landmarks[37]) - np.array(landmarks[41])) +
                   np.linalg.norm(np.array(landmarks[38]) - np.array(landmarks[40]))) / 2
            r_h = (np.linalg.norm(np.array(landmarks[43]) - np.array(landmarks[47])) +
                   np.linalg.norm(np.array(landmarks[44]) - np.array(landmarks[46]))) / 2
            return {
                'left_ear': round(l_ear, 4), 'right_ear': round(r_ear, 4),
                'avg_ear': round(avg, 4), 'ear_asymmetry': round(asym, 4),
                'left_height': round(float(l_h), 2), 'right_height': round(float(r_h), 2),
            }
        except Exception:
            return {}

    def _calculate_mouth_metrics(self, landmarks):
        """Mouth Aspect Ratio (MAR), lip heights and smile index."""
        try:
            if len(landmarks) < 68:
                return {}
            mw  = float(np.linalg.norm(np.array(landmarks[48]) - np.array(landmarks[54])))
            mh  = float((np.linalg.norm(np.array(landmarks[50]) - np.array(landmarks[58])) +
                         np.linalg.norm(np.array(landmarks[51]) - np.array(landmarks[57])) +
                         np.linalg.norm(np.array(landmarks[52]) - np.array(landmarks[56]))) / 3)
            mar = mh / mw if mw > 0 else 0
            ul  = float(np.linalg.norm(np.array(landmarks[51]) - np.array(landmarks[62])))
            ll  = float(np.linalg.norm(np.array(landmarks[57]) - np.array(landmarks[66])))
            cy  = (landmarks[48][1] + landmarks[54][1]) / 2
            si  = cy - (landmarks[48][1] + landmarks[54][1]) / 2  # left+right deviation
            # real smile: how far corners are ABOVE or BELOW mouth center
            left_up  = cy - landmarks[48][1]
            right_up = cy - landmarks[54][1]
            si = (left_up + right_up) / 2
            fh = float(np.linalg.norm(np.array(landmarks[8]) - np.array(landmarks[27])))
            si_norm = si / fh if fh > 0 else 0
            return {
                'mouth_width': round(mw, 2), 'mouth_height': round(mh, 2),
                'mar': round(float(mar), 4),
                'upper_lip_height': round(ul, 2), 'lower_lip_height': round(ll, 2),
                'smile_index': round(float(si_norm), 4),
            }
        except Exception:
            return {}

    def _calculate_eyebrow_metrics(self, landmarks):
        """Brow height, arch, inner distance, and tension indicators."""
        try:
            if len(landmarks) < 27:
                return {}
            l_eye_cy = float(np.mean([landmarks[i][1] for i in range(36, 42)]))
            r_eye_cy = float(np.mean([landmarks[i][1] for i in range(42, 48)]))
            l_brow_cy = float(np.mean([landmarks[i][1] for i in range(17, 22)]))
            r_brow_cy = float(np.mean([landmarks[i][1] for i in range(22, 27)]))
            lbh = l_eye_cy - l_brow_cy
            rbh = r_eye_cy - r_brow_cy
            ba  = abs(lbh - rbh)
            ibd = float(np.linalg.norm(np.array(landmarks[21]) - np.array(landmarks[22])))
            fh  = float(np.linalg.norm(np.array(landmarks[8]) - np.array(landmarks[27])))
            n   = fh if fh > 0 else 1
            def arch(pts):
                s, e = pts[0], pts[-1]; m = pts[2]
                mid_line_y = (s[1] + e[1]) / 2
                return float(mid_line_y - m[1])
            la = arch([landmarks[i] for i in range(17, 22)])
            ra = arch([landmarks[i] for i in range(22, 27)])
            return {
                'left_brow_height': round(lbh / n, 4), 'right_brow_height': round(rbh / n, 4),
                'avg_brow_height': round(((lbh + rbh) / 2) / n, 4),
                'brow_asymmetry': round(ba / n, 4),
                'inner_brow_distance': round(ibd / n, 4),
                'left_brow_arch': round(la / n, 4), 'right_brow_arch': round(ra / n, 4),
            }
        except Exception:
            return {}

    def _calculate_jaw_metrics(self, landmarks):
        """Jaw width ratio, chin deviation, jaw angle, chin height ratio."""
        try:
            if len(landmarks) < 17:
                return {}
            jaw_w  = float(np.linalg.norm(np.array(landmarks[4])  - np.array(landmarks[12])))
            temp_w = float(np.linalg.norm(np.array(landmarks[0])  - np.array(landmarks[16])))
            jtr    = jaw_w / temp_w if temp_w > 0 else 0
            chin_x = landmarks[8][0]; nose_x = landmarks[30][0]
            cd     = (chin_x - nose_x) / temp_w if temp_w > 0 else 0
            chin_h = float(np.linalg.norm(np.array(landmarks[57]) - np.array(landmarks[8])))
            fh     = float(np.linalg.norm(np.array(landmarks[8])  - np.array(landmarks[27])))
            chr_   = chin_h / fh if fh > 0 else 0
            v1 = np.array(landmarks[2]) - np.array(landmarks[4])
            v2 = np.array(landmarks[6]) - np.array(landmarks[4])
            cos_a = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
            jaw_angle = float(np.degrees(np.arccos(np.clip(cos_a, -1, 1))))
            return {
                'jaw_width_ratio': round(jtr, 4), 'chin_deviation': round(float(cd), 4),
                'chin_height_ratio': round(chr_, 4), 'jaw_angle': round(jaw_angle, 2),
            }
        except Exception:
            return {}

    def _calculate_nose_metrics(self, landmarks):
        """Nose length, width, proportional ratio, and tip deviation."""
        try:
            if len(landmarks) < 36:
                return {}
            nl  = float(np.linalg.norm(np.array(landmarks[27]) - np.array(landmarks[30])))
            nw  = float(np.linalg.norm(np.array(landmarks[31]) - np.array(landmarks[35])))
            nr  = nw / nl if nl > 0 else 0
            mid = (landmarks[27][0] + landmarks[8][0]) / 2
            fw  = float(np.linalg.norm(np.array(landmarks[0]) - np.array(landmarks[16])))
            dev = (landmarks[30][0] - mid) / fw if fw > 0 else 0
            return {
                'nose_length': round(nl, 2), 'nose_width': round(nw, 2),
                'nose_width_ratio': round(float(nr), 4), 'nose_deviation': round(float(dev), 4),
            }
        except Exception:
            return {}

    def _analyze_lip_color(self, frame, landmarks):
        """Extract mean BGR + HSV of the lip region for pallor/cyanosis screening."""
        try:
            if len(landmarks) < 68:
                return {}
            lip_pts = np.array([landmarks[i] for i in range(48, 60)], dtype=np.int32)
            h, w = frame.shape[:2]
            mask = np.zeros((h, w), dtype=np.uint8)
            cv2.fillPoly(mask, [lip_pts], 255)
            bgr = cv2.mean(frame, mask=mask)[:3]
            b, g, r = bgr
            px = np.uint8([[[int(b), int(g), int(r)]]])
            hsv = cv2.cvtColor(px, cv2.COLOR_BGR2HSV)[0][0]
            redness = r - (g + b) / 2
            return {
                'r': round(float(r), 1), 'g': round(float(g), 1), 'b': round(float(b), 1),
                'hue': round(float(hsv[0]), 1), 'saturation': round(float(hsv[1]), 1),
                'brightness': round(float(hsv[2]), 1), 'redness_index': round(float(redness), 1),
            }
        except Exception:
            return {}

    def _analyze_skin_regions(self, frame, landmarks):
        """Per-region skin colour and texture: forehead, cheeks, nose bridge."""
        def _stats(frame, pts_list):
            try:
                pts = np.array(pts_list, dtype=np.int32)
                x, y, rw, rh = cv2.boundingRect(pts)
                x, y = max(0, x), max(0, y)
                rw = min(rw, frame.shape[1] - x)
                rh = min(rh, frame.shape[0] - y)
                if rw < 4 or rh < 4:
                    return {}
                roi = frame[y:y+rh, x:x+rw]
                gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
                lap  = cv2.Laplacian(gray, cv2.CV_64F)
                b_m, g_m, r_m = float(np.mean(roi[:,:,0])), float(np.mean(roi[:,:,1])), float(np.mean(roi[:,:,2]))
                return {
                    'r': round(r_m,1), 'g': round(g_m,1), 'b': round(b_m,1),
                    'brightness': round((r_m+g_m+b_m)/3, 1),
                    'redness': round(r_m - (g_m+b_m)/2, 1),
                    'yellowness': round((r_m+g_m)/2 - b_m, 1),
                    'texture': round(float(np.var(lap)), 2),
                }
            except Exception:
                return {}
        try:
            if len(landmarks) < 68:
                return {}
            lm = landmarks
            brow_y   = int((lm[19][1] + lm[24][1]) / 2)
            nose_y   = int(lm[27][1])
            fh_up    = max(0, brow_y - abs(brow_y - nose_y))
            regions  = {}
            regions['forehead']    = _stats(frame, [lm[17], lm[26], (lm[26][0], fh_up), (lm[17][0], fh_up)])
            regions['left_cheek']  = _stats(frame, [lm[1], lm[3],  lm[31], lm[39]])
            regions['right_cheek'] = _stats(frame, [lm[13], lm[15], lm[35], lm[42]])
            regions['nose_bridge'] = _stats(frame, [lm[27], lm[28], lm[29], lm[30]])
            return regions
        except Exception:
            return {}

    def _classify_face_shape(self, landmarks):
        """Classify face shape: oval, round, oblong, square, heart, diamond."""
        try:
            if len(landmarks) < 17:
                return 'unknown'
            fw   = float(np.linalg.norm(np.array(landmarks[0])  - np.array(landmarks[16])))
            fh   = float(np.linalg.norm(np.array(landmarks[8])  - np.array(landmarks[27])))
            forw = float(np.linalg.norm(np.array(landmarks[17]) - np.array(landmarks[26])))
            jaww = float(np.linalg.norm(np.array(landmarks[4])  - np.array(landmarks[12])))
            if fw == 0: return 'unknown'
            ratio = fh / fw
            jtf   = jaww / forw if forw > 0 else 1
            ftwj  = fw / jaww   if jaww > 0 else 1
            if ratio > 1.5:   return 'oblong'
            if ratio > 1.25:  return 'heart' if jtf < 0.75 else 'oval'
            if ratio > 1.0:   return 'diamond' if ftwj > 1.3 else 'oval'
            return 'round' if ftwj > 1.2 else 'square'
        except Exception:
            return 'unknown'

    def get_processing_stats(self):
        """Return processing statistics for display"""
        return {
            'processing_time_ms': self.processing_time * 1000,
            'fps': self.fps,
            'gpu_enabled': self.use_gpu and self.has_cuda
        }