import express from "express";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/", auth, async (req, res) => {
  try {
    const { projectId, name, priority, due } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Task name required" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Permission check
    const isMember =
      project.owner.equals(req.user.id) ||
      project.collaborators.includes(req.user.id);

    if (!isMember) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const lastTask = await Task.find({ project: projectId })
      .sort({ order: -1 })
      .limit(1);

    const task = await Task.create({
      project: projectId,
      creator: req.user.id,
      name,
      priority,
      due,
      order: lastTask[0]?.order + 1 || 0,
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.get("/project/:projectId", auth, async (req, res) => {
  try {
    const tasks = await Task.find({
      project: req.params.projectId,
    }).sort({ order: 1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.patch("/:id/complete", auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    task.completed = !task.completed;
    await task.save();

    res.json(task);
  } catch {
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.patch("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(task);
  } catch {
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete task" });
  }
});