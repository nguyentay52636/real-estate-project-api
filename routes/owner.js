import express from 'express';
import { getOwners,
  getOwnerById,
  createOwner,
  updateOwner,
  deleteOwner, } from '../controllers/ownerController.js';

const router = express.Router();

router.get("/", getOwners);
router.get("/:id", getOwnerById);
router.post("/", createOwner);
router.put("/:id", updateOwner);
router.delete("/:id", deleteOwner);

export default router;
