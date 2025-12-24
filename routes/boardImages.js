import express from "express";
import BoardImage from "../models/BoardImage.js";
import upload from "../middleware/upload.js";

const router = express.Router();

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
    console.error("GET board images error:", err);
    res.status(500).json({ error: "Failed to fetch board images" });
  }
});

/* ─────────────────────────────
   POST upload images (Cloudinary)
───────────────────────────── */
router.post(
  "/projects/:projectId/board-images",
  upload.array("images"),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No images uploaded" });
      }

      const projectId = req.params.projectId;

      // TEMP user (replace with auth later)
      const userId = "000000000000000000000000";

      const images = await BoardImage.insertMany(
        req.files.map(file => ({
          project: projectId,
          url: file.path,            // ✅ Cloudinary URL
          public_id: file.public_id, // ✅ REQUIRED
          uploadedBy: userId,
          position: Date.now(),
        }))
      );

      res.status(201).json(images);
    } catch (err) {
      console.error("UPLOAD error:", err);
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
    console.error("DELETE error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;