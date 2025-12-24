import express from "express";
import BoardImage from "../models/BoardImage.js";
import Project from "../models/Project.js";
import authMiddleware from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

/* ─────────────────────────────
   Upload images to project board
   POST /api/projects/:projectId/board-images
   ───────────────────────────── */
router.post(
  "/projects/:projectId/board-images",
  authMiddleware,
  upload.array("images"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const isAllowed =
        project.owner.toString() === userId ||
        project.collaborators.some(id => id.toString() === userId);

      if (!isAllowed) {
        return res.status(403).json({ error: "Access denied" });
      }

      const uploadedImages = [];

      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: `project_boards/${projectId}`,
        });

        const image = await BoardImage.create({
          project: projectId,
          url: result.secure_url,
          public_id: result.public_id,
          uploadedBy: userId,
          position: Date.now(),
        });

        uploadedImages.push(image);
      }

      res.status(201).json(uploadedImages);
    } catch (err) {
      console.error("Board image upload error:", err);
      res.status(500).json({ error: "Failed to upload images" });
    }
  }
);

/* ─────────────────────────────
   Get project board images
   GET /api/projects/:projectId/board-images
   ───────────────────────────── */
router.get(
  "/projects/:projectId/board-images",
  authMiddleware,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const isAllowed =
        project.visibility === "public" ||
        project.owner.toString() === userId ||
        project.collaborators.some(id => id.toString() === userId);

      if (!isAllowed) {
        return res.status(403).json({ error: "Access denied" });
      }

      const images = await BoardImage.find({ project: projectId })
        .sort({ position: 1 });

      res.json(images);
    } catch (err) {
      console.error("Fetch board images error:", err);
      res.status(500).json({ error: "Failed to fetch images" });
    }
  }
);

/* ─────────────────────────────
   Delete board image
   DELETE /api/board-images/:imageId
   ───────────────────────────── */
router.delete(
  "/board-images/:imageId",
  authMiddleware,
  async (req, res) => {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;

      const image = await BoardImage.findById(imageId);
      if (!image) return res.status(404).json({ error: "Image not found" });

      const project = await Project.findById(image.project);

      const isAllowed =
        project.owner.toString() === userId ||
        project.collaborators.some(id => id.toString() === userId);

      if (!isAllowed) {
        return res.status(403).json({ error: "Access denied" });
      }

      await cloudinary.uploader.destroy(image.public_id);
      await image.deleteOne();

      res.json({ message: "Image deleted" });
    } catch (err) {
      console.error("Delete board image error:", err);
      res.status(500).json({ error: "Failed to delete image" });
    }
  }
);

export default router;