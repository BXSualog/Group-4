const fs = require('fs');
const FileType = require('file-type');

/**
 * File Type Validation Middleware
 * @param {string[]} allowedMimes - Array of allowed MIME types
 */
const validateFile = (allowedMimes) => async (req, res, next) => {
    if (!req.file) return next();

    try {
        const type = await FileType.fromFile(req.file.path);

        if (!type || !allowedMimes.includes(type.mime)) {
            // Delete the invalid file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: 'Invalid file type',
                details: `Only ${allowedMimes.join(', ')} are allowed. Detected: ${type ? type.mime : 'unknown'}`
            });
        }
        next();
    } catch (error) {
        console.error('File validation error:', error);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'File validation failed' });
    }
};

module.exports = { validateFile };
