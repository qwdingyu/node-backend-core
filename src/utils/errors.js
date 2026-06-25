class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'NOT_FOUND') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message = 'INVALID_PARAMS') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'UNAUTHORIZED') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'FORBIDDEN') {
    super(message, 403, 'FORBIDDEN_ERROR');
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  ForbiddenError
};