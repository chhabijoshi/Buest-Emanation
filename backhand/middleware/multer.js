const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Use your existing uploads folder
const uploadDir = path.join(__dirname, "../uploads"); // backhand/uploads

// Create folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function(req, file, cb){
    cb(null, uploadDir);
  },
  filename: function(req, file, cb){
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });

module.exports = upload;