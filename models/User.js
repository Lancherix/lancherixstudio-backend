// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  month: String,
  date: String,
  year: String,
  gender: String,

  passwordHash: { type: String, required: true },

  profilePicture: { type: String, default: "https://tse1.mm.bing.net/th?q=profile%20pic%20blank&w=250&h=250&c=7" },
  profilePictureId: { type: String },
  wallpaper: { type: String, default: "/Images/backgroundImage.jpeg" },
  sideMenuColor: { type: String, default: "rgba(255, 255, 255, 1)" },
  themeMode: { type: String, default: "light" }
});

export default mongoose.model("User", UserSchema);