import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import generationsRouter from "./routes/generations";
import projectsRouter from "./routes/projects";
import imageProxyRouter from "./routes/image-proxy";

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  }),
);
app.use(express.json());

app.use("/generations", generationsRouter);
app.use("/projects", projectsRouter);
app.use("/api/image", imageProxyRouter);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "backend",
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
