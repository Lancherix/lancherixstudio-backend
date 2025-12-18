// routes/admin.js
import express from "express";
import { cleanupOrphanProfilePictures } from "../utils/cleanupProfilePictures.js";

const router = express.Router();

router.post("/cleanup-profile-pictures", async (req, res) => {
  try {
    await cleanupOrphanProfilePictures();
    res.json({ message: "Cleanup completed" });
  } catch (err) {
    res.status(500).json({ message: "Cleanup failed" });
  }
});

export default router;