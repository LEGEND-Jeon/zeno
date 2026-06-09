import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  const { url } = req.query;

  if (typeof url !== "string" || !url) {
    return res.status(400).json({ ok: false, message: "url query param required" });
  }

  try {
    const upstream = await fetch(url);

    if (!upstream.ok) {
      return res.status(502).json({ ok: false, message: "upstream fetch failed" });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    return res.end(Buffer.from(buffer));
  } catch {
    return res.status(502).json({ ok: false, message: "failed to fetch image" });
  }
});

export default router;
