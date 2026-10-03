import express from "express";

import {
  createCheckin,
  listMyCheckins,
} from "../controllers/checkinController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);
router.post("/", createCheckin);
router.get("/", listMyCheckins);

export default router;
