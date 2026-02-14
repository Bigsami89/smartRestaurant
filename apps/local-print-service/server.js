const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    const printerName = req.query.p;
    const dataEncoded = req.query.d; // Expecting Base64 from our backend

    if (!printerName || !dataEncoded) {
        return res.status(400).send('Missing parameters: p (printer name) or d (base64 data)');
    }

    // Decode Base64 to Buffer
    const rawData = Buffer.from(dataEncoded, 'base64');

    printRaw(printerName, rawData)
        .then(() => res.send('Printed successfully'))
        .catch(err => {
            console.error(err);
            res.status(500).send(err.toString());
        });
});

app.get('/print', (req, res) => {
    // Alias for / to match some legacy or alternative implementations
    res.redirect(307, `/?${new URLSearchParams(req.query).toString()}`);
});

function printRaw(printerName, data) {
    return new Promise((resolve, reject) => {
        const tempFile = path.join(os.tmpdir(), `ticket_${Date.now()}.bin`);

        // 1. Write bytes to temp file
        fs.writeFileSync(tempFile, data);

        // 2. Send to printer
        let command = '';
        if (printerName.startsWith('/')) {
            // Direct device writing (Linux/Unix)
            // e.g. /dev/usb/lp0
            const cmd = `cat "${tempFile}" > "${printerName}"`;
            console.log(`Executing direct write: ${cmd}`);

            exec(cmd, (error, stdout, stderr) => {
                try { fs.unlinkSync(tempFile); } catch (e) { }
                if (error) {
                    console.error(`Direct write error: ${error.message}`);
                    reject(error.message);
                } else {
                    resolve();
                }
            });
            return;
        }

        if (process.platform === 'win32') {
            // Windows: COPY /B file \\Computer\Printer
            command = `COPY /B "${tempFile}" "\\\\localhost\\${printerName}"`;
        } else {
            // Linux/Mac: lp -d "Printer" -o raw "file"
            command = `lp -d "${printerName}" -o raw "${tempFile}"`;
        }

        console.log(`Executing: ${command}`);

        exec(command, (error, stdout, stderr) => {
            try {
                fs.unlinkSync(tempFile); // Cleanup
            } catch (e) {
                console.error("Failed to delete temp file:", e);
            }

            if (error) {
                console.error(`Exec error: ${error.message}`);
                console.error(`Stderr: ${stderr}`);
                reject(error.message);
                return;
            }
            console.log(`Stdout: ${stdout}`);
            console.log(`Stderr: ${stderr}`);
            resolve();
        });
    });
}

const PORT = 9100;
app.listen(PORT, () => {
    console.log(`Local Print Service running on port ${PORT}`);
    console.log(`Test URL: http://localhost:${PORT}/?p=PRINTER_NAME&d=BASE64_DATA`);
});
