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
import fsSync from "fs";
import dotenv from "dotenv";
import { Storage } from "@google-cloud/storage";
import admin from "firebase-admin";

dotenv.config();

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
    console.log("LOGIN ATTEMPT - req.body.password:", password, "process.env.ADMIN_PASSWORD:", process.env.ADMIN_PASSWORD);
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

  // Determine if we should use Google Cloud Storage or local storage
  const useGCS = process.env.USE_GCS === 'true' || process.env.NODE_ENV === 'production';
  const useFirestore = process.env.USE_FIRESTORE === 'true' || process.env.NODE_ENV === 'production';

  let storage: Storage | null = null;
  let bucket: any = null;
  let dbFirestore: any = null;

  // Initialize GCS only if configured
  if (useGCS) {
    try {
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      let gcsConfig: any = {
        projectId: process.env.GCP_PROJECT_ID,
      };

      // Handle credentials - can be a file path or we'll try to load from gcp-key.json
      if (credentialsPath && fsSync.existsSync(credentialsPath)) {
        gcsConfig.keyFilename = credentialsPath;
      } else if (fsSync.existsSync(path.join(process.cwd(), 'gcp-key.json'))) {
        gcsConfig.keyFilename = path.join(process.cwd(), 'gcp-key.json');
      } else {
        // Try loading from environment variable as JSON string
        const keyJson = process.env.GCP_KEY_JSON;
        if (keyJson) {
          try {
            gcsConfig.credentials = JSON.parse(keyJson);
          } catch (e) {
            console.warn('Failed to parse GCP_KEY_JSON for GCS, falling back to local storage');
          }
        } else {
          console.warn('GCS credentials not found, falling back to local storage');
        }
      }

      if (gcsConfig.keyFilename || gcsConfig.credentials || gcsConfig.projectId) {
        storage = new Storage(gcsConfig);
        const bucketName = process.env.GCS_BUCKET_NAME || 'greyvilla-images-prod';
        bucket = storage.bucket(bucketName);
        console.log(`GCS initialized with bucket: ${bucketName}`);
      } else {
        console.warn('GCS not properly configured, using local storage');
      }
    } catch (error) {
      console.error('Failed to initialize GCS, falling back to local storage:', error);
      storage = null;
      bucket = null;
    }
  }

  // Initialize Firestore only if configured
  if (useFirestore) {
    try {
      if (!admin.apps.length) {
        const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        let firestoreConfig: any = {};

        // Handle credentials
        if (credentialsPath && fsSync.existsSync(credentialsPath)) {
          firestoreConfig.credential = admin.credential.cert(credentialsPath);
        } else if (fsSync.existsSync(path.join(process.cwd(), 'gcp-key.json'))) {
          const keyPath = path.join(process.cwd(), 'gcp-key.json');
          firestoreConfig.credential = admin.credential.cert(keyPath);
        } else {
          // Try loading from environment variable as JSON string
          const keyJson = process.env.GCP_KEY_JSON;
          if (keyJson) {
            try {
              firestoreConfig.credential = admin.credential.cert(JSON.parse(keyJson));
            } catch (e) {
              console.warn('Failed to parse GCP_KEY_JSON, falling back to local storage');
            }
          }
        }

        if (firestoreConfig.credential) {
          admin.initializeApp(firestoreConfig);
          dbFirestore = admin.firestore();
          console.log('Firestore initialized');
        } else {
          console.warn('Firestore credentials not found, falling back to local JSON');
        }
      } else {
        dbFirestore = admin.firestore();
      }
    } catch (error) {
      console.error('Failed to initialize Firestore, falling back to local JSON:', error);
      dbFirestore = null;
    }
  }

  // Configure multer - use memory storage for GCS, disk storage for local
  const upload = multer({
    storage: (useGCS && bucket) ? multer.memoryStorage() : multer.diskStorage({
      destination: (req, file, cb) => {
        try {
          const destFolder = (req.body && req.body.folder) ? req.body.folder.trim() : '';
          const uploadPath = destFolder
            ? path.join(process.cwd(), "public", destFolder)
            : path.join(process.cwd(), "public");

          // Ensure the directory exists
          if (!fsSync.existsSync(uploadPath)) {
            fsSync.mkdirSync(uploadPath, { recursive: true });
            console.log(`Created upload directory: ${uploadPath}`);
          }

          cb(null, uploadPath);
        } catch (error) {
          console.error("Error setting upload destination:", error);
          cb(error as Error, path.join(process.cwd(), "public"));
        }
      },
      filename: (req, file, cb) => {
        // Sanitize filename and preserve extension
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const timestamp = Date.now();
        cb(null, `${timestamp}-${originalName}`);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  app.post("/api/admin/upload", checkAuth, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        console.error("Upload failed: No file received");
        return res.status(400).json({ error: "No file uploaded" });
      }

      const destFolder = (req.body && req.body.folder) ? req.body.folder.trim() : '';

      if (!destFolder) {
        console.error("Upload failed: No folder specified");
        return res.status(400).json({ error: "Folder name is required" });
      }

      if (destFolder.includes('..') || destFolder.includes('/') || destFolder.includes('\\')) {
        console.error("Upload failed: Invalid folder name:", destFolder);
        return res.status(400).json({ error: "Invalid folder name" });
      }

      // Sanitize filename
      const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const fileName = `${timestamp}-${originalName}`;

      // Upload to GCS if available, otherwise use local storage
      if (useGCS && bucket && req.file.buffer) {
        // Upload to Google Cloud Storage
        const gcsFileName = `${destFolder}/${fileName}`;
        const file = bucket.file(gcsFileName);

        // Stream the memory buffer directly to Google Cloud Storage
        const stream = file.createWriteStream({
          metadata: {
            contentType: req.file.mimetype,
          },
          resumable: false
        });

        stream.on('error', (err: any) => {
          console.error("GCS Upload Error:", err);
          res.status(500).json({ error: "Failed to upload to cloud storage" });
        });

        stream.on('finish', async () => {
          try {
            // Make the file publicly accessible
            await file.makePublic();
            console.log(`Image uploaded successfully to GCS: ${gcsFileName}`);

            // Return the permanent public URL
            const bucketName = process.env.GCS_BUCKET_NAME || 'greyvilla-images-prod';
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;
            res.json({ success: true, url: publicUrl });
          } catch (error) {
            console.error("Error making file public:", error);
            // Still return success with the URL even if makePublic fails
            const bucketName = process.env.GCS_BUCKET_NAME || 'greyvilla-images-prod';
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;
            res.json({ success: true, url: publicUrl });
          }
        });

        stream.end(req.file.buffer);
      } else {
        // Upload to local storage
        if (!req.file.path) {
          return res.status(500).json({ error: "File path not available for local storage" });
        }

        // Ensure file is in correct location
        const expectedPath = path.join(process.cwd(), "public", destFolder);
        const actualPath = path.dirname(req.file.path);

        // If file was saved to wrong location, move it
        if (actualPath !== expectedPath) {
          const newPath = path.join(expectedPath, req.file.filename);
          if (!fsSync.existsSync(expectedPath)) {
            fsSync.mkdirSync(expectedPath, { recursive: true });
          }
          fsSync.renameSync(req.file.path, newPath);
          console.log(`Moved file from ${req.file.path} to ${newPath}`);
        }

        const imageUrl = `/${destFolder}/${req.file.filename}`;
        console.log(`Image uploaded successfully to local storage: ${imageUrl}`);
        res.json({ success: true, url: imageUrl });
      }

    } catch (error) {
      console.error("Upload error:", error);
      // Clean up file if it was created locally
      if (req.file && req.file.path && fsSync.existsSync(req.file.path)) {
        try {
          fsSync.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error("Failed to delete file after error:", unlinkError);
        }
      }
      res.status(500).json({ error: "Failed to process image upload" });
    }
  });

  // Create /api/villas GET endpoint
  app.get("/api/villas", async (req, res) => {
    try {
      if (useFirestore && dbFirestore) {
        // Use Firestore
        const docRef = dbFirestore.collection('config').doc('villas');
        const doc = await docRef.get();

        if (!doc.exists) {
          // Fallback: Read local file and seed Firestore if it's empty
          console.log("Firestore empty, reading from local file...");
          const dataPath = path.join(process.cwd(), "src", "data", "villas.json");
          const localDataRaw = await fs.readFile(dataPath, 'utf8');
          const localData = JSON.parse(localDataRaw);

          await docRef.set({ data: localData });
          return res.json(localData);
        }

        res.json(doc.data().data);
      } else {
        // Use local JSON file
        const dataPath = path.join(process.cwd(), "src", "data", "villas.json");
        const localDataRaw = await fs.readFile(dataPath, 'utf8');
        const localData = JSON.parse(localDataRaw);
        res.json(localData);
      }
    } catch (err) {
      console.error("Failed to fetch villas:", err);
      res.status(500).json({ error: "Failed to fetch configuration" });
    }
  });

  // Rewrite /api/admin/villas PUT endpoint
  app.put("/api/admin/villas", checkAuth, async (req, res) => {
    try {
      // Always update local file first
      const dataPath = path.join(process.cwd(), "src", "data", "villas.json");
      await fs.writeFile(dataPath, JSON.stringify(req.body, null, 2));

      // Also update Firestore if configured
      if (useFirestore && dbFirestore) {
        try {
          const docRef = dbFirestore.collection('config').doc('villas');
          await docRef.set({ data: req.body });
          console.log('Updated Firestore');
        } catch (firestoreError) {
          console.error("Failed to update Firestore (but local file was saved):", firestoreError);
          // Don't fail the request if Firestore update fails, local file is saved
        }
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Failed to update villas:", err);
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

    // Explicitly serve public files BEFORE vite middleware catches them as SPA routes
    app.use('/VILLA_ONEIRO', express.static(path.join(process.cwd(), 'public', 'VILLA_ONEIRO')));
    app.use('/OMORFI_SUITE', express.static(path.join(process.cwd(), 'public', 'OMORFI_SUITE')));
    app.use('/Villa_PETRA', express.static(path.join(process.cwd(), 'public', 'Villa_PETRA')));

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
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`GCS: ${useGCS && bucket ? 'Enabled' : 'Disabled (using local storage)'}`);
    console.log(`Firestore: ${useFirestore && dbFirestore ? 'Enabled' : 'Disabled (using local JSON)'}`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use!`);
      console.error(`   Please stop the other process or change the PORT in .env`);
      console.error(`   To find and kill the process: netstat -ano | findstr :${PORT}`);
      console.error(`   Then: taskkill /F /PID <process_id>\n`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
}

startServer();
