## Gorstaks AI

**Free · Unlimited · Your Hardware**

→ **[Try it live](https://gorstak-zadar.github.io/GorstaksAI/)**

A ChatGPT-like web interface where **all inference runs in the user's browser via WebGPU**. No cloud GPUs, no API keys, no limits, no installs.

### How it works

- Runs entirely in the user's browser using [WebLLM](https://webllm.mlc.ai/).
- **4 models** to choose from: Llama 3.2 3B, Hermes 3 3B, Qwen 3 4B, and Phi 3.5 Vision (image understanding).
- Uses the user's GPU via WebGPU. Requires a compatible browser (Chrome, Edge, or other Chromium-based).

## Quick Start

### 1. Install dependencies

```bash
cd local-ai-platform
npm install
cd server && npm install
cd ../web && npm install
```

### 2. Run in development

```bash
cd server
npm run dev
```

In another terminal:

```bash
cd web
npm run dev
```

Open `http://localhost:5173` in a WebGPU-capable browser (Chrome, Edge, or other Chromium-based).

### 3. Production build

```bash
cd web
npm run build
cd ../server
npm start
```

Open `http://localhost:3000`.

## Notes

- The first time a user opens the app, WebLLM will **download the model weights** in the background (a few GB). Subsequent loads are much faster thanks to caching.
- All prompts and responses stay in the browser; the server only serves static files.

