import express from 'express';
import authRouter from './auth.js';
import propertyRouter from './property.js';
import reviewRouter from './review.js';
import userRouter from './user.js';
import viewingsRouter from './viewings.js';
import favoriteRouter from './favorite.js';
import employeeRouter from './employee.js';
import ownerRouter from './owner.js';
import roleRouter from './role.js';
import customerRouter from './customer.js';
import messageRouter from './message.js';
import roomRouter from './room.js';
import notificationRouter from './notificationChat.js';
import aiChatRouter from './aiChat.js';
import uploadRouter from './upload.js';
import crmKnowledgeRouter from './crmKnowledge.js';
import crmKnowledgeCatalogRouter from './crmKnowledgeCatalog.js';

const router = express.Router();

router.use("/owner",ownerRouter)
router.use("/favorite", favoriteRouter);
router.use("/user", userRouter);
router.use("/auth", authRouter);
router.use("/property", propertyRouter);
router.use("/review", reviewRouter);
router.use("/viewing", viewingsRouter);
router.use("/employee", employeeRouter);
router.use("/role", roleRouter);
router.use("/customer", customerRouter);
router.use("/message", messageRouter);
router.use("/notification", notificationRouter);
router.use("/room", roomRouter);
router.use("/ai-chat", aiChatRouter);
router.use("/upload", uploadRouter);
router.use("/crm-knowledge", crmKnowledgeRouter);
router.use("/crm-knowledge-catalog", crmKnowledgeCatalogRouter);

export default router;
