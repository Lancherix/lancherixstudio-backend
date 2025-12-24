import express from "express";
import BoardImage from "../models/BoardImage.js";
import upload from "../middleware/upload.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/* ─────────────────────────────
   GET board images
   GET /api/projects/:projectId/board-images
───────────────────────────── */
router.get(
  "/projects/:projectId/board-images",
  authMiddleware,
  async (req, res) => {
    try {
      const images = await BoardImage.find({
        project: req.params.projectId,
      }).sort({ position: 1, createdAt: 1 });

      res.json(images);
    } catch (err) {
      console.error("Fetch board images error:", err);
      res.status(500).json({ error: "Failed to fetch board images" });
    }
  }
);

/* ─────────────────────────────
   POST upload board images
   POST /api/projects/:projectId/board-images
───────────────────────────── */
router.post(
  "/projects/:projectId/board-images",
  authMiddleware,
  upload.array("images"),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No images uploaded" });
      }

      const projectId = req.params.projectId;
      const userId = req.user.id;

      const imagesToSave = req.files.map(file => ({
        project: projectId,

        // multer-storage-cloudinary already uploaded it
        url: file.path,              // secure_url
        public_id: file.public_id,   // IMPORTANT

        uploadedBy: userId,
        position: Date.now(),
      }));

      const savedImages = await BoardImage.insertMany(imagesToSave);
      res.status(201).json(savedImages);
    } catch (err) {
      console.error("Board image upload error:", err);
      res.status(500).json({ error: "Image upload failed" });
    }
  }
);

/* ─────────────────────────────
   DELETE board image
   DELETE /api/board-images/:imageId
───────────────────────────── */
router.delete(
  "/board-images/:imageId",
  authMiddleware,
  async (req, res) => {
    try {
      const image = await BoardImage.findById(req.params.imageId);
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }

      await image.deleteOne();
      res.json({ success: true });
    } catch (err) {
      console.error("Delete board image error:", err);
      res.status(500).json({ error: "Delete failed" });
    }
  }
);

export default router;