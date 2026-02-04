const { spawn } = require('child_process');
const path = require('path');

/**
 * Executes the Python Deep Scan script and returns the result as JSON.
 * @param {string} imagePath Absolute path to the image file.
 * @returns {Promise<Object>}
 */
function runDeepScan(imagePath) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '..', 'ai', 'deep_doctor.py');
        // Use 'py' on Windows for the standard Python launcher
        const pythonProcess = spawn('py', [scriptPath, imagePath]);

        let dataString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`[PythonBridge] Script exited with code ${code}. Error: ${errorString}`);
                return resolve({
                    status: 'error',
                    message: 'Python analysis failed to execute.',
                    details: errorString
                });
            }

            try {
                const result = JSON.parse(dataString.trim());
                resolve(result);
            } catch (err) {
                console.error(`[PythonBridge] Failed to parse Python output: ${dataString}`);
                resolve({
                    status: 'error',
                    message: 'Invalid response from analysis engine.'
                });
            }
        });
    });
}

module.exports = { runDeepScan };
