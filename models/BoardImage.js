// routes/boardImages.js
import express from "express";
import BoardImage from "../models/BoardImage.js";
import Project from "../models/Project.js";
import authMiddleware from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

const router = express.Router();

/* ─────────────────────────────
   GET board images
───────────────────────────── */
router.get(
  "/projects/:projectId/board-images",
  authMiddleware,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const isOwner = project.owner.toString() === userId;
      const isCollaborator = project.collaborators.some(
        id => id.toString() === userId
      );

      if (!isOwner && !isCollaborator && project.visibility !== "public") {
        return res.status(403).json({ error: "Access denied" });
      }

      const images = await BoardImage.find({ project: projectId })
        .sort({ position: 1, createdAt: 1 });

      res.json(images);
    } catch (err) {
      console.error("Fetch board images error:", err);
      res.status(500).json({ error: "Failed to fetch board images" });
    }
  }
);

/* ─────────────────────────────
   UPLOAD board images
───────────────────────────── */
router.post(
  "/projects/:projectId/board-images",
  authMiddleware,
  upload.array("images"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No images uploaded" });
      }

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const isOwner = project.owner.toString() === userId;
      const isCollaborator = project.collaborators.some(id => id.toString() === userId);
      if (!isOwner && !isCollaborator) return res.status(403).json({ error: "Access denied" });

      const savedImages = [];

      // ───── Aquí reemplazas el bucle antiguo ─────
      for (const file of req.files) {
        const streamUpload = (fileBuffer) => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "boards" },
              (error, result) => {
                if (result) resolve(result);
                else reject(error);
              }
            );
            streamifier.createReadStream(fileBuffer).pipe(stream);
          });
        };

        const uploadResult = await streamUpload(file.buffer);

        const image = await BoardImage.create({
          project: projectId,
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          uploadedBy: userId,
          position: Date.now(),
        });

        savedImages.push(image);
      }

      res.status(201).json(savedImages);

    } catch (err) {
      console.error("Upload board image error:", err);
      res.status(500).json({ error: "Image upload failed" });
    }
  }
);

/* ─────────────────────────────
   DELETE board image
───────────────────────────── */
router.delete(
  "/board-images/:imageId",
  authMiddleware,
  async (req, res) => {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;

      const image = await BoardImage.findById(imageId);
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }

      const project = await Project.findById(image.project);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const isOwner = project.owner.toString() === userId;
      const isUploader = image.uploadedBy.toString() === userId;

      if (!isOwner && !isUploader) {
        return res.status(403).json({ error: "Access denied" });
      }

      await cloudinary.uploader.destroy(image.public_id);
      await image.deleteOne();

      res.json({ success: true });
    } catch (err) {
      console.error("Delete board image error:", err);
      res.status(500).json({ error: "Failed to delete image" });
    }
  }
);

export default router;