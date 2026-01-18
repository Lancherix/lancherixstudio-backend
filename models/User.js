import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    // ───────────────
    // Identity
    // ───────────────
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    // Name split
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },

    // ───────────────
    // Birth info
    // ───────────────
    month: String,
    date: String,
    year: String,
    gender: {
      type: String,
      enum: ["male", "female", "preferNotToSay"],
      default: "preferNotToSay"
    },

    // ───────────────
    // Localization
    // ───────────────
    country: {
      type: String,
      default: "CO",
      uppercase: true
    },
    language: {
      type: String,
      default: "es-CO"
    },

    // ───────────────
    // Auth
    // ───────────────
    passwordHash: {
      type: String,
      required: true,
      select: false // ⬅️ important security improvement
    },

    // ───────────────
    // Account metadata
    // ───────────────
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user"
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active"
    },

    // ───────────────
    // Onboarding
    // ───────────────
    isOnboarded: {
      type: Boolean,
      default: false
    },

    // ───────────────
    // Legal & privacy
    // ───────────────
    agreements: {
      privacyPolicy: { type: Boolean, required: true },
      notifications: { type: Boolean, default: false },
      cookies: { type: Boolean, default: false }
    },

    // ───────────────
    // Profile
    // ───────────────
    profilePicture: {
      url: {
        type: String,
        default:
          "https://studio.lancherix.com/Images/defaultProfilePicture.png"
      },
      public_id: {
        type: String,
        default: ""
      }
    },

    // UI personalization
    wallpaper: {
      url: {
        type: String,
        default: "/Images/backgroundImage.jpeg"
      },
      public_id: {
        type: String,
        default: ""
      }
    },
    sideMenuColor: {
      type: String,
      default: "rgba(255, 255, 255, 1)"
    },
    themeMode: {
      type: String,
      enum: ["light", "dark", "glass"],
      default: "light"
    },

    // ───────────────
    // Relations
    // ───────────────
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project"
      }
    ],

    // ───────────────
    // Activity
    // ───────────────
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("User", UserSchema);