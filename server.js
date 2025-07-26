import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// DB Connection
const db = await mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "movie_hub",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// User Signup
app.post("/user/signup", async (req, res) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters long and contain at least one special character."
    });
  }

  try {
    const [existing] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Username already exists" });
    }

    await db.query(
      "INSERT INTO users (name, email, username, password) VALUES (?, ?, ?, ?)",
      [name, email, username, password]
    );
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});

// User Login
app.post("/user/login", async (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "admin") {
    return res.json({ message: "Admin login success", role: "admin" });
  }

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE username = ? AND password = ?", [
      username,
      password,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];
    res.json({ message: "User login success", role: "user", user });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// Admin - Create Category
app.post("/admin/create-category", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Category name required" });

  try {
    await db.query("INSERT INTO categories (name) VALUES (?)", [name]);
    res.json({ message: "Category created" });
  } catch (err) {
    res.status(500).json({ message: "Error creating category", error: err.message });
  }
});

// Get all categories
app.get("/admin/categories", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM categories");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

app.get("/user/categories", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM categories");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// Admin - Add Movie
app.post("/admin/create-movie", async (req, res) => {
  const { category_id, name, trailer_link, song_link, ott_link, description } = req.body;
  if (!category_id || !name) {
    return res.status(400).json({ message: "category_id and movie name are required" });
  }

  try {
    await db.query(
      "INSERT INTO movies (category_id, name, trailer_link, song_link, ott_link, description) VALUES (?, ?, ?, ?, ?, ?)",
      [category_id, name, trailer_link, song_link, ott_link, description]
    );
    res.json({ message: "Movie added" });
  } catch (err) {
    res.status(500).json({ message: "Error adding movie", error: err.message });
  }
});

// User - View Movies by Category
app.get("/user/movies/:category_id", async (req, res) => {
  const { category_id } = req.params;
  try {
    const [movies] = await db.query("SELECT * FROM movies WHERE category_id = ?", [category_id]);
    res.json(movies);
  } catch (err) {
    res.status(500).json({ message: "Error fetching movies", error: err.message });
  }
});

// User - Submit Review
app.post("/user/review", async (req, res) => {
  const { user_id, movie_id, review_text, rating } = req.body;

  if (!user_id || !movie_id || !review_text) {
    return res.status(400).json({ message: "Missing required review fields" });
  }

  try {
    await db.query(
      "INSERT INTO reviews (user_id, movie_id, review_text, rating) VALUES (?, ?, ?, ?)",
      [user_id, movie_id, review_text, rating]
    );
    res.json({ message: "Review submitted" });
  } catch (err) {
    res.status(500).json({ message: "Error submitting review", error: err.message });
  }
});

// Get Reviews for a Movie
app.get("/user/reviews/:movie_id", async (req, res) => {
  const { movie_id } = req.params;
  try {
    const [reviews] = await db.query(
      `SELECT r.review_text, r.rating, u.name 
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.movie_id = ?`,
      [movie_id]
    );
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Error fetching reviews", error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🎬 Movie Hub backend running at http://localhost:${PORT}`);
});
