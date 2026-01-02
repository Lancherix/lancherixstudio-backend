import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String },
  country: { type: String },
  phoneNumber: { type: String },
  marketingOptIn: { type: Boolean, default: false },

  passwordHash: { type: String, required: true },

  isConfirmed: { type: Boolean, default: false },
  confirmToken: { type: String },

  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  profilePicture: {
    url: { type: String, default: "https://studio.lancherix.com/Images/defaultProfilePicture.png" },
    public_id: { type: String, default: "" }
  },

  wallpaper: {
    url: { type: String, default: "/Images/backgroundImage.jpeg" },
    public_id: { type: String, default: "" }
  },
  sideMenuColor: { type: String, default: "rgba(255, 255, 255, 1)" },
  themeMode: { type: String, default: "light" },

  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
}, { timestamps: true });

export default mongoose.model("User", UserSchema);