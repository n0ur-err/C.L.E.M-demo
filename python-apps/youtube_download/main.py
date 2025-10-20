import os
import subprocess
import sys
import json
from pathlib import Path
from time import sleep
from yt_dlp.utils import DownloadError
import yt_dlp

# Set UTF-8 encoding for stdout on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Set FFmpeg path to the local directory
FFMPEG_PATH = os.path.join(SCRIPT_DIR, 'ffmpeg.exe')
FFPROBE_PATH = os.path.join(SCRIPT_DIR, 'ffprobe.exe')

# Simple ASCII banner that works everywhere
def print_banner():
    banner = """
========================================================================
                    LIGHT VIDEO DOWNLOADER
                       YouTube Video & Audio
========================================================================
"""
    print(banner)

# Animated bar (simulated progress)
def animate_bar(task):
    bar = ""
    for i in range(1, 51):
        percent = int((i / 50) * 100)
        sys.stdout.write(f"\r📥 {task}... [{bar:<50}] {percent}%")
        sys.stdout.flush()
        bar += "▌"
        sleep(0.02)
    print()

def download_with_progress(url, output_path):
    ydl_opts = {
        'format': 'bestvideo+bestaudio',
        'outtmpl': f'{output_path}/%(title)s.%(ext)s',
        'merge_output_format': 'mp4',
        'quiet': True,
        'no_warnings': True,
    }

    animate_bar("Merging best video + audio")

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])


def download_video(url, output_path=None, quality='best'):
    """Download a video from YouTube with the specified quality"""
    if not output_path:
        output_path = str(Path.home() / "Videos")
    
    os.makedirs(output_path, exist_ok=True)
    
    # Quality options mapping with fallbacks
    quality_formats = {
        'best': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best',
        'worst': 'worst[ext=mp4]/worst',
        '720p': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720][ext=mp4]/best[height<=720]',
        '480p': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480][ext=mp4]/best[height<=480]',
        'audio': 'bestaudio[ext=m4a]/bestaudio/best'
    }
    
    format_selector = quality_formats.get(quality, 'best[ext=mp4]/best')
    
    # Progress hook to print progress on separate lines (not carriage returns)
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
            print(f"[download] 100% Download complete, now post-processing...", flush=True)
    
    ydl_opts = {
        'format': format_selector,
        'outtmpl': f'{output_path}/%(title)s.%(ext)s',
        'merge_output_format': 'mp4' if quality != 'audio' else None,
        'quiet': False,
        'no_warnings': False,
        'extractaudio': False,
        'writeinfojson': False,
        'ignoreerrors': False,
        'ffmpeg_location': SCRIPT_DIR,  # Point to the directory containing ffmpeg.exe
        'progress_hooks': [progress_hook],  # Add progress hook
    }
    
    if quality == 'audio':
        ydl_opts['format'] = 'bestaudio'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
    
    try:
        print(f"🎬 Starting download...")
        print(f"📂 Output folder: {output_path}")
        print(f"🎯 Quality: {quality}")
        print("-" * 50)
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Get video info first
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'Unknown Title')
            duration = info.get('duration', 0)
            
            print(f"📺 Title: {title}")
            if duration:
                mins, secs = divmod(duration, 60)
                print(f"⏱️ Duration: {mins:02d}:{secs:02d}")
            
            # Download the video
            ydl.download([url])
            
        print("\n✅ Download completed successfully!")
        print(f"📁 Files saved to: {output_path}")
        
    except DownloadError as e:
        error_msg = str(e)
        print(f'\n❌ Download error: {error_msg}')
        
        # If format not available, try progressive fallbacks
        if "Requested format is not available" in error_msg:
            print("🔄 Retrying with progressive fallback formats...")
            
            fallback_formats = [
                'best[ext=mp4]',
                'best[ext=webm]', 
                'best',
                'worst'
            ]
            
            for i, fallback_format in enumerate(fallback_formats):
                try:
                    print(f"  Attempt {i+1}: Trying format '{fallback_format}'...")
                    fallback_opts = ydl_opts.copy()
                    fallback_opts['format'] = fallback_format
                    
                    with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                        ydl.download([url])
                    
                    print(f"\n✅ Download completed successfully with format '{fallback_format}'!")
                    print(f"📁 Files saved to: {output_path}")
                    return
                    
                except Exception as fallback_error:
                    print(f"  ❌ Format '{fallback_format}' failed: {str(fallback_error)[:100]}...")
                    continue
            
            print("❌ All fallback formats failed. This video may be restricted or unavailable.")
        
        sys.exit(1)
    except Exception as e:
        print(f'\n❌ Unexpected error: {e}')
        sys.exit(1)

if __name__ == '__main__':
    try:
        print_banner()
        
        # Check if running with command line arguments
        if len(sys.argv) > 1:
            url = sys.argv[1]
            output_path = sys.argv[2] if len(sys.argv) > 2 else None
            quality = sys.argv[3] if len(sys.argv) > 3 else 'best'
            
            print(f"Arguments received: {len(sys.argv)}")
            print(f"URL: {url}")
            print(f"Output Path: {output_path}")
            print(f"Quality: {quality}")
            
            if not url or url.lower() == 'none':
                print("Error: No URL provided")
                sys.exit(1)
            
            download_video(url, output_path, quality)
        
        else:
            # Interactive mode
            try:
                while True:
                    link = input("\n📎 Paste YouTube URL here (or type 'exit'): ").strip()
                    if link.lower() == 'exit':
                        print("👋 Exiting Light Video Downloader. Goodbye!")
                        sys.exit(0)
                    
                    if not link:
                        print("⚠️ Please enter a valid URL")
                        continue
                    
                    # Ask for quality preference
                    print("\n🎯 Quality options:")
                    print("1. Best quality (default)")
                    print("2. 720p")
                    print("3. 480p") 
                    print("4. Audio only")
                    
                    quality_choice = input("\nEnter choice (1-4, or press Enter for best): ").strip()
                    quality_map = {'1': 'best', '2': '720p', '3': '480p', '4': 'audio', '': 'best'}
                    quality = quality_map.get(quality_choice, 'best')
                    
                    output_path = str(Path.home() / "Videos")
                    download_video(link, output_path, quality)
                    
                    again = input("\n🔄 Download another video? (y/n): ").strip().lower()
                    if again not in ['y', 'yes']:
                        print("👋 Thanks for using Light Video Downloader!")
                        break
                        
            except KeyboardInterrupt:
                print("\n\n👋 Exiting Light Video Downloader. Goodbye!")
                sys.exit(0)
            except Exception as e:
                print(f'\n❌ Unexpected error: {e}')
                sys.exit(1)
                
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)
