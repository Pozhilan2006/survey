import { validationResult } from 'express-validator';
import { ValidationError } from './errorHandler.js';

export function validate(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
        }));

        throw new ValidationError('Validation failed', formattedErrors);
    }

    next();
}

export default validate;
