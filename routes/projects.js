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

    const isOwner = project.owner._id.toString() === userId;
    const isCollaborator = project.collaborators.some(
      u => u._id.toString() === userId
    );

    if (project.visibility === "public") {
      return res.json(project);
    }

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(project);
  } catch (err) {
    console.error("Fetch project error:", err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// PATCH /api/projects/:projectId/links
router.patch("/:projectId/links", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { links } = req.body; // se espera un array de strings
    const userId = req.user.id;

    if (!Array.isArray(links)) {
      return res.status(400).json({ error: "Links must be an array" });
    }

    // Validar que el usuario tenga permisos (owner o collaborator)
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const isOwner = project.owner.toString() === userId;
    const isCollaborator = project.collaborators.some(id => id.toString() === userId);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Guardar el array de links
    project.links = links;
    await project.save();

    res.json(project);
  } catch (err) {
    console.error("Update links error:", err);
    res.status(500).json({ error: "Failed to update links" });
  }
});

/* ─────────────────────────────
   Update project
   ───────────────────────────── */
router.patch("/:projectId", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const isOwner = project.owner.toString() === userId;
    const isCollaborator = project.collaborators.some(id => id.toString() === userId);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "Access denied" });
    }

    const allowedFields = [
      "name",
      "icon",
      "visibility",
      "subject",
      "deadline",
      "priority",
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    });

    if (Array.isArray(req.body.collaborators)) {
      const oldCollaborators = project.collaborators.map(id => id.toString());

      // Evitar duplicados y owner incluido
      const newCollaborators = req.body.collaborators
        .filter(id => id !== project.owner.toString())
        .filter((id, idx, arr) => arr.indexOf(id) === idx);

      // Validar que todos los IDs existan
      const usersCount = await User.countDocuments({ _id: { $in: newCollaborators } });
      if (usersCount !== newCollaborators.length) {
        return res.status(400).json({ error: "Invalid collaborator detected" });
      }

      project.collaborators = newCollaborators;

      // === Agregar proyecto a usuarios nuevos ===
      const added = newCollaborators.filter(id => !oldCollaborators.includes(id));
      if (added.length > 0) {
        await User.updateMany(
          { _id: { $in: added } },
          { $addToSet: { projects: project._id } }
        );
      }

      // === Remover proyecto de usuarios eliminados ===
      const removed = oldCollaborators.filter(id => !newCollaborators.includes(id));
      if (removed.length > 0) {
        await User.updateMany(
          { _id: { $in: removed } },
          { $pull: { projects: project._id } }
        );
      }
    }

    await project.save();
    res.json(project);
  } catch (err) {
    console.error("Update project error:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

/* ─────────────────────────────
   Leave project
   ───────────────────────────── */
router.post("/:projectId/leave", authMiddleware, async (req, res) => {
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

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "You are not a member of this project" });
    }

    // ─── Remove project from user ───────────────────
    await User.findByIdAndUpdate(userId, {
      $pull: { projects: project._id }
    });

    // ─── CASE 1: Collaborator leaves ────────────────
    if (!isOwner) {
      project.collaborators = project.collaborators.filter(
        id => id.toString() !== userId
      );

      await project.save();
      return res.json({ message: "Left project successfully", project });
    }

    // ─── CASE 2: Owner leaves ───────────────────────
    if (project.collaborators.length > 0) {
      // Assign new owner
      const newOwnerId = project.collaborators[0];

      project.owner = newOwnerId;
      project.collaborators = project.collaborators
        .filter(id => id.toString() !== newOwnerId.toString());

      await project.save();
      return res.json({
        message: "Owner left project, ownership transferred",
        project,
      });
    }

    // ─── CASE 3: Owner leaves and no members left ───
    await Project.findByIdAndDelete(project._id);

    return res.json({
      message: "Project deleted because no members remained",
      deleted: true,
    });

  } catch (err) {
    console.error("Leave project error:", err);
    res.status(500).json({ error: "Failed to leave project" });
  }
});

router.post("/:projectId/remove-member", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { memberId } = req.body;
    const userId = req.user.id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.owner.toString() !== userId) {
      return res.status(403).json({ error: "Only owner can remove members" });
    }

    project.collaborators = project.collaborators.filter(
      id => id.toString() !== memberId
    );

    await project.save();

    // === remover proyecto del usuario eliminado ===
    await User.findByIdAndUpdate(memberId, {
      $pull: { projects: project._id }
    });

    res.json(project);

  } catch (err) {
    console.error("Remove member error:", err);
    res.status(500).json({ error: "Failed to remove member" });
  }
});

export default router;