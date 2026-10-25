import express from "express";

import {
  chatWithAgent,
} from "../controllers/agentController.js";

import { requireVisitor } from "../middleware/visitorMiddleware.js";
import { requireTourAuthorization } from "../middleware/requireTourAuthorization.js";

const router = express.Router();

router.post(
  "/chat",
  requireVisitor,
  requireTourAuthorization,
  chatWithAgent
);

export default router;