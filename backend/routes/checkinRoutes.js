import express from "express";

import {
  createCheckin,
  listMyCheckins,
} from "../controllers/checkinController.js";
import { requireVisitor } from "../middleware/visitorMiddleware.js";
import { requireTourAuthorization } from "../middleware/requireTourAuthorization.js";

const router = express.Router();

router.use(requireVisitor);
router.post("/", requireTourAuthorization, createCheckin);
router.get("/", listMyCheckins);

export default router;
