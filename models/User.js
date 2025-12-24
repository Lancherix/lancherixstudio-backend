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

  // Ahora profilePicture es un objeto
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
  projects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    }
  ],
});

export default mongoose.model("User", UserSchema);