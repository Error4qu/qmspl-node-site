require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const mysql = require('mysql2/promise');
const { RateLimiterMemory } = require('rate-limiter-flexible');
import pkg from 'pg';
const { Pool } = pkg;
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
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection
pool.connect()
  .then(() => console.log("PostgreSQL connected"))
  .catch(err => console.error("PostgreSQL connection error:", err));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// Certificate Validator API
app.post("/api/validate", async (req, res) => {
  try {
    const { certificate_id, date_of_issue } = req.body;

    const query = `
      SELECT company_name, date_of_issue, surveillance_1, surveillance_2
      FROM certificates
      WHERE certificate_id = $1 AND date_of_issue = $2
      LIMIT 1
    `;

    const result = await pool.query(query, [certificate_id, date_of_issue]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    return res.json(result.rows[0]);

  } catch (err) {
    console.error("Validate error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});


// Fallback to Home Page
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
