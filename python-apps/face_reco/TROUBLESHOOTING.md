# Troubleshooting Guide for L1GHT REC0N

## Camera Issues

### "Failed to grab frame from camera" Error

This error occurs when the camera cannot be initialized or accessed properly. Here are the solutions:

#### Common Causes and Solutions:

1. **Camera Already in Use**
   - Close any other applications using the camera (Zoom, Teams, Skype, etc.)
   - Restart your computer if needed

2. **Camera Not Connected**
   - Verify that your webcam is properly connected
   - Check Device Manager (Windows) to ensure the camera is recognized
   - Try a different USB port

3. **Camera Permissions**
   - On Windows 10/11: Go to Settings > Privacy > Camera
   - Ensure "Allow apps to access your camera" is enabled
   - Make sure Python is allowed to access the camera

4. **Driver Issues**
   - Update your camera drivers through Device Manager
   - Reinstall the camera drivers if necessary

5. **Wrong Camera Backend**
   - The application now tries multiple backends automatically:
     - DirectShow (preferred for Windows)
     - Windows Media Foundation (MSMF)
     - Any available backend
   
6. **Multiple Cameras**
   - If you have multiple cameras, the app will try indices 0-2 automatically
   - You can check which camera is being used in the console output

### Camera Initialization Takes Too Long

If camera initialization is slow:
- Try disabling other USB devices temporarily
- Use a USB 3.0 port if available
- Check for Windows updates that may fix USB/camera issues

## Performance Issues

### Low FPS (Frames Per Second)

1. **Enable GPU Acceleration**
   ```bash
   pip uninstall opencv-python
   pip install opencv-contrib-python
   ```
   Note: This requires NVIDIA GPU with CUDA support

2. **Reduce Camera Resolution**
   - Edit `person_profiles.py`
   - Change from 1280x720 to 640x480 for faster processing

3. **Close Resource-Intensive Applications**
   - Close browsers, games, or video editors
   - Check Task Manager for CPU/GPU usage

### Jerky or Stuttering Video

- Reduce frame processing by increasing the skip frame interval
- Lower the camera resolution
- Ensure camera drivers are up to date

## Face Recognition Issues

### Faces Not Being Recognized

1. **Poor Lighting**
   - Ensure adequate lighting on faces
   - Avoid backlighting or strong shadows

2. **Face Database Issues**
   - Verify images exist in `dataset/[person_name]/` folder
   - Ensure at least 5-10 clear face images per person
   - Images should show the face from different angles

3. **Recognition Threshold**
   - The default threshold is 0.6 (in `person_profiles.py`)
   - Lower values = stricter matching
   - Higher values = more lenient matching

### No Faces Being Detected

1. **Face Too Small or Too Far**
   - Move closer to the camera
   - Ensure face takes up at least 20% of frame

2. **Extreme Angles**
   - Face the camera directly
   - Avoid extreme head tilts or rotations

3. **Model Files Missing**
   - Verify these files exist in the face_reco directory:
     - `deploy.prototxt`
     - `res10_300x300_ssd_iter_140000.caffemodel`
     - `openface_nn4.small2.v1.t7`
   - Re-run `main.py` to download them if missing

## OpenCV Warnings

### MSMF Warnings (Windows)

Warnings like:
```
[ WARN:1] global cap_msmf.cpp:476 videoio(MSMF): OnReadSample() is called with error status: -1072875772
```

These are usually harmless and indicate the app is trying different camera backends. The app should automatically switch to a working backend.

### DNN Backend Warnings

If you see warnings about DNN backends:
- These are informational and don't affect functionality
- Install CUDA for GPU acceleration to eliminate them (optional)

## Installation Issues

### Missing Dependencies

If you get import errors:
```bash
pip install -r requirements.txt --upgrade
```

### OpenCV Installation Issues

If OpenCV doesn't work:
```bash
pip uninstall opencv-python opencv-contrib-python opencv-python-headless
pip install opencv-python==4.11.0.86
```

## Profile Issues

### Profile Not Displaying

1. Check that `profile.json` exists in `dataset/[person_name]/`
2. Verify JSON format is valid
3. Ensure the profile matches the expected schema

### Profiles Not Saving

1. Check write permissions in the `dataset` folder
2. Verify disk space is available
3. Check console output for error messages

## Platform-Specific Issues

### Windows

- **Antivirus Blocking Camera**: Add Python to antivirus exceptions
- **Camera Privacy Settings**: Check Windows Camera privacy settings
- **Windows Hello**: Disable if it conflicts with camera access

### Linux

- Check camera permissions: `sudo chmod 666 /dev/video0`
- Install v4l-utils: `sudo apt-get install v4l-utils`
- List cameras: `v4l2-ctl --list-devices`

### macOS

- Grant camera permissions in System Preferences > Security & Privacy
- May need to approve terminal/Python in security settings

## Getting More Help

If none of these solutions work:

1. Check the console output for specific error messages
2. Verify your Python version: `python --version` (should be 3.10+)
3. Check OpenCV installation: `python -c "import cv2; print(cv2.__version__)"`
4. Test camera independently: `python -c "import cv2; cap = cv2.VideoCapture(0); print(cap.read())"`

## Reporting Issues

When reporting issues, please include:
- Operating System and version
- Python version
- OpenCV version
- Camera model/type
- Full error message from console
- Steps to reproduce the issue
