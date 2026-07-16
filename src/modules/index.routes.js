import express from 'express';
import authRouter from '#modules/auth/routes/auth.routes.js';
import propertyRouter from '#modules/property/routes/property.routes.js';
import reviewRouter from '#modules/property/routes/review.routes.js';
import userRouter from '#modules/users/routes/user.routes.js';
import viewingsRouter from '#modules/property/routes/viewings.routes.js';
import favoriteRouter from '#modules/property/routes/favorite.routes.js';
import employeeRouter from '#modules/users/routes/employee.routes.js';
import ownerRouter from '#modules/users/routes/owner.routes.js';
import roleRouter from '#modules/users/routes/role.routes.js';
import customerRouter from '#modules/users/routes/customer.routes.js';
import messageRouter from '#modules/chat/routes/message.routes.js';
import roomRouter from '#modules/chat/routes/room.routes.js';
import notificationRouter from '#modules/chat/routes/notification.routes.js';
import aiChatRouter from '#modules/ai/routes/aiChat.routes.js';
import uploadRouter from '#modules/upload/routes/upload.routes.js';
import crmKnowledgeRouter from '#modules/ai/routes/crmKnowledge.routes.js';
import crmKnowledgeCatalogRouter from '#modules/ai/routes/crmKnowledgeCatalog.routes.js';

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
