import express from "express";
import Note from "../models/Note.js";
import authMiddleware from "../middleware/auth.js";
import Project from "../models/Project.js";

const router = express.Router();

// Obtener la nota de un proyecto
router.get("/project/:projectId", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Chequear permisos
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user.id;
    const isOwner = project.owner.toString() === userId;
    const isCollaborator = project.collaborators.some(
      (c) => c.toString() === userId
    );

    if (project.visibility === "private" && !isOwner && !isCollaborator) {
      return res.status(403).json({ error: "Access denied" });
    }

    let note = await Note.findOne({ project: projectId });
    if (!note) {
      note = new Note({ project: projectId });
      await note.save();
    }

    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

// Crear / actualizar nota
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { projectId, content } = req.body;
    if (!projectId) return res.status(400).json({ error: "Project ID required" });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user.id;
    const isOwner = project.owner.toString() === userId;
    const isCollaborator = project.collaborators.some(
      (c) => c.toString() === userId
    );

    if (project.visibility === "private" && !isOwner && !isCollaborator) {
      return res.status(403).json({ error: "Access denied" });
    }

    let note = await Note.findOne({ project: projectId });
    if (!note) {
      note = new Note({ project: projectId, content });
    } else {
      note.content = content;
      note.updatedAt = Date.now();
    }

    await note.save();
    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save note" });
  }
});

// Borrar nota (opcional)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });

    const project = await Project.findById(note.project);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user.id;
    const isOwner = project.owner.toString() === userId;
    if (!isOwner) return res.status(403).json({ error: "Only owner can delete note" });

    await note.deleteOne();
    res.json({ message: "Note deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

export default router;