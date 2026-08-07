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
import propertyPostRouter from '#modules/property/routes/propertyPost.routes.js';
import leadRouter from '#modules/property/routes/lead.routes.js';
import dealRouter from '#modules/deal/routes/deal.routes.js';
import teamRouter from '#modules/deal/routes/team.routes.js';
import contractRouter from '#modules/deal/routes/contract.routes.js';
import contactRouter from '#modules/contact/routes/contact.routes.js';
import auditRouter from '#modules/audit/routes/audit.routes.js';
import webrtcRouter from '#modules/chat/routes/webrtc.routes.js';

const router = express.Router();

router.use("/owner",ownerRouter)
router.use("/contact", contactRouter);
router.use("/audit", auditRouter);
router.use("/webrtc", webrtcRouter);
router.use("/deal", dealRouter);
router.use("/team", teamRouter);
router.use("/contract", contractRouter);
router.use("/favorite", favoriteRouter);
router.use("/user", userRouter);
router.use("/auth", authRouter);
router.use("/property", propertyRouter);
router.use("/properties", propertyRouter);
router.use("/property-post", propertyPostRouter);
router.use("/property-posts", propertyPostRouter);
router.use("/lead", leadRouter);
router.use("/review", reviewRouter);
router.use("/viewing", viewingsRouter);
router.use("/employee", employeeRouter);
router.use("/role", roleRouter);
router.use("/customer", customerRouter);
router.use("/message", messageRouter);
router.use("/notification", notificationRouter);
router.use("/notifications", notificationRouter); // alias swagger / FE cũ
router.use("/room", roomRouter);
router.use("/ai-chat", aiChatRouter);
router.use("/upload", uploadRouter);
router.use("/crm-knowledge", crmKnowledgeRouter);
router.use("/crm-knowledge-catalog", crmKnowledgeCatalogRouter);

export default router;
