## Gorstaks AI

**Free · Unlimited · Your Hardware**

→ **[Try it live](https://gorstak-zadar.github.io/GorstaksAI/)**

A ChatGPT-like web interface where **all inference runs in the user's browser via WebGPU**. No cloud GPUs, no API keys, no limits, no installs.

### How it works

- Runs entirely in the user's browser using [WebLLM](https://webllm.mlc.ai/).
- **17 models** — latest versions from each family, plus specialists.
- Uses the user's GPU via WebGPU. Requires a compatible browser (Chrome, Edge, or other Chromium-based).

### Models

| Model | Description |
|-------|-------------|
| **Llama 3.2 3B** | General purpose (default) |
| **Llama 3.1 8B** | Strong general chat |
| **Hermes 3 3B** | Creative, less filtered |
| **Qwen 3 4B / 8B** | Smart reasoning |
| **Phi 3.5 Mini** | Efficient 3.8B |
| **Mistral 7B v0.3** | Strong instruct |
| **Gemma 2 2B / 9B** | Google models |
| **SmolLM2 360M / 1.7B** | Tiny, low VRAM |
| **Phi 3.5 Vision** | Understands images (camera button) |
| **DeepSeek R1 Qwen 7B** | Reasoning specialist |
| **Qwen 2.5 Coder 7B** | Coding specialist |
| **Qwen 2.5 Math 1.5B** | Math specialist |
| **Ministral 3 3B** | Mistral compact |

**Video & audio**: WebLLM currently supports only **text** and **image** (vision) inputs. Video and audio models are not available in-browser yet. Phi 3.5 Vision is the only multimodal option — you can attach images and ask questions about them.

## Development

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173` in a WebGPU-capable browser (Chrome, Edge, or other Chromium-based).

## Deployment

Hosted on GitHub Pages. Every push to `master` triggers an automatic build and deploy via GitHub Actions.

## Notes

- The first time a user opens the app, WebLLM will **download the model weights** in the background (a few GB). Subsequent loads are much faster thanks to caching.
- All prompts and responses stay in the browser. Nothing is sent to any server.


---

## Disclaimer

**NO WARRANTY.** THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW. EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU. SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING, REPAIR OR CORRECTION.

**Limitation of Liability.** IN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MODIFIES AND/OR CONVEYS THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES, INCLUDING ANY GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED TO LOSS OF DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY YOU OR THIRD PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER PROGRAMS), EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
