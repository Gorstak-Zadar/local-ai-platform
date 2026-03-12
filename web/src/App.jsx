import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const MODELS = [
  { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", name: "Llama 3.2 3B", desc: "General purpose", vision: false },
  { id: "Hermes-3-Llama-3.2-3B-q4f16_1-MLC", name: "Hermes 3 3B", desc: "Creative, less filtered", vision: false },
  { id: "Qwen3-4B-q4f16_1-MLC", name: "Qwen 3 4B", desc: "Smart reasoning", vision: false },
  { id: "Phi-3.5-vision-instruct-q4f16_1-MLC", name: "Phi 3.5 Vision", desc: "Understands images", vision: true },
];

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function App() {
  const [modelIdx, setModelIdx] = useState(0);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const engineRef = useRef(null);
  const loadedModelRef = useRef(null);
  const fileInputRef = useRef(null);

  const model = MODELS[modelIdx];
  const isReady = status === "ready";

  const loadModel = useCallback(async (m) => {
    if (loadedModelRef.current === m.id && engineRef.current) return engineRef.current;

    if (engineRef.current) {
      try { await engineRef.current.unload(); } catch {}
      engineRef.current = null;
      loadedModelRef.current = null;
    }

    setStatus("loading");
    setProgress(0);
    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const engine = await CreateMLCEngine(m.id, {
        initProgressCallback: (p) => {
          setProgress(Math.round((p.progress || 0) * 100));
        },
      });
      engineRef.current = engine;
      loadedModelRef.current = m.id;
      setStatus("ready");
      return engine;
    } catch (e) {
      setStatus("error");
      throw e;
    }
  }, []);

  useEffect(() => {
    loadModel(MODELS[modelIdx]).catch(() => {});
  }, [modelIdx, loadModel]);

  const handleModelChange = (e) => {
    const idx = Number(e.target.value);
    setModelIdx(idx);
    setImage(null);
    setImagePreview(null);
  };

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    setImage(dataUrl);
    setImagePreview(dataUrl);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendPrompt = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !engineRef.current) return;

    const history = messages
      .filter((m) => m.role === "user" || (m.role === "assistant" && !m.streaming))
      .map((m) => ({ role: m.role, content: m.content }));

    const userMsg = { role: "user", content: text, image: image || null };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const attachedImage = image;
    removeImage();

    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);
    setStreaming(true);

    let full = "";
    try {
      const apiMessages = history.map((m) => ({ role: m.role, content: m.content }));

      if (model.vision && attachedImage) {
        apiMessages.push({
          role: "user",
          content: [
            { type: "image_url", image_url: { url: attachedImage } },
            { type: "text", text },
          ],
        });
      } else {
        apiMessages.push({ role: "user", content: text });
      }

      const stream = await engineRef.current.chat.completions.create({
        messages: apiMessages,
        stream: true,
        max_tokens: 4096,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          full += delta;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            return prev.slice(0, -1).concat({ ...last, content: full, streaming: true });
          });
        }
      }
    } catch (e) {
      setMessages((prev) =>
        prev.slice(0, -1).concat({
          role: "assistant",
          content: `Error: ${e.message}`,
          error: true,
        })
      );
    }

    setStreaming(false);
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.streaming) {
        return prev.slice(0, -1).concat({ ...last, content: full || last.content, streaming: false });
      }
      return prev;
    });
  }, [input, streaming, messages, image, model]);

  const statusText =
    status === "loading"
      ? `Loading ${model.name}… ${progress}%`
      : status === "ready"
        ? `${model.name} — Ready`
        : status === "error"
          ? "WebGPU not supported — Try Chrome or Edge"
          : "Starting…";

  return (
    <div className="app">
      <header>
        <h1>Gorstaks AI</h1>
        <p>Free · Unlimited · Your Hardware</p>
        <div className="status">
          {status === "ready" && <span className="dot ok" />}
          {status === "loading" && <span className="dot pulse" />}
          {status === "error" && <span className="dot err" />}
          {status === "idle" && <span className="dot pulse" />}
          <span>{statusText}</span>
        </div>
        <div className="model-select">
          <select value={modelIdx} onChange={handleModelChange} disabled={streaming}>
            {MODELS.map((m, i) => (
              <option key={m.id} value={i}>{m.name} — {m.desc}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="chat">
        {messages.length === 0 && (
          <div className="empty">
            <p>Type anything. No limits. Your machine does the work.</p>
            <p className="sub">
              {model.vision
                ? "Attach an image and ask about it, or just chat."
                : "Code, essays, ideas — all local, all private."}
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role} ${m.error ? "error" : ""}`}>
            <span className="role">{m.role}</span>
            {m.image && (
              <img src={m.image} alt="Attached" className="msg-image" />
            )}
            <div className="content">{m.content}{m.streaming && <span className="cursor" />}</div>
          </div>
        ))}
      </div>

      <div className="input-area">
        {imagePreview && (
          <div className="image-preview">
            <img src={imagePreview} alt="Preview" />
            <button className="remove-image" onClick={removeImage} title="Remove image">&times;</button>
          </div>
        )}
        <div className="input-row">
          {model.vision && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                hidden
              />
              <button
                className="attach-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={streaming || !isReady}
                title="Attach image"
              >
                📷
              </button>
            </>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendPrompt();
              }
            }}
            placeholder={model.vision ? "Ask about an image or chat…" : "Type your prompt…"}
            rows={2}
            disabled={streaming || !isReady}
          />
          <button
            onClick={sendPrompt}
            disabled={!input.trim() || streaming || !isReady}
          >
            {streaming ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
