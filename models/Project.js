import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    /* Basic info */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    icon: {
      type: String,
      default: "🚀",
    },

    /* Ownership & access */
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
      index: true,
    },
    subject: {
      type: String,
      trim: true,
    },

    deadline: Date,

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    links: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: [
        "active",
        "pinned",
        "hidden",
        "completed",
        "archived",
      ],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Project", ProjectSchema);