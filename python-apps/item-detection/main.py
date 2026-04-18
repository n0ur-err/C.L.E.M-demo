import argparse
import cv2
import torch
import time
import numpy as np
import os
import sys
from pathlib import Path


def load_model(weights='yolov5s.pt', device=''):
    """Load YOLOv5 model directly with torch.hub"""
    # Determine device
    if not device:
        device = 'cuda:0' if torch.cuda.is_available() else 'cpu'

    # PyTorch >= 2.6 changed weights_only default to True, which breaks YOLOv5 .pt loading.
    # Patch torch.load to use weights_only=False for trusted local model files.
    _orig_torch_load = torch.load
    def _patched_torch_load(*args, **kwargs):
        kwargs.setdefault('weights_only', False)
        return _orig_torch_load(*args, **kwargs)
    torch.load = _patched_torch_load

    try:
        # Load the model using torch.hub with direct weight path
        model = torch.hub.load('ultralytics/yolov5', 'custom', path=weights)
    finally:
        torch.load = _orig_torch_load

    model.to(device)
    
    return model, device


def run_detection(model, device, source=0, conf_thres=0.25, iou_thres=0.45, img_size=640):
    """Run detection on the specified source (webcam, video file or image)"""
    source_type = "unknown"
    
    # Check if source is a webcam/camera index
    if isinstance(source, int):
        print(f"Opening camera at index {source}...")
        source_type = "webcam"
        
        # Initialize webcam
        video_capture = cv2.VideoCapture(0)
        
        # Configure camera properties
        video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
        # Check if camera was opened successfully
        if not video_capture.isOpened():
            print("Error: Could not open camera.")
            print("System information:")
            print(f"- OpenCV version: {cv2.__version__}")
            print(f"- Operating System: {os.name}")
            
            # Try to get a sample image instead
            sample_img_path = get_sample_image_menu()
            if sample_img_path:
                print(f"Using sample image: {sample_img_path}")
                source = sample_img_path
                source_type = "image"
                img = cv2.imread(source)
                if img is None:
                    print(f"Error: Could not open image file {source}")
                    return
            else:
                return
        else:
            cap = video_capture  # Rename for consistency with rest of code
    
    # Check if source is a video file or image
    elif isinstance(source, str) and os.path.exists(source) and source.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
        print(f"Opening video file: {source}")
        source_type = "video"
        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            print(f"Error: Could not open video file {source}")
            return
    
    # Check if source is an image file
    elif isinstance(source, str) and os.path.exists(source) and source.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.webp')):
        print(f"Opening image file: {source}")
        source_type = "image"
        img = cv2.imread(source)
        if img is None:
            print(f"Error: Could not open image file {source}")
            return
    
    else:
        print(f"Error: Invalid source {source}. Please specify a webcam index (0, 1, etc.) or a path to a video/image file.")
        return
    
    # Get class names
    names = model.module.names if hasattr(model, 'module') else model.names
    
    # Set colors for visualization
    np.random.seed(42)  # For consistent colors
    colors = [[np.random.randint(0, 255) for _ in range(3)] for _ in names]
    
    # Create a resizable window
    window_name = 'YOLOv5 Item Detection'
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    
    # Set initial window size (larger than default)
    cv2.resizeWindow(window_name, 1280, 720)
    
    # For single image detection
    if source_type == "image":
        # Start timing
        start_time = time.time()
        
        # Inference
        results = model(img)
        
        # End timing
        inference_time = time.time() - start_time
        
        # Process results
        detections = results.xyxy[0].cpu().numpy()
        
        # Draw boxes
        img_with_boxes = img.copy()  # Create a copy to preserve original
        for detection in detections:
            x1, y1, x2, y2, conf, cls_id = detection
            if conf >= conf_thres:
                label = f'{names[int(cls_id)]} {conf:.2f}'
                color = colors[int(cls_id)]
                cv2.rectangle(img_with_boxes, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                cv2.putText(img_with_boxes, label, (int(x1), int(y1) - 10), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        # Display performance info
        device_info = f"Device: {device}"
        inf_time_info = f"Inference time: {inference_time*1000:.1f}ms"
        objects_info = f"Detected objects: {len([d for d in detections if d[4] >= conf_thres])}"
        
        cv2.putText(img_with_boxes, device_info, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 
                    0.6, (0, 255, 0), 2)
        cv2.putText(img_with_boxes, inf_time_info, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 
                    0.6, (0, 255, 0), 2)
        cv2.putText(img_with_boxes, objects_info, (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 
                    0.6, (0, 255, 0), 2)
        
        # Calculate window size based on image size - aim for reasonable display size
        h, w = img_with_boxes.shape[:2]
        window_w = min(1280, w)  # Max width 1280
        window_h = int(window_w * (h / w))  # Keep aspect ratio
        cv2.resizeWindow(window_name, window_w, window_h)
        
        # Show the image
        cv2.imshow(window_name, img_with_boxes)
        print("\nPress any key to exit the image viewer...")
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        
        # Print performance summary
        print(f"\nPerformance Summary:")
        print(f"Device: {device}")
        print(f"Inference time: {inference_time*1000:.1f}ms")
        print(f"Detected objects: {len([d for d in detections if d[4] >= conf_thres])}")
        
        # Save the output image
        output_dir = "output"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        output_filename = f"detection_result_{Path(source).stem}.jpg"
        output_path = os.path.join(output_dir, output_filename)
        cv2.imwrite(output_path, img_with_boxes)
        print(f"Result image saved to: {output_path}")
        
    # For video or webcam
    else:
        # Variables for FPS calculation
        prev_time = time.time()
        frame_count = 0
        fps = 0
        
        # For skipping frames to improve performance
        process_this_frame = True
        
        print("Press 'q' to quit")
        
        try:
            while True:
                # Read frame
                ret, frame = cap.read()
                
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
                
                # Process with YOLOv5
                # Convert BGR to RGB
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Run inference
                results = model(rgb_frame)
                
                # Process results
                detections = results.xyxy[0].cpu().numpy()
                
                # Draw boxes on original frame
                for detection in detections:
                    x1, y1, x2, y2, conf, cls_id = detection
                    if conf >= conf_thres:
                        label = f'{names[int(cls_id)]} {conf:.2f}'
                        color = colors[int(cls_id)]
                        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                        
                        # Add a filled rectangle behind text for better visibility
                        text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
                        cv2.rectangle(frame, 
                                     (int(x1), int(y1) - text_size[1] - 10), 
                                     (int(x1) + text_size[0], int(y1)), 
                                     color, -1)
                        
                        # Add text with better visibility
                        cv2.putText(frame, label, (int(x1), int(y1) - 5), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                
                # Display performance info with better styling
                fps_text = f"FPS: {fps:.1f}"
                device_text = f"Device: {device}"
                objects_text = f"Objects: {len([d for d in detections if d[4] >= conf_thres])}"
                
                # Create info box background
                cv2.rectangle(frame, (5, 5), (300, 100), (0, 0, 0), -1)
                cv2.rectangle(frame, (5, 5), (300, 100), (0, 255, 0), 2)
                
                # Add text
                cv2.putText(frame, fps_text, (15, 35), cv2.FONT_HERSHEY_SIMPLEX, 
                           1, (0, 255, 0), 2)
                cv2.putText(frame, device_text, (15, 70), cv2.FONT_HERSHEY_SIMPLEX, 
                           0.8, (0, 255, 0), 2)
                cv2.putText(frame, objects_text, (15, 95), cv2.FONT_HERSHEY_SIMPLEX, 
                           0.7, (0, 255, 0), 2)
                
                # Show the frame
                cv2.imshow(window_name, frame)
                
                # Check for key press - quit if 'q' is pressed
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                    
        except Exception as e:
            print(f"Error during detection: {e}")
        
        finally:
            # Release resources
            cap.release()
            cv2.destroyAllWindows()


def get_sample_image_menu():
    """Generate a menu of available sample images"""
    # Look for sample images in local data directory
    sample_images = []
    if os.path.exists('data/images'):
        sample_images = [f for f in os.listdir('data/images') 
                       if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    # Create a menu
    print("\nWebcam access failed. Please select a sample image to test:\n")
    
    options = []
    
    # Add available sample images
    for i, img in enumerate(sample_images):
        options.append(f"data/images/{img}")
        print(f"{i+1}. {img} (sample image)")
    
    # Add option for custom path
    custom_option = len(options) + 1
    print(f"{custom_option}. Use a custom image path")
    
    # Get user choice
    while True:
        try:
            choice = input("\nEnter your choice (number): ")
            choice = int(choice)
            if 1 <= choice <= len(options):
                return options[choice-1]
            elif choice == custom_option:
                path = input("Enter the full path to your image file: ")
                if os.path.exists(path) and path.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp')):
                    return path
                else:
                    print("Invalid path or unsupported image format.")
            else:
                print("Invalid choice.")
        except ValueError:
            print("Please enter a number.")


def main():
    parser = argparse.ArgumentParser(description="Live Item Detection with YOLOv5")
    parser.add_argument('--weights', type=str, default='yolov5s.pt', 
                        help='model weights path or model name (default: yolov5s.pt)')
    parser.add_argument('--source', type=str, default='0', 
                        help='source (0 for webcam, or path to video/image file)')
    parser.add_argument('--img-size', type=int, default=640, 
                        help='inference size in pixels (default: 640)')
    parser.add_argument('--conf-thres', type=float, default=0.25, 
                        help='confidence threshold (default: 0.25)')
    parser.add_argument('--iou-thres', type=float, default=0.45, 
                        help='NMS IoU threshold (default: 0.45)')
    parser.add_argument('--device', type=str, default='', 
                        help='cuda device, i.e. 0 or 0,1,2,3 or cpu')
    args = parser.parse_args()
    
    print(f"Initializing YOLOv5 live detection system...")
    
    print(f"Loading model: {args.weights}")
    model, device = load_model(args.weights, args.device)
    
    print(f"Running detection on device: {device}")
    if 'cuda' in device:
        print("GPU acceleration enabled!")
    else:
        print("Warning: Running on CPU. For better performance, use a system with CUDA-capable GPU.")
    
    # Convert source to int if it's a webcam index
    source = args.source
    if source.isdigit():
        source = int(source)
    
    run_detection(
        model=model,
        device=device,
        source=source,
        conf_thres=args.conf_thres,
        iou_thres=args.iou_thres,
        img_size=args.img_size
    )


if __name__ == "__main__":
    main()