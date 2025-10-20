# How to Add a New Person to the L1GHT REC0N Database

This guide explains how to add new people to your face recognition system so they can be identified in the future.

---

## Method 1: Using the Face Scanner Tool (Recommended) 🎥

The **Face Scanner** is an interactive GUI tool that makes adding people easy.

### Step-by-Step Instructions:

#### 1. Launch the Face Scanner

From the CLEM application:
- Click on the **Face Recognition** app
- Select **"Add New Person"** or **"Face Scanner"** option

Or run directly from command line:
```bash
cd d:\projects\C.L.E.M-demo\python-apps\face_reco
python face_scanner.py
```

#### 2. Enter Person's Information

A dialog will appear asking for:
- **Name**: The person's name (required)
- **Age**: Their age (auto-filled with random value, you can change it)
- **Gender**: Male/Female/Other
- **Occupation**: Their profession
- **Nationality**: Their country
- **Status**: CIVILIAN, PERSON OF INTEREST, etc.
- **Threat Level**: LOW, MODERATE, HIGH
- **Notes**: Any additional information

**Tip:** You can use the auto-filled values and update them later if needed.

#### 3. Configure Capture Settings

Next dialog asks for:
- **Auto-capture**: Yes/No (recommended: Yes)
- **Interval**: Seconds between auto-captures (recommended: 3.0)
- **Target count**: Number of images to capture (recommended: 10)

#### 4. Capture Face Images

The camera window opens with face detection enabled:

**Auto-Capture Mode (Recommended):**
- Stand in front of the camera
- When your face is detected, a countdown will start
- The system captures images automatically
- Slowly turn your head left/right, up/down between captures
- Continue until target count is reached

**Manual Capture Mode:**
- Press **`C`** key to capture an image
- Change your pose/angle
- Repeat until you have 5-10 images

**Controls:**
- `C` - Manually capture an image
- `A` - Toggle auto-capture on/off
- `Q` - Quit when done

#### 5. Best Practices for Image Capture

For optimal recognition, capture images with:
- ✅ **Different angles**: Face camera, turn 45° left, turn 45° right
- ✅ **Different expressions**: Neutral, smiling, serious
- ✅ **Good lighting**: Well-lit room, avoid shadows on face
- ✅ **Clear view**: Remove glasses if possible, hair away from face
- ✅ **Varied distances**: Slightly closer and farther from camera

**Aim for 10-15 images** for best accuracy.

#### 6. Completion

When done:
- Press `Q` to quit
- A confirmation message shows where images were saved
- The profile is automatically created

---

## Method 2: Manual Addition (Advanced Users) 📁

If you prefer manual setup or have existing images:

### Step 1: Create Person Directory

Create a folder in the dataset directory:
```
d:\projects\C.L.E.M-demo\python-apps\face_reco\dataset\[person_name]\
```

**Example:**
```
d:\projects\C.L.E.M-demo\python-apps\face_reco\dataset\john_doe\
```

### Step 2: Add Face Images

Add **5-15 clear face images** to this folder:
- Name them: `john_doe_1.jpg`, `john_doe_2.jpg`, etc.
- Supported formats: `.jpg`, `.jpeg`, `.png`
- Images should contain clear views of the person's face
- Multiple angles and expressions work best

**Image Requirements:**
- Minimum size: 200x200 pixels
- Face should be clearly visible
- Good lighting
- Minimal blur

### Step 3: Create Profile JSON

Create a file named `profile.json` in the person's folder with this structure:

```json
{
    "name": "John Doe",
    "age": 30,
    "gender": "Male",
    "occupation": "Engineer",
    "nationality": "USA",
    "status": "CIVILIAN",
    "threat_level": "LOW",
    "last_seen": "2025-10-19 14:30:00",
    "notes": "Manually added profile.",
    "sightings": 1
}
```

**Field Descriptions:**
- `name`: Person's full name
- `age`: Age in years (or "?" if unknown)
- `gender`: "Male", "Female", or "Other"
- `occupation`: Job title or "Unknown"
- `nationality`: Country or "Unknown"
- `status`: "CIVILIAN", "PERSON OF INTEREST", "UNDER SURVEILLANCE", "WANTED", or "NEW SUBJECT"
- `threat_level`: "LOW", "MODERATE", "HIGH", or "UNKNOWN"
- `last_seen`: Date/time in format "YYYY-MM-DD HH:MM:SS"
- `notes`: Any additional information (multi-line text)
- `sightings`: Number of times seen (start with 1)

### Step 4: Verify

Run the face recognition system to verify:
```bash
python main.py
```

The person should now be recognized!

---

## Managing Profiles

### Viewing Existing Profiles

All profiles are stored in:
```
d:\projects\C.L.E.M-demo\python-apps\face_reco\dataset\
```

Each person has their own folder containing:
- Face images (.jpg files)
- `profile.json` (profile information)

### Editing a Profile

1. Navigate to the person's folder
2. Open `profile.json` in a text editor
3. Make your changes
4. Save the file
5. Changes take effect immediately

### Adding More Images to an Existing Profile

You can add more images at any time:
1. Open the person's folder
2. Add new .jpg images (name them with incrementing numbers)
3. Run face recognition - it will automatically load the new images

### Deleting a Profile

To remove someone from the database:
1. Navigate to: `d:\projects\C.L.E.M-demo\python-apps\face_reco\dataset\`
2. Delete the person's entire folder
3. The person will no longer be recognized

---

## Troubleshooting

### "Could not open webcam" Error

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for camera issues.

### Person Not Being Recognized

If a person isn't being recognized after adding:

1. **Check image quality**:
   - Images should be clear and well-lit
   - Face should be visible and unobstructed

2. **Add more images**:
   - Capture 5-10 more images from different angles
   - Include various lighting conditions

3. **Verify profile.json**:
   - Check file exists in person's folder
   - Ensure JSON format is valid (use a JSON validator)

4. **Check recognition threshold**:
   - In `person_profiles.py`, the threshold is 0.6
   - Lower = stricter (fewer false positives)
   - Higher = more lenient (may recognize more often)

### Face Not Detected During Scanning

- Ensure good lighting
- Move closer to the camera
- Face the camera directly
- Remove obstructions (hair, glasses, hands)

### Auto-Capture Not Working

- Verify face is detected (green box should appear)
- Check console output for errors
- Try manual capture mode instead (press `C`)

---

## Quick Reference

| Task | Command |
|------|---------|
| Add new person | `python face_scanner.py` |
| Run face recognition | `python main.py` |
| View all profiles | Check `dataset/` folder |
| Edit a profile | Edit `dataset/[name]/profile.json` |
| Delete a person | Delete `dataset/[name]/` folder |

---

## Tips for Best Results

1. **Capture 10-15 images** per person for optimal accuracy
2. **Vary the angles and expressions** during capture
3. **Use good lighting** - avoid backlighting and harsh shadows
4. **Keep face clear** - remove sunglasses, hats during capture
5. **Update regularly** - if someone's appearance changes significantly, add new images
6. **Test after adding** - Run the main app to verify recognition works

---

**Need more help?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or check the console output for detailed error messages.
