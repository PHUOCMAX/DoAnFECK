import express from "express";

import {
  grantDeviceAccess,
  listDevices,
  revokeDeviceAccess,
} from "../controllers/adminDeviceController.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);
router.get("/", listDevices);
router.post("/:deviceId/grant", grantDeviceAccess);
router.post("/:deviceId/revoke", revokeDeviceAccess);

export default router;
