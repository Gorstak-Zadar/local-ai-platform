## Local AI Platform

**Free · Unlimited · Your Hardware**

→ **[Try it live](https://local-ai-platform-production.up.railway.app/)**

A ChatGPT-like web interface where prompts are entered on your website, but **all inference runs in the user's browser via WebGPU**. No cloud GPUs, no API keys, no limits, no installs.

### How it works now

- **Single mode** — Runs entirely in the user's browser using [WebLLM](https://webllm.mlc.ai/).
- Uses a **Llama 3.2 3B** model (`Llama-3.2-3B-Instruct-q4f16_1-MLC`) loaded on demand.
- Uses the user's GPU (when WebGPU is available). If WebGPU is not supported, the app shows an error.

There is **no worker process, no Ollama, and no separate \"Full\" mode** anymore.

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

