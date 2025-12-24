import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    if (req.originalUrl.includes("/board-images")) {
      return {
        folder: `board/${req.params.projectId}`,
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
      };
    }

    return {
      folder: "profile_pictures",
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
    };
  }
});

const upload = multer({ storage });

export default upload;