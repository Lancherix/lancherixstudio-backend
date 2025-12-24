import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import projectsRoutes from "./routes/projects.js";
import tasksRoutes from "./routes/tasks.js";
import notesRoutes from "./routes/notes.js";
import boardImagesRoutes from "./routes/boardImages.js";

dotenv.config();

const app = express();

// ─── Middlewares ─────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://studio.lancherix.com",
    ],
    credentials: true,
  })
);

// ─── Routes ──────────────────────────────────
app.use("/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api", boardImagesRoutes);

// ─── Test ────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// ─── DB ──────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(console.error);

// ─── Server ──────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);