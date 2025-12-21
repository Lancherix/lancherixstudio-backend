import express from "express";
import Project from "../models/Project.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/* ─────────────────────────────
   Create project
   ───────────────────────────── */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      name,
      icon,
      visibility,
      subject,
      deadline,
      priority,
      collaborators = [],
    } = req.body;

    if (!name) return res.status(400).json({ error: "Project name is required" });

    const ownerId = req.user.id;

    // Remove owner from collaborators if sent
    const uniqueCollaborators = [...new Set(collaborators.filter(id => id !== ownerId))];

    // Ensure all collaborators exist
    const usersCount = await User.countDocuments({ _id: { $in: uniqueCollaborators } });
    if (usersCount !== uniqueCollaborators.length) {
      return res.status(400).json({ error: "Invalid collaborator detected" });
    }

    // Generate unique slug
    let baseSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!baseSlug) baseSlug = "-";
    let slug = baseSlug;
    let counter = 1;
    while (await Project.exists({ slug })) slug = `${baseSlug}-${counter++}`;

    // Create project
    const project = await Project.create({
      name,
      icon,
      visibility,
      subject,
      deadline,
      priority,
      slug,
      owner: ownerId,
      collaborators: uniqueCollaborators,
    });

    // Add project ID to owner's projects
    await User.findByIdAndUpdate(ownerId, { $push: { projects: project._id } });

    // Add project ID to collaborators' projects
    if (uniqueCollaborators.length > 0) {
      await User.updateMany(
        { _id: { $in: uniqueCollaborators } },
        { $push: { projects: project._id } }
      );
    }

    res.status(201).json(project);

  } catch (err) {
    console.error("Create project error:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

/* ─────────────────────────────
   Get user's projects
   ───────────────────────────── */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await Project.find({
      $or: [
        { owner: userId },
        { collaborators: userId },
      ],
    })
      .sort({ updatedAt: -1 })
      .populate("owner", "username")
      .populate("collaborators", "username");

    res.json(projects);
  } catch (err) {
    console.error("Fetch projects error:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

/* ─────────────────────────────
   Get single project by slug
   ───────────────────────────── */
router.get("/:slug", authMiddleware, async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user.id;

    const project = await Project.findOne({ slug })
      .populate("owner", "username fullName profilePicture")
      .populate("collaborators", "username fullName profilePicture");

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Permission check
    const isOwner = project.owner._id.toString() === userId;
    const isCollaborator = project.collaborators.some(
      u => u._id.toString() === userId
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(project);
  } catch (err) {
    console.error("Fetch project error:", err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

export default router;