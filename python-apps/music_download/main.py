import subprocess
import os
from pathlib import Path
from time import sleep
import sys
import json
import shutil
import importlib.util

# Set UTF-8 encoding for stdout on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Set FFmpeg path to the local directory (check if exists, otherwise use system)
FFMPEG_PATH = os.path.join(SCRIPT_DIR, 'ffmpeg.exe')
if not os.path.exists(FFMPEG_PATH):
    # Try parent youtube_download directory
    FFMPEG_PATH = os.path.join(os.path.dirname(SCRIPT_DIR), 'youtube_download', 'ffmpeg.exe')

# Modern hacker-style header
def print_banner():
    banner = """
========================================================================
                    LIGHT MUSIC DOWNLOADER
                       Audio from YouTube
========================================================================
"""
    try:
        print(banner)
    except UnicodeEncodeError:
        print("=== LIGHT MUSIC DOWNLOADER - Audio from YouTube ===")

# Check if yt-dlp is installed and available
def check_yt_dlp():
    """Check if yt-dlp is installed and available, either as command or Python module"""
    # Check if command is in PATH
    if shutil.which("yt-dlp") is not None:
        return "command"
    
    # Check if module is installed
    if importlib.util.find_spec("yt_dlp") is not None:
        return "module"
    
    # Not found
    print("\n❌ Error: yt-dlp not found in your system")
    print("\n📋 Please install yt-dlp using one of these methods:")
    print("   1. Run: pip install -r requirements.txt")
    print("   2. Run: pip install yt-dlp")
    print("   3. Download from https://github.com/yt-dlp/yt-dlp#installation")
    print("\nIf you've already installed yt-dlp but still see this error, you may need to:")
    print("   1. Add the Python Scripts directory to your PATH")
    print("   2. Restart your terminal or computer")
    print("   3. Or try using 'python -m yt_dlp' directly\n")
    return False

# Progress bar with percentage
def animate_bar(task, total):
    bar = ""
    for i in range(1, 51):
        percent = int((i / 50) * 100)
        sys.stdout.write(f"\r🎵 {task}... [{bar:<50}] {percent}%")
        sys.stdout.flush()
        bar += "▌"
        sleep(0.02)
    print("\n")

# Get playlist entries using yt-dlp
def get_playlist_entries(url, yt_dlp_mode):
    if yt_dlp_mode == "command":
        cmd = ["yt-dlp", "--flat-playlist", "--dump-json", url]
    else:  # module mode
        cmd = [sys.executable, "-m", "yt_dlp", "--flat-playlist", "--dump-json", url]
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    
    entries = []
    for line in result.stdout.strip().split("\n"):
        if line.strip():
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
                
    return entries

def download_audio(url, output_path=None, quality='best'):
    """Download audio from YouTube and convert to MP3"""
    if not output_path:
        output_path = str(Path.home() / "Music")
    
    os.makedirs(output_path, exist_ok=True)
    
    print("🎵 Starting download...")
    print(f"📂 Output folder: {output_path}")
    print(f"🎯 Quality: {quality}")
    print("-" * 50)
    
    try:
        # Use yt-dlp Python module directly (more reliable)
        import yt_dlp
        
        # Progress hook to print progress on separate lines
        def progress_hook(d):
            if d['status'] == 'downloading':
                if 'total_bytes' in d or 'total_bytes_estimate' in d:
                    total = d.get('total_bytes') or d.get('total_bytes_estimate')
                    downloaded = d.get('downloaded_bytes', 0)
                    if total:
                        percent = (downloaded / total) * 100
                        speed = d.get('speed', 0)
                        speed_str = f"{speed/1024/1024:.2f}MiB/s" if speed else "N/A"
                        # Print on new line so it's captured by the app
                        print(f"[download] {percent:.1f}% of {total/1024/1024:.2f}MiB at {speed_str}", flush=True)
            elif d['status'] == 'finished':
                print(f"[download] 100% Download complete, now converting...", flush=True)
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': f'{output_path}/%(title)s.%(ext)s',
            'quiet': False,
            'no_warnings': False,
            'ffmpeg_location': SCRIPT_DIR if os.path.exists(FFMPEG_PATH) else None,
            'progress_hooks': [progress_hook],  # Add progress hook
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192' if quality == 'best' else '128',
            }],
        }
        
        print("🔗 Fetching video information...")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Get video info first
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'Unknown Title')
            duration = info.get('duration', 0)
            
            print(f"🎵 Title: {title}")
            if duration:
                mins, secs = divmod(duration, 60)
                print(f"⏱️ Duration: {mins:02d}:{secs:02d}")
            
            print("\n⬇️ Downloading and converting to MP3...")
            
            # Download and convert
            ydl.download([url])
        
        print("\n✅ Download completed successfully!")
        print(f"📁 Files saved to: {output_path}")
        
    except ImportError:
        print("❌ Error: yt-dlp module not found")
        print("Please install it with: pip install yt-dlp")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Download error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print_banner()
    
    # Check if running with command line arguments
    if len(sys.argv) > 1:
        url = sys.argv[1]
        output_path = sys.argv[2] if len(sys.argv) > 2 else None
        quality = sys.argv[3] if len(sys.argv) > 3 else 'best'
        
        print(f"Arguments received: {len(sys.argv)}")
        print(f"URL: {url}")
        if output_path:
            print(f"Output Path: {output_path}")
        print(f"Quality: {quality}")
        
        download_audio(url, output_path, quality)
        
    else:
        # Interactive mode
        try:
            while True:
                url = input("\n📎 Paste YouTube URL here (or type 'exit'): ").strip()
                if url.lower() == "exit":
                    print("👋 Exiting Light Music Downloader. Goodbye!")
                    break
                elif url:
                    output_path = str(Path.home() / "Music")
                    download_audio(url, output_path, 'best')
                else:
                    print("❌ No URL provided. Try again or type 'exit'.")
        except KeyboardInterrupt:
            print("\n\n👋 Exiting Light Music Downloader. Goodbye!")
            sys.exit(0)
