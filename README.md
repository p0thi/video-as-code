# Video Render POC

A TypeScript-based proof of concept for programmatic video generation from JSON configuration.

## Overview

This project takes a JSON file describing video scenes and generates an MP4 video. It uses:
- **Puppeteer** to render HTML scenes as screenshots
- **FFmpeg** to stitch the frames into a video

## Prerequisites

- **Node.js** v18 or higher
- **FFmpeg** installed on your system
  - macOS: `brew install ffmpeg`
  - Ubuntu: `sudo apt install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

## Installation

```bash
npm install
```

## Usage

### Run the video generator

```bash
npm start
```

This will:
1. 🧹 Clean/create the `temp_frames` directory
2. 📸 Capture frames for each scene using Puppeteer
3. 🎥 Encode frames into `output.mp4` using FFmpeg
4. 🧹 Clean up temporary frame files

### Input Format

Edit `input.json` to customize your video:

```json
{
  "width": 1280,
  "height": 720,
  "fps": 30,
  "scenes": [
    {
      "duration": 3,
      "backgroundColor": "#1a1a1a",
      "html": "<h1 style='color: white;'>Your HTML content</h1>"
    }
  ]
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `width` | number | Video width in pixels |
| `height` | number | Video height in pixels |
| `fps` | number | Frames per second |
| `scenes` | array | Array of scene objects |

#### Scene Properties

| Property | Type | Description |
|----------|------|-------------|
| `duration` | number | Scene duration in seconds |
| `backgroundColor` | string | CSS background color |
| `html` | string | HTML content to render |

## Output

The generated video will be saved as `output.mp4` in the project root.

## Project Structure

```
video-render-poc/
├── package.json        # Project configuration
├── tsconfig.json       # TypeScript configuration
├── input.json          # Video scene definitions
├── src/
│   └── render.ts       # Main rendering script
├── output.mp4          # Generated video (after running)
└── README.md           # This file
```

## Technical Details

- Uses ES Modules (`"type": "module"`)
- TypeScript with ESNext target
- Headless Puppeteer for HTML rendering
- H.264 codec with yuv420p pixel format for broad compatibility

## License

MIT
