# Convert PNG logo to ICO for Windows installer
# Run this with Python to create logo.ico from logo.png

try:
    from PIL import Image
    import os
    
    print("Converting logo.png to logo.ico...")
    
    # Open the PNG file
    img_path = os.path.join("assets", "icons", "logo.png")
    if not os.path.exists(img_path):
        img_path = os.path.join("assets", "icons", "CLEM", "logo.png")
    
    if not os.path.exists(img_path):
        print(f"❌ Error: Could not find logo.png")
        print("Please make sure logo.png exists in assets/icons/ or assets/icons/CLEM/")
        exit(1)
    
    img = Image.open(img_path)
    
    # Convert to ICO with multiple sizes for Windows
    ico_path = os.path.join("assets", "icons", "logo.ico")
    img.save(ico_path, format='ICO', sizes=[(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)])
    
    print(f"✅ Success! Created {ico_path}")
    print("You can now use this icon in the Inno Setup script")
    
except ImportError:
    print("❌ Pillow (PIL) is not installed")
    print("\nTo install it:")
    print("  pip install Pillow")
    print("\nOr use this in your project environment:")
    print("  env\\Scripts\\pip.exe install Pillow")
    exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
