"""Make a short listing video (Etsy allows 5-15 s, no sound) from the listing images.

    python make_video.py     # needs `pip install imageio-ffmpeg`
"""

import os
import subprocess

import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
LISTING = os.path.join(HERE, "..", "..", "images", "listing")

VIDEOS = {
    "etsy-bundle-video.mp4": ["etsy-bundle-01-hero", "etsy-bundle-03-monthly-dashboard", "etsy-bundle-04-annual-overview",
                              "etsy-bundle-05-debt-payoff", "etsy-bundle-06-holiday-tracker",
                              "etsy-common-09-how-it-works"],
    "etsy-holiday-video.mp4": ["etsy-holiday-01-hero", "etsy-bundle-06-holiday-tracker", "etsy-holiday-02-detail",
                               "etsy-common-09-how-it-works"],
    "etsy-debt-video.mp4": ["etsy-debt-01-hero", "etsy-bundle-05-debt-payoff", "etsy-debt-02-schedule",
                            "etsy-common-09-how-it-works"],
}
HOLD, FADE = 2.4, 0.5  # seconds per slide, crossfade


def make(name, slides):
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    args = [ff, "-y", "-loglevel", "error"]
    for s in slides:
        args += ["-loop", "1", "-t", str(HOLD + FADE), "-i", os.path.join(LISTING, s + ".jpg")]
    # scale every slide to 1600x1200, then chain crossfades
    parts = [f"[{i}:v]scale=1600:1200,setsar=1,format=yuv420p,fps=30[v{i}]" for i in range(len(slides))]
    last = "v0"
    for i in range(1, len(slides)):
        out = f"x{i}"
        parts.append(f"[{last}][v{i}]xfade=transition=fade:duration={FADE}:offset={i * HOLD:.2f}[{out}]")
        last = out
    args += ["-filter_complex", ";".join(parts), "-map", f"[{last}]", "-c:v", "libx264", "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", "-an", os.path.join(LISTING, name)]
    subprocess.run(args, check=True)
    print(name, f"{len(slides) * HOLD + FADE:.1f}s")


if __name__ == "__main__":
    for n, sl in VIDEOS.items():
        make(n, sl)
