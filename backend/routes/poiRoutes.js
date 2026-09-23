import express from "express";

import { createPoi, listPois } from "../controllers/poiController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", listPois);
router.post("/", requireAuth, createPoi);

export default router;
