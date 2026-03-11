import express from "express";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

// Serve static web app from ../web/dist (after build)
const webDist = join(__dirname, "..", "web", "dist");
app.use(express.static(webDist));

// SPA fallback (must be last)
app.get("*", (req, res) => {
  res.sendFile(join(webDist, "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
