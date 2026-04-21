const multer = require("multer");
const cloudinary = require("../config/cloudinary");

// memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// cloudinary middleware
const uploadToCloudinary = async (req, res, next) => {
  try {

    if (!req.file) return next();

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "doctors" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      stream.end(req.file.buffer);
    });

    // 👉 final URL
    req.file.cloudinaryUrl = result.secure_url;
    req.file.cloudinaryId = result.public_id; // 🔥 add this

    next();

  } catch (error) {
    console.log("Cloudinary Error:", error);
    res.status(500).json({ message: "Image upload failed" });
  }
};

module.exports = {
  upload,
  uploadToCloudinary
};