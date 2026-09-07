import { HttpStatus } from '@nestjs/common';

/**
 * Standard Application Error Codes
 */
export enum ErrorCode {
  // Authentication & Session
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_LOCKED = 'AUTH_ACCOUNT_LOCKED',
  AUTH_ACCOUNT_INACTIVE = 'AUTH_ACCOUNT_INACTIVE',
  AUTH_RATE_LIMITED = 'AUTH_RATE_LIMITED',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',

  // Validation
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_GATEWAY = 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Standard Status Codes and Messages Map
 */
export const STATUS_CODES = {
  OK: {
    code: HttpStatus.OK,
    status: 'OK',
    defaultMessage: 'Request processed successfully',
  },
  CREATED: {
    code: HttpStatus.CREATED,
    status: 'CREATED',
    defaultMessage: 'Resource created successfully',
  },
  ACCEPTED: {
    code: HttpStatus.ACCEPTED,
    status: 'ACCEPTED',
    defaultMessage: 'Request accepted for processing',
  },
  NO_CONTENT: {
    code: HttpStatus.NO_CONTENT,
    status: 'NO_CONTENT',
    defaultMessage: 'No content',
  },
  BAD_REQUEST: {
    code: HttpStatus.BAD_REQUEST,
    status: 'BAD_REQUEST',
    errorCode: ErrorCode.VALIDATION_FAILED,
    defaultMessage: 'Invalid input parameters or malformed request',
  },
  UNAUTHORIZED: {
    code: HttpStatus.UNAUTHORIZED,
    status: 'UNAUTHORIZED',
    errorCode: ErrorCode.AUTH_UNAUTHORIZED,
    defaultMessage: 'Authentication required or invalid credentials',
  },
  FORBIDDEN: {
    code: HttpStatus.FORBIDDEN,
    status: 'FORBIDDEN',
    errorCode: ErrorCode.AUTH_FORBIDDEN,
    defaultMessage: 'Access denied: insufficient permissions',
  },
  NOT_FOUND: {
    code: HttpStatus.NOT_FOUND,
    status: 'NOT_FOUND',
    errorCode: ErrorCode.RESOURCE_NOT_FOUND,
    defaultMessage: 'Requested resource not found',
  },
  CONFLICT: {
    code: HttpStatus.CONFLICT,
    status: 'CONFLICT',
    errorCode: ErrorCode.RESOURCE_ALREADY_EXISTS,
    defaultMessage: 'Resource already exists or conflict occurred',
  },
  LOCKED: {
    code: 423,
    status: 'LOCKED',
    errorCode: ErrorCode.AUTH_ACCOUNT_LOCKED,
    defaultMessage: 'Account or resource is locked',
  },
  UNPROCESSABLE_ENTITY: {
    code: HttpStatus.UNPROCESSABLE_ENTITY,
    status: 'UNPROCESSABLE_ENTITY',
    errorCode: ErrorCode.VALIDATION_FAILED,
    defaultMessage: 'Validation failed on entity fields',
  },
  TOO_MANY_REQUESTS: {
    code: HttpStatus.TOO_MANY_REQUESTS,
    status: 'TOO_MANY_REQUESTS',
    errorCode: ErrorCode.AUTH_RATE_LIMITED,
    defaultMessage: 'Rate limit exceeded. Please try again shortly',
  },
  INTERNAL_SERVER_ERROR: {
    code: HttpStatus.INTERNAL_SERVER_ERROR,
    status: 'INTERNAL_SERVER_ERROR',
    errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
    defaultMessage: 'An unexpected internal server error occurred',
  },
} as const;

export enum UserStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
  LOCKED = 'LOCKED',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HR_ADMIN = 'HR_ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}
