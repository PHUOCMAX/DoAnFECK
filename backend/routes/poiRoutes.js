import { requireTourAuthorization } from "../middleware/requireTourAuthorization.js";
import express from "express";

import { createPoi, listPois } from "../controllers/poiController.js";
import { requireVisitor } from "../middleware/visitorMiddleware.js";

const router = express.Router();

router.get("/", requireVisitor, requireTourAuthorization, listPois);
router.post("/", requireVisitor, createPoi);

export default router;
