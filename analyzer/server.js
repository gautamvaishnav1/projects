import express from "express";
import cors from "cors";
import { acquireRepoWithFallback } from "./src/fetch-repo.js";
import { analyzeRepo } from "./src/city.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "16kb" }));

const inFlight = new Set();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "codecity-analyzer", busy: inFlight.size });
});

app.post("/api/analyze", async (req, res) => {
  const { repoUrl, localPath } = req.body ?? {};
  if (!repoUrl && !localPath) {
    return res.status(400).json({ error: "send { repoUrl: 'https://github.com/owner/repo' } or { localPath: 'C:/path/to/repo' }" });
  }
  if (inFlight.size >= 2) {
    return res.status(429).json({ error: "analyzer busy — try again shortly" });
  }
  const job = Math.random().toString(36).slice(2);
  inFlight.add(job);
  let acquired = null;
  try {
    acquired = await acquireRepoWithFallback({ repoUrl, localPath });
    const { city, stats } = await analyzeRepo(acquired.dir, acquired.name);
    res.json({ ...city, _meta: { source: acquired.source, stats } });
  } catch (e) {
    console.error("[analyze]", e.message);
    res.status(400).json({ error: e.message });
  } finally {
    inFlight.delete(job);
    if (acquired?.cleanup) await acquired.cleanup().catch(() => {});
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`🏙 codecity-analyzer listening on http://localhost:${PORT}`);
});
