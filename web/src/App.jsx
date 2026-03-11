import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// Largest practical browser model: 3B params, ~2.3GB VRAM, works on most GPUs
const MODEL = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

function App() {
  const [status, setStatus] = useState("loading");
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const engineRef = useRef(null);

  const isReady = status === "ready";

  const initEngine = useCallback(async () => {
    if (engineRef.current) return engineRef.current;
    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const engine = await CreateMLCEngine(MODEL, {
        initProgressCallback: (p) => {
          setProgress(Math.round((p.progress || 0) * 100));
        },
      });
      engineRef.current = engine;
      setStatus("ready");
      return engine;
    } catch (e) {
      setStatus("error");
      throw e;
    }
  }, []);

  useEffect(() => {
    setStatus("loading");
    initEngine().catch(() => {});
  }, [initEngine]);

  const sendPrompt = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !engineRef.current) return;

    const history = messages
      .filter((m) => m.role === "user" || (m.role === "assistant" && !m.streaming))
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => prev.concat({ role: "user", content: text }));
    setInput("");
    setMessages((prev) => prev.concat({ role: "assistant", content: "", streaming: true }));
    setStreaming(true);

    let full = "";
    try {
      const msgs = [...history, { role: "user", content: text }];
      const stream = await engineRef.current.chat.completions.create({
        messages: msgs,
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
  }, [input, streaming, messages]);

  const statusText = {
    loading: `Loading model… ${progress}%`,
    ready: "Ready",
    error: "WebGPU not supported — Try a different browser",
  };

  return (
    <div className="app">
      <header>
        <h1>Local AI</h1>
        <p>Free · Unlimited · Your Hardware</p>
        <div className="status">
          {status === "ready" && <span className="dot ok" />}
          {status === "loading" && <span className="dot pulse" />}
          {status === "error" && <span className="dot err" />}
          <span>{statusText[status] ?? status}</span>
        </div>
        {status === "ready" && (
          <p className="mode-hint">Runs in your browser. No install. Model streams on first use.</p>
        )}
      </header>

      <div className="chat">
        {messages.length === 0 && (
          <div className="empty">
            <p>Type anything. No limits. Your machine does the work.</p>
            <p className="sub">Code, essays, ideas — all local.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role} ${m.error ? "error" : ""}`}>
            <span className="role">{m.role}</span>
            <div className="content">{m.content}{m.streaming && <span className="cursor" />}</div>
          </div>
        ))}
      </div>

      <div className="input-row">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendPrompt();
            }
          }}
          placeholder="Type your prompt…"
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
  );
}

export default App;
