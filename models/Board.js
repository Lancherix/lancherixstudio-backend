// models/Board.js
import mongoose from "mongoose";

const BoardImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  { timestamps: true }
);

const BoardSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true, // 👈 1 board por proyecto
      index: true,
    },

    images: [BoardImageSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Board", BoardSchema);