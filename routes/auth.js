import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// ───────── REGISTER ─────────
router.post("/register", async (req, res) => {
  try {
    const {
      username,
      email,
      firstName,
      lastName,
      month,
      date,
      year,
      gender,
      country,
      language,
      themeMode,
      agreements,
      password,
      confirmPassword
    } = req.body;

    // ───── BASIC VALIDATION ─────
    if (
      !username || !email || !firstName || !lastName ||
      !month || !date || !year || !gender || !password || !confirmPassword ||
      !agreements || agreements.privacyPolicy === undefined
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "passwordMismatch" });
    }

    if (!/^[a-z0-9._]{1,20}$/.test(username)) {
      return res.status(400).json({ message: "usernameInvalid" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "emailInvalid" });
    }

    // ───── CHECK DUPLICATES ─────
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: "usernameOrEmailTaken" });
    }

    // ───── HASH PASSWORD ─────
    const passwordHash = await bcrypt.hash(password, 10);

    // ───── CREATE USER ─────
    const newUser = new User({
      username,
      email,
      firstName,
      lastName,
      month,
      date,
      year,
      gender,
      country,
      language,
      themeMode,
      agreements,
      passwordHash
    });

    await newUser.save();

    res.status(201).json({ message: "registrationSuccess" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

// ───────── LOGIN ─────────
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "enterUsernameEmailPassword" });
    }

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    }).select("+passwordHash");

    if (!user) {
      return res.status(400).json({ message: "invalidCredentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ message: "invalidCredentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

// ───────── PROTECTED /me ─────────
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "missingToken" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
      .select("-passwordHash")
      .populate("projects")
      .exec();

    if (!user) return res.status(404).json({ message: "userNotFound" });

    res.json(user);

  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "invalidToken" });
  }
});

// ───────── GET USER BY USERNAME ─────────
router.get("/users/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username })
      .select("-passwordHash -__v");

    if (!user) return res.status(404).json({ message: "userNotFound" });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

// ───────── GET ALL USERS ─────────
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "-passwordHash -__v");
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

export default router;