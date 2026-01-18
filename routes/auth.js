import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

//
// REGISTER
//
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
      agreements,
      password,
      confirmPassword
    } = req.body;

    // Required fields check
    if (
      !username ||
      !email ||
      !firstName ||
      !lastName ||
      !month ||
      !date ||
      !year ||
      !gender ||
      !agreements?.privacyPolicy ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already used" });
    }

    const hash = await bcrypt.hash(password, 10);

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
      agreements: {
        privacyPolicy: true,
        notifications: agreements.notifications ?? false,
        cookies: agreements.cookies ?? false
      },
      passwordHash: hash
    });

    await newUser.save();

    res.status(201).json({ message: "User created" });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//
// LOGIN (username OR email)
//
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid username/email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ message: "Invalid username/email or password" });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//
// PROTECTED /me ROUTE
//
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Missing token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
      .select("-passwordHash -__v")
      .populate("projects")
      .exec();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
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
      { passwordHash: 0, __v: 0 }
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
// GET ALL USERS (search / discovery)
//
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, { passwordHash: 0, __v: 0 });
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;