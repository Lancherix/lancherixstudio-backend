import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const {
      username,
      email,
      fullName,
      month,
      date,
      year,
      gender,
      password,
      confirmPassword
    } = req.body;

    if (!username || !email || !fullName || !month || !date || !year || !gender || !password || !confirmPassword) {
      return res.status(400).json({ message: "Missing fields" });
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
      fullName,
      month,
      date,
      year,
      gender,
      passwordHash: hash
    });

    await newUser.save();

    res.status(201).json({ message: "User created" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
});

//
// LOGIN (username OR email)
//
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // identifier = username OR email
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid username/email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ message: "Invalid username/email or password" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
});

//
// PROTECTED /me ROUTE
//
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-passwordHash");
    res.json(user);

  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
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