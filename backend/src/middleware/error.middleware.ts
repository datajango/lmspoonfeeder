import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string = 'Bad request') {
        super(message, 400);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401);
    }
}

export class ProviderConnectionError extends AppError {
    constructor(provider: string, message: string = 'Failed to connect to provider') {
        super(`${provider}: ${message}`, 503);
    }
}

export class TaskProcessingError extends AppError {
    constructor(taskId: string, message: string) {
        super(`Task ${taskId}: ${message}`, 500);
    }
}

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
        });
        return;
    }

    // Log unexpected errors
    console.error('Unexpected error:', err);

    res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
}
