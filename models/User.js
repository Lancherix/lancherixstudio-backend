import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },

    // Name split (better than fullName)
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

    // Birth date (keeping your original approach)
    month: String,
    date: String,
    year: String,

    gender: String,

    // Localization
    country: { type: String, default: "CO" },        // ISO code recommended
    language: { type: String, default: "es-CO" },

    // Auth
    passwordHash: { type: String, required: true },

    // Account metadata
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

    // Legal & privacy consents
    agreements: {
      privacyPolicy: { type: Boolean, required: true },
      notifications: { type: Boolean, default: false },
      cookies: { type: Boolean, default: false }
    },

    // Profile picture
    profilePicture: {
      url: {
        type: String,
        default: "https://studio.lancherix.com/Images/defaultProfilePicture.png"
      },
      public_id: { type: String, default: "" }
    },

    // UI personalization
    wallpaper: {
      url: { type: String, default: "/Images/backgroundImage.jpeg" },
      public_id: { type: String, default: "" }
    },
    sideMenuColor: { type: String, default: "rgba(255, 255, 255, 1)" },
    themeMode: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "light"
    },

    // Relations
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project"
      }
    ],

    // Activity tracking
    lastLoginAt: { type: Date }
  },
  {
    timestamps: true // creates createdAt & updatedAt automatically
  }
);

export default mongoose.model("User", UserSchema);