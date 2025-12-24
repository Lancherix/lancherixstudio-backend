// middleware/uploadMemory.js
import multer from "multer";

// Guardar archivos en memoria
const storage = multer.memoryStorage();
const uploadMemory = multer({ storage });

export default uploadMemory;