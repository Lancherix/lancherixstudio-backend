import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";

export const cleanupOrphanProfilePictures = async () => {
  try {
    const users = await User.find({}, "profilePicture.public_id");
    const usedIds = users.map(u => u.profilePicture?.public_id).filter(Boolean);

    let resources = [];
    let nextCursor = null;

    do {
      const result = await cloudinary.api.resources({
        type: "upload",
        prefix: "profile_pictures/",
        max_results: 100,
        next_cursor: nextCursor,
      });

      resources = resources.concat(result.resources);
      nextCursor = result.next_cursor;
    } while (nextCursor);

    const orphaned = resources.filter(r => !usedIds.includes(r.public_id));

    for (const img of orphaned) {
      await cloudinary.uploader.destroy(img.public_id);
      console.log("Deleted orphaned image:", img.public_id);
    }

    console.log("Cleanup complete. Orphaned images removed:", orphaned.length);
  } catch (err) {
    console.error("Error cleaning up profile pictures:", err);
  }
};