import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    content: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Note", NoteSchema);