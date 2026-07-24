import { registerJobHandler } from '#infra/queue/jobQueue.js';
import { sendPasswordResetEmail } from '#shared/utils/sendMail.js';
import logger from '#shared/utils/logger.js';
import { refreshPropertyEmbedding } from '#modules/ai/services/propertyAiCatalog.js';
import { clearCatalogCache } from '#modules/ai/services/crmKnowledgeCatalogClient.js';

export const JOB_SEND_PASSWORD_RESET = 'email:password-reset';
export const JOB_BEHAVIOR_TRACK = 'behavior:track';
export const JOB_PROPERTY_EMBED = 'property:embed';

registerJobHandler(JOB_SEND_PASSWORD_RESET, async (payload) => {
  await sendPasswordResetEmail(payload);
  logger.info(`[Job] password-reset email sent to ${payload.email}`);
});

/**
 * Behavior track heavy path có thể đăng ký handler ở module property khi boot.
 * Placeholder để queue name ổn định.
 */
registerJobHandler(JOB_BEHAVIOR_TRACK, async (payload) => {
  logger.debug(`[Job] behavior:track ${payload?.action || ''} property=${payload?.propertyId || ''}`);
});

registerJobHandler(JOB_PROPERTY_EMBED, async (payload) => {
  const id = payload?.propertyId;
  if (!id) return;
  await refreshPropertyEmbedding(id);
  clearCatalogCache();
  logger.info(`[Job] property:embed done ${id}`);
});

export default {
  JOB_SEND_PASSWORD_RESET,
  JOB_BEHAVIOR_TRACK,
  JOB_PROPERTY_EMBED,
};
