import { NotFoundError } from './errorHandler.js';

export function notFoundHandler(req, res, next) {
    next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}

export default notFoundHandler;
