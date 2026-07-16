/**
 * Lỗi nghiệp vụ có HTTP status — service throw, controller map sang response.
 * Giúp tách logic khỏi Express và dễ assert trong unit test.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export function isAppError(error) {
  return error instanceof AppError || (error?.name === 'AppError' && typeof error.statusCode === 'number');
}

export default AppError;
