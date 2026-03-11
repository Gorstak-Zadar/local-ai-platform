import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const API_BASE = import.meta.env.DEV ? "http://localhost:3000" : "";
const WS_BASE = import.meta.env.DEV ? "ws://localhost:3000" : (() => {
  const u = new URL(window.location.href);
  return `${u.protocol === "https:" ? "wss:" : "ws:"}//${u.host}`;
})();

const BROWSER_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

function App() {
  const [mode, setMode] = useState("browser"); // "browser" | "worker"
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState("loading");
  const [browserModelProgress, setBrowserModelProgress] = useState(0);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const wsRef = useRef(null);
  const engineRef = useRef(null);
  const streamBufferRef = useRef("");

  const isReady = status === "ready" || status === "browser-ready";

  const fetchSession = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("session");
    if (fromUrl) {
      setSessionId(fromUrl);
      return fromUrl;
    }
    try {
      const r = await fetch(`${API_BASE}/api/session`);
      const { sessionId: sid } = await r.json();
      setSessionId(sid);
      return sid;
    } catch (e) {
      setStatus("error");
      return null;
    }
  }, []);

  const fetchCatalog = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/catalog`);
      const { models: m } = await r.json();
      setModels(m || []);
      if (m?.length && !selectedModel) setSelectedModel(m[0].id);
    } catch {
      setModels([]);
    }
  }, [selectedModel]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const initBrowserEngine = useCallback(async () => {
    if (engineRef.current) return engineRef.current;
    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const engine = await CreateMLCEngine(BROWSER_MODEL, {
        initProgressCallback: (p) => {
          setBrowserModelProgress(Math.round((p.progress || 0) * 100));
        },
      });
      engineRef.current = engine;
      setStatus("browser-ready");
      return engine;
    } catch (e) {
      setStatus("browser-error");
      throw e;
    }
  }, []);

  useEffect(() => {
    if (mode === "browser" && status === "loading") {
      setStatus("browser-loading");
      initBrowserEngine().catch(() => {});
    }
  }, [mode, status, initBrowserEngine]);

  useEffect(() => {
    if (mode === "worker") {
      setStatus("loading");
      fetchSession();
    }
  }, [mode, fetchSession]);

  const connectBrowser = useCallback((sid) => {
    if (!sid) return;
    const ws = new WebSocket(`${WS_BASE}/?role=browser&sessionId=${sid}`);
    ws.onopen = () => setStatus("ready");
    ws.onclose = () => {
      setStatus("no-worker");
      setStreaming(false);
    };
    ws.onerror = () => setStatus("error");
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "token") {
          streamBufferRef.current += msg.text || "";
          setStreaming(true);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.streaming) {
              return prev.slice(0, -1).concat({ ...last, content: streamBufferRef.current });
            }
            return prev.concat({ role: "assistant", content: streamBufferRef.current, streaming: true });
          });
        } else if (msg.type === "done") {
          setStreaming(false);
          streamBufferRef.current = "";
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.streaming) {
              return prev.slice(0, -1).concat({ ...last, content: last.content, streaming: false });
            }
            return prev;
          });
        } else if (msg.type === "error") {
          setStreaming(false);
          setMessages((prev) =>
            prev.concat({ role: "assistant", content: `Error: ${msg.error || "Unknown"}`, error: true })
          );
        }
      } catch {}
    };
    wsRef.current = ws;
  }, []);

  useEffect(() => {
    if (mode === "worker" && sessionId && status === "loading") connectBrowser(sessionId);
  }, [mode, sessionId, status, connectBrowser]);

  const sendViaBrowser = useCallback(async (text, history) => {
    const engine = engineRef.current;
    if (!engine) return;
    const msgs = (history || []).map((m) => ({ role: m.role, content: m.content }));
    msgs.push({ role: "user", content: text });
    setStreaming(true);
    setMessages((prev) => prev.concat({ role: "assistant", content: "", streaming: true }));
    let full = "";
    try {
      const stream = await engine.chat.completions.create({
        messages: msgs,
        stream: true,
        max_tokens: 0,
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
      if (last?.streaming) return prev.slice(0, -1).concat({ ...last, content: full || last.content, streaming: false });
      return prev;
    });
  }, []);

  const sendViaWorker = useCallback((text, history) => {
    if (!wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(
      JSON.stringify({
        type: "prompt",
        prompt: text,
        modelId: selectedModel,
        history: (history || []).slice(-10),
      })
    );
  }, [selectedModel]);

  const sendPrompt = () => {
    const text = input.trim();
    if (!text || streaming) return;
    const history = messages
      .filter((m) => m.role === "user" || (m.role === "assistant" && !m.streaming))
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => prev.concat({ role: "user", content: text }));
    setInput("");
    if (mode === "browser" && status === "browser-ready") {
      sendViaBrowser(text, history);
    } else if (mode === "worker" && status === "ready") {
      sendViaWorker(text, history);
    }
  };

  const statusText = {
    loading: "Connecting…",
    ready: "Worker connected — Ready",
    "no-worker": "Full mode — Start worker",
    error: "Connection error",
    "browser-loading": `Loading model… ${browserModelProgress}%`,
    "browser-ready": "Quick mode — Ready",
    "browser-error": "WebGPU not supported — Use Full mode",
  };

  return (
    <div className="app">
      <header>
        <h1>Local AI</h1>
        <p>Free · Unlimited · Your Hardware</p>
        <div className="status">
          {(status === "ready" || status === "browser-ready") && <span className="dot ok" />}
          {(status === "loading" || status === "browser-loading") && <span className="dot pulse" />}
          {(status === "no-worker" || status === "browser-error") && <span className="dot warn" />}
          {status === "error" && <span className="dot err" />}
          <span>{statusText[status] ?? status}</span>
        </div>
        <div className="mode-toggle">
          <button
            className={mode === "browser" ? "active" : ""}
            onClick={() => setMode("browser")}
          >
            Quick
          </button>
          <button
            className={mode === "worker" ? "active" : ""}
            onClick={() => setMode("worker")}
          >
            Full
          </button>
        </div>
        {mode === "browser" && status === "browser-ready" && (
          <p className="mode-hint">Runs in your browser. Need more power? Use Full mode.</p>
        )}
        {mode === "worker" && status !== "ready" && (
          <div className="setup-box">
            <p><strong>Full mode:</strong></p>
            <p>1. Install <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">Ollama</a>, run <code>ollama pull llama3.2:3b</code></p>
            <p>2. <a href="https://github.com/Gorstak-Zadar/local-ai-platform/archive/refs/heads/master.zip">Download</a> the app, unzip, run <strong>launcher.bat</strong></p>
          </div>
        )}
      </header>

      {mode === "worker" && (
        <div className="controls">
          <select value={selectedModel || ""} onChange={(e) => setSelectedModel(e.target.value)}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="chat">
        {messages.length === 0 && (
          <div className="empty">
            <p>Type anything. No limits. Your machine does the work.</p>
            <p className="sub">{mode === "browser" ? "Quick mode runs in-browser (no install). Full mode uses more powerful models." : "Code, essays, ideas — all local."}</p>
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
