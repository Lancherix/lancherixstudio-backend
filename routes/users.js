// routes/users.js
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import cloudinary from "../config/cloudinary.js";
import { cleanupUnusedProfilePictures } from "../utils/cleanupProfilePictures.js";
import multer from "multer";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

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

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Actualizar solo campos enviados
    if (email) user.email = email;
    if (fullName) user.fullName = fullName;
    if (month) user.month = month;
    if (date) user.date = date;
    if (year) user.year = year;
    if (gender) user.gender = gender;
    if (sideMenuColor) user.sideMenuColor = sideMenuColor;
    if (themeMode) user.themeMode = themeMode;
    if (wallpaper) user.wallpaper = wallpaper;
    if (profilePicture) user.profilePicture = profilePicture; // ⬅️ clave

    await user.save();

    res.json({ message: "User updated", updated: user });

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

// routes/users.js
router.post(
  "/users/profile-picture",
  auth,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = await User.findById(req.user.id);

      if (user.profilePicture?.public_id) {
        await cloudinary.uploader.destroy(user.profilePicture.public_id);
      }

      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "profile_pictures",
      });

      user.profilePicture = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id
      };

      await user.save();
      cleanupUnusedProfilePictures();

      res.json(user.profilePicture);

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Upload failed" });
    }
  }
);

router.delete('/users/profile-picture', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.profilePicture?.public_id) {
      await cloudinary.uploader.destroy(user.profilePicture.public_id);
      user.profilePicture = undefined;
      await user.save();
    }

    cleanupUnusedProfilePictures();
    res.json({ message: 'Profile picture removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to remove profile picture' });
  }
});

router.post(
  "/users/wallpaper",
  auth,
  upload.single("wallpaper"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Delete old wallpaper from Cloudinary if it exists
      if (user.wallpaper?.public_id) {
        await cloudinary.uploader.destroy(user.wallpaper.public_id);
      }

      // Upload new wallpaper to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "wallpapers" },
        async (error, result) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ message: "Cloudinary upload failed" });
          }

          user.wallpaper = {
            url: result.secure_url,
            public_id: result.public_id,
          };

          await user.save();
          res.json(user.wallpaper);
        }
      );

      // Pipe the file buffer into Cloudinary
      uploadStream.end(req.file.buffer);

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Upload failed" });
    }
  }
);

export default router;