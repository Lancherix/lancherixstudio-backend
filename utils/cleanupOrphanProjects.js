import Project from "../models/Project.js";
import Board from "../models/Board.js";
import Task from "../models/Task.js";
import Note from "../models/Note.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";

export async function cleanupOrphanProjects() {
  // ─── Get all valid project IDs ───────────────────
  const projects = await Project.find({}, "_id").lean();
  const validProjectIds = new Set(projects.map(p => p._id.toString()));

  /* ─────────────────────────────
     Boards
  ───────────────────────────── */
  const boards = await Board.find().lean();

  for (const board of boards) {
    if (!validProjectIds.has(board.project.toString())) {
      // delete cloudinary images
      for (const img of board.images) {
        try {
          await cloudinary.uploader.destroy(img.public_id);
        } catch (err) {
          console.error("Cloudinary cleanup failed:", err);
        }
      }

      await Board.deleteOne({ _id: board._id });
    }
  }

  /* ─────────────────────────────
     Tasks
  ───────────────────────────── */
  await Task.deleteMany({
    project: { $nin: Array.from(validProjectIds) },
  });

  /* ─────────────────────────────
     Notes
  ───────────────────────────── */
  await Note.deleteMany({
    project: { $nin: Array.from(validProjectIds) },
  });

  /* ─────────────────────────────
     Users
  ───────────────────────────── */
  const users = await User.find({ projects: { $exists: true } });

  for (const user of users) {
    const cleanedProjects = user.projects.filter(p =>
      validProjectIds.has(p.toString())
    );

    if (cleanedProjects.length !== user.projects.length) {
      user.projects = cleanedProjects;
      await user.save();
    }
  }

  console.log("🧹 Orphan project cleanup completed");
}