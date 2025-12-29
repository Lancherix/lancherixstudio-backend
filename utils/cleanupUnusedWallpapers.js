import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";

export const cleanupUnusedWallpapers = async () => {
  try {
    // 1️⃣ Get all wallpaper public_ids currently in use
    const users = await User.find({}, "wallpaper");
    const usedIds = users
      .map(u => u.wallpaper?.public_id)
      .filter(Boolean);

    // 2️⃣ List all wallpapers stored in Cloudinary
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: "wallpapers",
      max_results: 500,
    });

    // 3️⃣ Delete unused wallpapers
    for (const img of result.resources) {
      if (!usedIds.includes(img.public_id)) {
        await cloudinary.uploader.destroy(img.public_id);
        console.log("Deleted unused wallpaper:", img.public_id);
      }
    }
  } catch (err) {
    console.error("Error cleaning up wallpapers:", err);
  }
};