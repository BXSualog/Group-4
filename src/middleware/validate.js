const { ZodError } = require('zod');

/**
 * Middleware factory that validates request body against a Zod schema
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
function validate(schema) {
    return (req, res, next) => {
        try {
            // Parse and validate the request body
            const validated = schema.parse(req.body);

            // Replace body with validated (and potentially transformed) data
            req.body = validated;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // Format Zod errors nicely
                const errors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));

                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors
                });
            }

            // Re-throw non-Zod errors
            throw error;
        }
    };
}

/**
 * Validate query parameters
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
function validateQuery(schema) {
    return (req, res, next) => {
        try {
            const validated = schema.parse(req.query);
            req.query = validated;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));

                return res.status(400).json({
                    error: 'Invalid query parameters',
                    details: errors
                });
            }
            throw error;
        }
    };
}

module.exports = { validate, validateQuery };
