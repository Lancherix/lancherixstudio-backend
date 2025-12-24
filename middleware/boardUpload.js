import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "boards",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const boardUpload = multer({ storage });
export default boardUpload;