import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Database Connection
const db = await mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Middleware to check if the user is an admin
// Middleware to check if the user is an admin
const isAdmin = async (req, res, next) => {
    console.log("Received adminKey:", req.headers.adminkey);  // Debugging log
  
    if (req.headers.adminkey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    next();
  };
  

// ✅ **1. Admin Creates a Member (No Password Hashing)**
router.post("/create-member", isAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check role validity
    const validRoles = ["gp", "taluk", "mla", "admin", "citizen"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Insert member into the database
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, password, role]
    );

    res.json({ message: "Member created successfully", userId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Error creating member", error: error.message });
  }
});

  

// ✅ **2. Admin Sets Escalation Time**
router.post("/set-escalation-time", isAdmin, async (req, res) => {
  try {
    const { level, time_limit } = req.body;

    const validLevels = ["gp", "taluk", "mla"];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ message: "Invalid escalation level" });
    }

    await db.query(
      "INSERT INTO escalation_settings (level, time_limit) VALUES (?, ?) ON DUPLICATE KEY UPDATE time_limit = ?",
      [level, time_limit, time_limit]
    );

    res.json({ message: `Escalation time for ${level} set to ${time_limit} hours` });
  } catch (error) {
    res.status(500).json({ message: "Error setting escalation time", error: error.message });
  }
});

// ✅ GET all users
router.get('/users', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, role FROM users ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

export default router;
