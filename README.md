# video-as-code

A Hono API server that composes video clips using [Remotion](https://remotion.dev).

Send a JSON payload with video clip definitions (URL + start/end times) and get back a composed MP4 video.

## Setup

```bash
npm install
```

## Usage

### Start the server

```bash
npm run dev
```

### Render a video

```bash
curl -X POST http://localhost:3000/render \
  -H "Content-Type: application/json" \
  -d '{
    "clips": [
      {
        "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "startTime": 5,
        "endTime": 10
      },
      {
        "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "startTime": 0,
        "endTime": 5
      }
    ]
  }' \
  --output output.mp4
```

### Options

| Field     | Type     | Default | Description                        |
| --------- | -------- | ------- | ---------------------------------- |
| `clips`   | `Clip[]` | —       | **Required.** List of video clips  |
| `fps`     | `number` | `30`    | Frames per second                  |
| `width`   | `number` | `1920`  | Output video width in pixels       |
| `height`  | `number` | `1080`  | Output video height in pixels      |

Each clip:

| Field       | Type     | Description                              |
| ----------- | -------- | ---------------------------------------- |
| `url`       | `string` | URL of the source video                  |
| `startTime` | `number` | Start time in seconds                    |
| `endTime`   | `number` | End time in seconds (must be > startTime)|

### Remotion Studio

Preview your compositions interactively:

```bash
npm run studio
```

## Architecture

```
src/
├── types.ts              # Zod schemas & TypeScript types
├── server.ts             # Hono API server
├── render.ts             # Remotion render engine
└── remotion/
    ├── index.ts          # Remotion entry point (composition registration)
    └── Composition.tsx   # Video composition (Series + OffthreadVideo)
```
