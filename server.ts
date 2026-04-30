import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import multer from "multer";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import "dotenv/config";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Serve uploads directory
app.use('/uploads', express.static(path.resolve('uploads')));

// Google Drive Config
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.APP_URL ? `${process.env.APP_URL}/auth/google/callback` : 'http://localhost:3000/auth/google/callback'
);

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Helper to check Google Config
const checkGoogleConfig = () => {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
};

// Google Auth Status
app.get("/api/auth/google/status", (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  console.log("Checking Google Auth Status. Cookie present:", !!tokensStr);
  res.json({ connected: !!tokensStr });
});

// Google Auth Config Debug
app.get("/api/auth/google/config-debug", (req, res) => {
  const redirectUri = process.env.APP_URL 
    ? `${process.env.APP_URL.replace(/\/$/, '')}/auth/google/callback` 
    : 'http://localhost:3000/auth/google/callback';
    
  res.json({
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    appUrl: process.env.APP_URL || 'Not Set',
    redirectUri: redirectUri,
    envKeys: Object.keys(process.env).filter(k => k.includes('GOOGLE') || k === 'APP_URL')
  });
});

// Google Auth URL
app.get("/api/auth/google/url", (req, res) => {
  if (!checkGoogleConfig()) {
    console.error("Google Config Missing:", { 
      clientId: !!process.env.GOOGLE_CLIENT_ID, 
      clientSecret: !!process.env.GOOGLE_CLIENT_SECRET 
    });
    return res.status(400).json({ 
      error: "Konfigurasi Google OAuth belum lengkap. Pastikan GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET sudah diatur di file .env." 
    });
  }

  try {
    // Re-initialize client to ensure latest redirect URI from APP_URL
    const currentRedirectUri = process.env.APP_URL 
      ? `${process.env.APP_URL.replace(/\/$/, '')}/auth/google/callback` 
      : 'http://localhost:3000/auth/google/callback';
      
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      currentRedirectUri
    );

    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      prompt: 'consent'
    });
    console.log("Generated Auth URL with Redirect URI:", currentRedirectUri);
    res.json({ url });
  } catch (err) {
    console.error("Error generating Auth URL:", err);
    res.status(500).json({ error: "Gagal membuat URL autentikasi Google." });
  }
});

// Google Auth Callback
app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  console.log("Received Google Auth Callback with code:", !!code);
  
  try {
    const currentRedirectUri = process.env.APP_URL 
      ? `${process.env.APP_URL.replace(/\/$/, '')}/auth/google/callback` 
      : 'http://localhost:3000/auth/google/callback';

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      currentRedirectUri
    );

    const { tokens } = await client.getToken(code as string);
    console.log("Successfully obtained tokens from Google");
    // In a real app, store this in a database linked to the user
    // For this demo, we'll use a cookie (SameSite=None for iframe)
    res.cookie('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).send("Authentication failed");
  }
});

// Upload to Local Storage
app.post("/api/upload/local", (req, res, next) => {
  console.log("Local upload request received");
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer Error:", err);
      return res.status(400).json({ error: `Multer Error: ${err.message}` });
    } else if (err) {
      console.error("Unknown Upload Error:", err);
      return res.status(500).json({ error: `Upload Error: ${err.message}` });
    }

    if (!req.file) {
      console.error("No file in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File uploaded successfully:", req.file.filename);
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      id: req.file.filename,
      viewLink: fileUrl,
      downloadLink: fileUrl
    });
  });
});

// Upload to Google Drive
app.post("/api/upload/google-drive", (req, res) => {
  console.log("Google Drive upload request received");
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error("Multer Error in Google Drive upload:", err);
      return res.status(500).json({ error: `Upload Error: ${err.message}` });
    }

    if (!checkGoogleConfig()) {
      console.error("Google Config Missing in upload request");
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(500).json({ 
        error: "Konfigurasi Google Drive di server belum lengkap (GOOGLE_CLIENT_ID/SECRET kosong)." 
      });
    }

    const tokensStr = req.cookies.google_tokens;
    if (!tokensStr) {
      if (req.file) fs.unlinkSync(req.file.path);
      console.warn("Upload attempt failed: No google_tokens cookie found in request");
      return res.status(401).json({ error: "Sesi Google Drive berakhir atau diblokir browser. Silakan hubungkan kembali akun Google Anda di menu Profil." });
    }

    if (!req.file) {
      console.error("No file in Google Drive upload request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(`Uploading file to Google Drive: ${req.file.originalname} (${req.file.size} bytes)`);

    try {
      const tokens = JSON.parse(tokensStr);
      
      const currentRedirectUri = process.env.APP_URL 
        ? `${process.env.APP_URL.replace(/\/$/, '')}/auth/google/callback` 
        : 'http://localhost:3000/auth/google/callback';

      const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        currentRedirectUri
      );
      
      client.setCredentials(tokens);
      const drive = google.drive({ version: 'v3', auth: client });

      const fileMetadata = {
        name: req.file.originalname,
        parents: [] // You could specify a folder ID here
      };

      const media = {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path)
      };

      console.log("Starting Google Drive API file creation...");
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink'
      });

      console.log(`File created in Google Drive. ID: ${response.data.id}`);

      // Make file readable by anyone with the link for preview
      console.log("Setting Google Drive file permissions to public reader...");
      await drive.permissions.create({
        fileId: response.data.id!,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // Clean up local file
      fs.unlinkSync(req.file.path);
      console.log("Local temporary file cleaned up.");

      res.json({
        id: response.data.id,
        viewLink: response.data.webViewLink,
        downloadLink: response.data.webContentLink
      });
    } catch (error: any) {
      console.error("Drive Upload Error Details:", error);
      if (req.file) fs.unlinkSync(req.file.path);
      
      let errorMessage = "Gagal mengunggah ke Google Drive.";
      if (error.message?.includes("invalid_grant")) {
        errorMessage = "Sesi Google Drive tidak valid. Silakan hubungkan kembali akun Google Anda di menu Profil.";
      } else if (error.code === 403) {
        errorMessage = "Akses Google Drive ditolak. Pastikan Anda memberikan izin yang cukup.";
      }
      
      res.status(500).json({ error: errorMessage, details: error.message });
    }
  });
});

// Global Error Handler for API
app.use("/api", (err: any, req: any, res: any, next: any) => {
  console.error("API Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
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
  app.use(express.static("dist"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve("dist/index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
