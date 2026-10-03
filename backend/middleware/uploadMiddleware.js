import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDirectory = path.resolve(
  process.cwd(),
  "uploads",
  "pois"
);

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (_req, file, cb) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const baseName = path
      .basename(
        file.originalname,
        extension
      )
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60);

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}-${baseName || "poi"}${extension}`;

    cb(null, uniqueName);
  },
});

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(
        new Error(
          "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF."
        )
      );
    }

    cb(null, true);
  },
});

export const uploadPoiImage =
  upload.single("image");