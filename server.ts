import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { Server } from "socket.io";
import http from "http";
import path from "path";
import { Resend } from "resend";
import multer from "multer";
import cookieParser from "cookie-parser";
import fs from "fs/promises";

const db = new Database("villas.db");
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  const PORT: number = parseInt(process.env.PORT as string || '8080', 10);

  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(path.join(process.cwd(), "public")));

  // API Routes
  app.post("/api/inquiry", async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    try {
      // 1. Save to Database
      const stmt = db.prepare("INSERT INTO inquiries (name, email, message) VALUES (?, ?, ?)");
      stmt.run(name, email, message || "");

      // 2. Send Email Notification
      if (resend && process.env.NOTIFICATION_EMAIL) {
        await resend.emails.send({
          from: 'Grey House Villas <onboarding@resend.dev>',
          to: process.env.NOTIFICATION_EMAIL,
          subject: `New Inquiry: ${name}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #8B6F5A;">New Estate Inquiry</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Message:</strong> ${message || 'No message provided.'}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #999;">This inquiry was sent from the Grey House Villas website.</p>
            </div>
          `
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Inquiry error:", error);
      res.status(500).json({ error: "Failed to process inquiry" });
    }
  });

  // Admin Routes
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
      res.cookie("admin_auth", "true", { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
      return res.json({ success: true });
    }
    res.status(401).json({ error: "Invalid password" });
  });

  const checkAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.cookies?.admin_auth === "true") {
      return next();
    }
    res.status(401).json({ error: "Unauthorized" });
  };

  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const destFolder = req.body.folder || '';
        const uploadPath = path.join(process.cwd(), "public", destFolder);
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
      }
    })
  });

  app.post("/api/admin/upload", checkAuth, upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const destFolder = req.body.folder || '';
    const imageUrl = `/${destFolder ? destFolder + '/' : ''}${req.file.filename}`;
    res.json({ success: true, url: imageUrl });
  });

  app.put("/api/admin/villas", checkAuth, async (req, res) => {
    try {
      const dataPath = path.join(process.cwd(), "src", "data", "villas.json");
      await fs.writeFile(dataPath, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to update villas.json:", err);
      res.status(500).json({ error: "Failed to update configuration" });
    }
  });

  // Real-time: Track active viewers
  let activeViewers = 0;
  io.on("connection", (socket) => {
    activeViewers++;
    io.emit("viewers:update", activeViewers);

    socket.on("disconnect", () => {
      activeViewers = Math.max(0, activeViewers - 1);
      io.emit("viewers:update", activeViewers);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.use(express.static(path.join(process.cwd(), "public")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
