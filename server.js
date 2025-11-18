require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const mysql = require('mysql2/promise');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const app = express();
// CORS FIX
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://qmspl.org"); 
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // allow preflight
  }
  next();
});

const PORT = process.env.PORT || 3000;

// Security Headers
// app.use(helmet());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        // allow Tailwind CDN
        scriptSrc: ["'self'", "https://cdn.tailwindcss.com"],

        // allow inline styles (Tailwind needs this)
        styleSrc: ["'self'", "https://cdn.tailwindcss.com", "'unsafe-inline'"],

        // allow Unsplash images
        imgSrc: ["'self'", "data:", "https://images.unsplash.com"],

        connectSrc: ["'self'"],  
        fontSrc: ["'self'"],  
        objectSrc: ["'none'"],  
        frameSrc: ["'none'"]
      }
    }
  })
);

app.use(express.json());

// Rate Limiter – 30 req/min/IP
const limiter = new RateLimiterMemory({
  points: 30,
  duration: 60
});

app.use(async (req, res, next) => {
  try {
    await limiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({ error: 'Too many requests' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// DB Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// Certificate Validator API
app.post("/api/validate", async (req, res) => {
  const { certificate_id, date_of_issue } = req.body;

  if (!certificate_id || !date_of_issue) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_issue)) {
    return res.status(400).json({ error: "Invalid date format (YYYY-MM-DD)" });
  }

  try {
    const sql = `
      SELECT company_name, 
             DATE_FORMAT(date_of_issue, '%Y-%m-%d') AS date_of_issue,
             surveillance_1,
             surveillance_2
      FROM certificates
      WHERE certificate_id = ? AND date_of_issue = ?
      LIMIT 1
    `;

    const [rows] = await pool.execute(sql, [certificate_id, date_of_issue]);

    if (!rows.length) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Fallback to Home Page
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
