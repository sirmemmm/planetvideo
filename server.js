const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Video storage ──
const VIDEOS_DIR = path.join(__dirname, 'public', 'videos');
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, VIDEOS_DIR),
    filename: (req, file, cb) => {
        // Sanitize filename: keep only safe characters
        const safe = file.originalname.replace(/[^a-zA-Z0-9._()-]/g, '_');
        const unique = Date.now() + '-' + safe;
        cb(null, unique);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB max
    fileFilter: (req, file, cb) => {
        const allowed = /video\/(mp4|webm|ogg|quicktime|x-msvideo|x-matroska)/;
        if (allowed.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed'));
        }
    }
});

// ── Static files ──
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── API: List all videos ──
app.get('/api/videos', (req, res) => {
    const files = fs.readdirSync(VIDEOS_DIR)
        .filter(f => /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(f))
        .map(f => ({
            name: f,
            url: '/videos/' + encodeURIComponent(f),
            size: fs.statSync(path.join(VIDEOS_DIR, f)).size
        }));
    res.json(files);
});

// ── API: Upload video ──
app.post('/api/upload', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No video uploaded' });
    res.json({
        name: req.file.filename,
        url: '/videos/' + encodeURIComponent(req.file.filename),
        size: req.file.size
    });
});

// ── API: Delete video ──
app.delete('/api/videos/:name', (req, res) => {
    const name = req.params.name;
    const filePath = path.join(VIDEOS_DIR, name);
    // Prevent path traversal
    if (!filePath.startsWith(VIDEOS_DIR)) return res.status(403).json({ error: 'Forbidden' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    fs.unlinkSync(filePath);
    res.json({ ok: true });
});

// ── Fallback: serve index.html ──
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n  🚀 TV SOLAR server running at:`);
    console.log(`     http://localhost:${PORT}\n`);
});
