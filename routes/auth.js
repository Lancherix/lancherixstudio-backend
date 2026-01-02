// routes/auth.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";

const router = express.Router();

//
// ─── REGISTER ──────────────────────────────────────
//
router.post("/register", async (req, res) => {
  try {
    const {
      username,
      email,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      country,
      phoneNumber,
      marketingOptIn,
      password,
      confirmPassword
    } = req.body;

    if (!username || !email || !firstName || !lastName || !dateOfBirth || !password || !confirmPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ message: "Username already taken" });

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: "Email already used" });

    const passwordHash = await bcrypt.hash(password, 10);
    const confirmToken = crypto.randomBytes(32).toString("hex");

    const newUser = new User({
      username,
      email,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      country,
      phoneNumber,
      marketingOptIn: marketingOptIn || false,
      passwordHash,
      confirmToken,
      isConfirmed: false
    });

    await newUser.save();

    // Enviar email de confirmación
    const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email?token=${confirmToken}`;
    await sendEmail({
      to: email,
      subject: "Confirma tu email en Lancherix",
      text: `Hola ${firstName},\n\nPor favor confirma tu email haciendo click aquí: ${confirmUrl}\n\nSi no te registraste, ignora este mensaje.`
    });

    res.status(201).json({ message: "User created. Please check your email to confirm." });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//
// ─── CONFIRM EMAIL ────────────────────────────────
//
router.get("/confirm-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Token missing" });

    const user = await User.findOne({ confirmToken: token });
    if (!user) return res.status(400).json({ message: "Invalid token" });

    user.isConfirmed = true;
    user.confirmToken = undefined;
    await user.save();

    res.json({ message: "Email confirmed successfully" });

  } catch (error) {
    console.error("Confirm email error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//
// ─── LOGIN ─────────────────────────────────────────
//
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body; // username o email

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    });

    if (!user) return res.status(400).json({ message: "Invalid username/email or password" });

    if (!user.isConfirmed) return res.status(403).json({ message: "Email not confirmed" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ message: "Invalid username/email or password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ token });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//
// ─── FORGOT PASSWORD ──────────────────────────────
//
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "No user with this email" });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      subject: "Reset your Lancherix password",
      text: `Hola ${user.firstName},\n\nUsa este link para resetear tu contraseña: ${resetUrl}\n\nSi no lo solicitaste, ignora este mensaje.`
    });

    res.json({ message: "Reset password email sent" });

  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//
// ─── RESET PASSWORD ───────────────────────────────
//
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword) return res.status(400).json({ message: "Missing fields" });
    if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully" });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//
// ─── PROTECTED /ME ───────────────────────────────
//
import authMiddleware from "../middleware/auth.js";

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-passwordHash -confirmToken -resetPasswordToken -resetPasswordExpires")
      .populate("projects")
      .exec();

    res.json(user);
  } catch (error) {
    console.error("/me error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//
// GET USER BY USERNAME
//
router.get("/users/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne(
      { username },
      {
        passwordHash: 0, // no revelar lo sensible
        __v: 0
      }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//
// GET ALL USERS (para búsqueda)
//
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, { passwordHash: 0, __v: 0 });
    res.json(users);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;