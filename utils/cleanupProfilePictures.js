import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";

export const cleanupUnusedProfilePictures = async () => {
  try {
    // 1️⃣ Get all public_ids in use
    const users = await User.find({}, "profilePicture");
    const usedIds = users
      .map(u => u.profilePicture?.public_id)
      .filter(Boolean);

    // 2️⃣ List all images in profile_pictures folder
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: "profile_pictures",
      max_results: 500,
    });

    // 3️⃣ Delete images not used
    for (const img of result.resources) {
      if (!usedIds.includes(img.public_id)) {
        await cloudinary.uploader.destroy(img.public_id);
        console.log("Deleted unused image:", img.public_id);
      }
    }

  } catch (err) {
    console.error("Error cleaning up profile pictures:", err);
  }
};