import { encryptPayload } from '#shared/utils/cryptoPayload.js';

/**
 * Middleware that encrypts JSON response payload into a single { encrypted: true, payload: '...' } string.
 * This completely hides plain-text JSON objects (like users, properties, messages) from DevTools Network Tab.
 *
 * Enabled if:
 * 1. RESPONSE_ENCRYPT_ENABLE is 'true' (or defaulted to true if RESPONSE_ENCRYPT_ENABLE is not 'false'), OR
 * 2. Client passes 'x-encrypt-payload: true' or 'x-encrypt-payload: 1' header, OR
 * 3. Client passes query param '?encrypt=true'
 */
export function encryptResponseMiddleware(req, res, next) {
  const envVal = process.env.RESPONSE_ENCRYPT_ENABLE;
  // Enabled by default unless explicitly disabled with RESPONSE_ENCRYPT_ENABLE=false
  const isGlobalEnabled = envVal === 'true' || envVal === undefined;
  const headerValue = req.headers['x-encrypt-payload'];
  const queryValue = req.query.encrypt;

  const isClientRequested =
    headerValue === 'true' ||
    headerValue === '1' ||
    queryValue === 'true' ||
    queryValue === '1';

  const isClientDisabled =
    headerValue === 'false' ||
    headerValue === '0' ||
    queryValue === 'false' ||
    queryValue === '0';

  if ((!isGlobalEnabled && !isClientRequested) || isClientDisabled) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    if (!body || typeof body !== 'object' || body.encrypted === true) {
      return originalJson(body);
    }

    // Encrypt the ENTIRE response body into payload hex string
    // Completely masks plain-text fields (users, properties, message, etc.) from DevTools Network Tab
    const encryptedPayloadStr = encryptPayload(body);

    return originalJson({
      encrypted: true,
      payload: encryptedPayloadStr,
    });
  };

  next();
}
