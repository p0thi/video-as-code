import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import ffmpeg from 'fluent-ffmpeg';

// ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// TypeScript interfaces for Input JSON
interface Scene {
  duration: number;
  backgroundColor: string;
  html: string;
}

interface VideoInput {
  width: number;
  height: number;
  fps: number;
  scenes: Scene[];
}

// Load input configuration
const inputPath = path.join(projectRoot, 'input.json');
const input: VideoInput = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// Paths
const tempFramesDir = path.join(projectRoot, 'temp_frames');
const outputPath = path.join(projectRoot, 'output.mp4');

/**
 * Clean and create the temp frames directory
 */
function setupTempDirectory(): void {
  if (fs.existsSync(tempFramesDir)) {
    console.log('🧹 Cleaning existing temp_frames directory...');
    fs.rmSync(tempFramesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempFramesDir, { recursive: true });
  console.log('📁 Created temp_frames directory');
}

/**
 * Generate HTML boilerplate for a scene
 */
function generateHtml(scene: Scene, width: number, height: number): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            width: ${width}px;
            height: ${height}px;
            overflow: hidden;
            background-color: ${scene.backgroundColor};
          }
        </style>
      </head>
      <body>
        ${scene.html}
      </body>
    </html>
  `;
}

/**
 * Render all scenes to frames using Puppeteer
 */
async function renderScenes(): Promise<number> {
  console.log('🚀 Launching Puppeteer...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({
    width: input.width,
    height: input.height,
    deviceScaleFactor: 1
  });

  let frameNumber = 0;
  const totalFrames = input.scenes.reduce(
    (sum, scene) => sum + scene.duration * input.fps, 
    0
  );

  console.log(`🎬 Rendering ${totalFrames} frames across ${input.scenes.length} scenes...`);

  for (let sceneIndex = 0; sceneIndex < input.scenes.length; sceneIndex++) {
    const scene = input.scenes[sceneIndex];
    const sceneFrameCount = scene.duration * input.fps;
    
    console.log(`\n📸 Scene ${sceneIndex + 1}/${input.scenes.length} - ${sceneFrameCount} frames`);
    
    // Set page content for this scene
    const html = generateHtml(scene, input.width, input.height);
    await page.setContent(html, { waitUntil: 'load' });

    // Capture frames for this scene
    for (let i = 0; i < sceneFrameCount; i++) {
      const frameName = `frame-${String(frameNumber).padStart(5, '0')}.png`;
      const framePath = path.join(tempFramesDir, frameName);
      
      await page.screenshot({ 
        path: framePath,
        type: 'png'
      });
      
      frameNumber++;
      process.stdout.write('.');
    }
  }

  console.log('\n');
  await browser.close();
  console.log('✅ Frame rendering complete!');
  
  return frameNumber;
}

/**
 * Stitch frames into video using FFmpeg
 */
function stitchVideo(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('🎥 Stitching frames into video with FFmpeg...');
    
    const inputPattern = path.join(tempFramesDir, 'frame-%05d.png');
    
    ffmpeg()
      .input(inputPattern)
      .inputFPS(input.fps)
      .videoCodec('libx264')
      .outputOptions([
        '-pix_fmt yuv420p',
        '-preset medium',
        '-crf 23'
      ])
      .output(outputPath)
      .on('start', (commandLine: string) => {
        console.log('📋 FFmpeg command:', commandLine);
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          process.stdout.write(`\r🔄 Encoding: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('end', () => {
        console.log('\n✅ Video encoding complete!');
        console.log(`📹 Output saved to: ${outputPath}`);
        
        // Cleanup temp frames
        console.log('🧹 Cleaning up temp_frames...');
        fs.rmSync(tempFramesDir, { recursive: true, force: true });
        console.log('✅ Cleanup complete!');
        
        resolve();
      })
      .on('error', (err: Error) => {
        console.error('\n❌ FFmpeg error:', err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('═'.repeat(50));
  console.log('🎬 Video Render POC - TypeScript + ES Modules');
  console.log('═'.repeat(50));
  console.log(`📐 Resolution: ${input.width}x${input.height}`);
  console.log(`🎞️  FPS: ${input.fps}`);
  console.log(`🎭 Scenes: ${input.scenes.length}`);
  
  const totalDuration = input.scenes.reduce((sum, s) => sum + s.duration, 0);
  console.log(`⏱️  Total Duration: ${totalDuration} seconds`);
  console.log('═'.repeat(50));

  try {
    // Step 1: Setup temp directory
    setupTempDirectory();

    // Step 2 & 3: Render scenes to frames
    const frameCount = await renderScenes();
    console.log(`📊 Total frames rendered: ${frameCount}`);

    // Step 4: Stitch frames into video
    await stitchVideo();

    console.log('═'.repeat(50));
    console.log('🎉 Video generation complete!');
    console.log('═'.repeat(50));
  } catch (error) {
    console.error('❌ Error during video generation:', error);
    process.exit(1);
  }
}

// Run the main function
main();
