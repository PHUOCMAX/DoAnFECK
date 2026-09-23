import express from "express";

import { listPoisForReview, reviewPoi } from "../controllers/poiController.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);
router.get("/pois", listPoisForReview);
router.patch("/pois/:poiId/status", reviewPoi);

export default router;
