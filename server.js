const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model("User", userSchema);

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Please log in first" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    req.user = user;
    next();
  });
}

// Registration
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters"
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({
      message: "Registration successful"
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      name: user.name
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

// Get current user
app.get("/api/profile", authenticateToken, (req, res) => {
  res.json({ name: req.user.name });
});

// Search YouTube music
app.get("/api/music", authenticateToken, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({
        message: "Enter a song or artist name"
      });
    }

    if (!process.env.YOUTUBE_API_KEY ||
        process.env.YOUTUBE_API_KEY.includes("PASTE_")) {
      return res.status(503).json({
        message: "YouTube API key is not configured"
      });
    }

    const url = new URL(
      "https://www.googleapis.com/youtube/v3/search"
    );

    url.search = new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      videoCategoryId: "10",
      maxResults: "12",
      key: process.env.YOUTUBE_API_KEY
    }).toString();

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(502).json({
        message: "YouTube search is temporarily unavailable"
      });
    }

    const data = await response.json();

    const videos = (data.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url
    }));

    res.json(videos);
  } catch (error) {
    res.status(500).json({
      message: "Unable to search for music"
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`SoundSpace running at http://localhost:${PORT}`);
});
