const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

// Set storage engine
const storage = multer.diskStorage({
    destination: "./uploads",
    filename: function (req, file, cb) {
        cb(null, Date.now()+'-' +Math.round(Math.random()*100000) + path.extname(file.originalname));
    },
});

// Init upload
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        validateFileType(file, cb);
    },
}).single("video");

// Check file type
function validateFileType(file, cb) {
    const filetypes = /mp4|avi|mov|mkv|wmv/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb("Not a video");
    }
}

// Upload endpoint
app.post("/upload", (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.log(err.message);
            res.status(400).send(err.message);
        } else {
            console.log(req.file);
            res.status(200).send("Video uploaded!");
        }
    });
});

// Stream endpoint
app.get("/stream/:filename", (req, res) => {
    const path = `./uploads/${req.params.filename}`;
    const stat = fs.statSync(path);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        const file = fs.createReadStream(path, { start, end });
        const head = {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize,
            "Content-Type": "video/mp4",
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            "Content-Length": fileSize,
            "Content-Type": "video/mp4",
        };
        res.writeHead(200, head);
        fs.createReadStream(path).pipe(res);
    }
});

// Download endpoint
app.get("/download/:filename", (req, res) => {
    const file = `./uploads/${req.params.filename}`;
    res.download(file);
});

const PORT = 8080;

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
