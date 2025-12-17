// routes/users.js
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import upload from "../middleware/upload.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// Middleware to verify token
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token provided" });

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// UPDATE USER
router.put("/users", auth, async (req, res) => {
  try {
    const {
      email,
      fullName,
      month,
      date,
      year,
      gender,
      sideMenuColor,
      themeMode,
      profilePicture,
      wallpaper
    } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      {
        email,
        fullName,
        month,
        date,
        year,
        gender,
        sideMenuColor,
        themeMode,
        profilePicture,
        wallpaper
      },
      { new: true }
    ).select("-passwordHash");

    res.json({ message: "User updated", updated });

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET user by username (public)
router.get("/users", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ message: "Username is required" });

    const user = await User.findOne({ username }).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/users/search?query=...
router.get("/users/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]); // empty query returns empty array

    // Case-insensitive search by username or fullName
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { fullName: { $regex: query, $options: "i" } }
      ]
    }).select("-passwordHash");

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post(
  "/users/profile-picture",
  auth,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // 🧹 borrar imagen anterior (safe)
      if (user.profilePictureId) {
        try {
          await cloudinary.uploader.destroy(user.profilePictureId);
        } catch (err) {
          console.warn("Cloudinary delete failed:", err.message);
        }
      }

      // 💾 guardar nueva
      user.profilePicture = req.file.path;      // secure_url
      user.profilePictureId = req.file.filename; // public_id

      await user.save();

      res.json({
        profilePicture: user.profilePicture,
      });

    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;