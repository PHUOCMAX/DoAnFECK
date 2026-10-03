import express from "express";

import {
  createAdminPoi,
  deleteAdminPoi,
  updateAdminPoi,
} from "../controllers/adminPoiController.js";

import {
  listPoisForReview,
  reviewPoi,
} from "../controllers/poiController.js";

import {
  requireAdmin,
} from "../middleware/adminMiddleware.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

import {
  uploadPoiImage,
} from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(
  requireAuth,
  requireAdmin
);

router.get(
  "/pois",
  listPoisForReview
);

router.post(
  "/pois",
  uploadPoiImage,
  createAdminPoi
);

router.patch(
  "/pois/:poiId",
  uploadPoiImage,
  updateAdminPoi
);

router.patch(
  "/pois/:poiId/status",
  reviewPoi
);

router.delete(
  "/pois/:poiId",
  deleteAdminPoi
);

export default router;