import express from "express";
import multer from "multer";
import BoardImage from "../models/BoardImage.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/* ─────────────────────────────
   GET board images
───────────────────────────── */
router.get("/projects/:projectId/board-images", async (req, res) => {
  try {
    const images = await BoardImage.find({
      project: req.params.projectId,
    }).sort({ position: 1, createdAt: 1 });

    res.json(images);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch board images" });
  }
});

/* ─────────────────────────────
   POST upload images
───────────────────────────── */
router.post(
  "/projects/:projectId/board-images",
  upload.array("images"),
  async (req, res) => {
    try {
      if (!req.files?.length) {
        return res.status(400).json({ error: "No images uploaded" });
      }

      // TEMP: replace later with real auth middleware
      const userId = req.user?._id || "000000000000000000000000";

      const savedImages = [];

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        const image = await BoardImage.create({
          project: req.params.projectId,
          url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
          public_id: `local-${Date.now()}-${i}`,
          uploadedBy: userId,
          position: Date.now(),
        });

        savedImages.push(image);
      }

      res.status(201).json(savedImages);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Image upload failed" });
    }
  }
);

/* ─────────────────────────────
   DELETE image
───────────────────────────── */
router.delete("/board-images/:id", async (req, res) => {
  try {
    await BoardImage.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;