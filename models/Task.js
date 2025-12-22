import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    /* Relations */
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* Core content */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    completed: {
      type: Boolean,
      default: false,
      index: true,
    },

    /* Metadata */
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    due: {
      type: Date,
      default: null,
    },

    /* Ordering */
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Task", TaskSchema);