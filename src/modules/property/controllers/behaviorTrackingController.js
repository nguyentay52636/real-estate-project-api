import behaviorTrackingService from '#modules/property/services/behaviorTrackingService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

function clientIp(req) {
  return (
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || ''
  );
}

const behaviorTrackingController = {
  trackBehavior: asyncHandler(async (req, res) => {
    const result = await behaviorTrackingService.trackBehavior(
      req.params.id,
      {
        action: req.body.action,
        metadata: req.body.metadata,
        sessionId: req.body.sessionId || req.headers['x-session-id'],
      },
      {
        viewerId: req.authUser?.id || null,
        ip: clientIp(req),
        userAgent: req.headers['user-agent'] || '',
      },
    );
    return res.status(201).json(result);
  }),

  getBehaviors: asyncHandler(async (req, res) => {
    const result = await behaviorTrackingService.getBehaviors(
      req.params.id,
      req.authUser,
      req.query,
    );
    return res.status(200).json(result);
  }),

  getLeads: asyncHandler(async (req, res) => {
    const result = await behaviorTrackingService.getLeads(
      req.params.id,
      req.authUser,
      req.query,
    );
    return res.status(200).json(result);
  }),

  getAnalytics: asyncHandler(async (req, res) => {
    const result = await behaviorTrackingService.getAnalytics(
      req.params.id,
      req.authUser,
      req.query,
    );
    return res.status(200).json(result);
  }),

  updateLeadStatus: asyncHandler(async (req, res) => {
    const result = await behaviorTrackingService.updateLeadStatus(
      req.params.id,
      req.body.status,
      req.authUser,
    );
    return res.status(200).json(result);
  }),

  updateLeadNote: asyncHandler(async (req, res) => {
    const result = await behaviorTrackingService.updateLeadNote(
      req.params.id,
      req.body.note,
      req.authUser,
    );
    return res.status(200).json(result);
  }),
};

export default behaviorTrackingController;
