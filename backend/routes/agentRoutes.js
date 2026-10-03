import express from "express";

import {
  chatWithAgent,
} from "../controllers/agentController.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/chat",
  requireAuth,
  chatWithAgent
);

export default router;