import express from "express";

import {
  listAdminUsers,
  updateAdminUserRole,
  deleteAdminUser,
} from "../controllers/adminUserController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/", listAdminUsers);

router.patch("/:userId/role", updateAdminUserRole);

router.delete("/:userId", deleteAdminUser);

export default router;