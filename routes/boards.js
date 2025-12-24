import express from "express";
import Board from "../models/Board.js";
import Project from "../models/Project.js";
import authMiddleware from "../middleware/auth.js";
import boardUpload from "../middleware/boardUpload.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

router.get("/project/:projectId", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const canAccess =
      project.owner.toString() === userId ||
      project.collaborators.some(id => id.toString() === userId);

    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    let board = await Board.findOne({ project: projectId });

    if (!board) {
      board = await Board.create({ project: projectId, images: [] });
    }

    res.json(board);
  } catch (err) {
    console.error("Get board error:", err);
    res.status(500).json({ error: "Failed to fetch board" });
  }
});

router.post(
  "/project/:projectId/image",
  authMiddleware,
  boardUpload.single("image"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const canAccess =
        project.owner.toString() === userId ||
        project.collaborators.some(id => id.toString() === userId);

      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const board = await Board.findOneAndUpdate(
        { project: projectId },
        {
          $push: {
            images: {
              url: req.file.path,
              public_id: req.file.filename,
            },
          },
        },
        { new: true, upsert: true }
      );

      res.json(board);
    } catch (err) {
      console.error("Upload board image error:", err);
      res.status(500).json({ error: "Image upload failed" });
    }
  }
);

router.delete("/image/:imageId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const board = await Board.findOne({ "images._id": req.params.imageId });
    if (!board) return res.status(404).json({ error: "Image not found" });

    const project = await Project.findById(board.project);

    const canAccess =
      project.owner.toString() === userId ||
      project.collaborators.some(id => id.toString() === userId);

    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const image = board.images.id(req.params.imageId);

    await cloudinary.uploader.destroy(image.public_id);

    image.remove();
    await board.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Delete board image error:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

export default router;