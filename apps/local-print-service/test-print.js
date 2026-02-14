
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PRINTER_NAME = "POS58"; // Adjust if needed
const TEST_TEXT = "Hola Mundo\nIMPRESION DE PRUEBA\n\n\n\x1dV\x41\x00"; // Includes cut command

function testPrint() {
    const tempFile = path.join(os.tmpdir(), `test_print_${Date.now()}.txt`);
    fs.writeFileSync(tempFile, TEST_TEXT);

    const command = `lp -d "${PRINTER_NAME}" -o raw "${tempFile}"`;
    console.log(`Executing: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        console.log(`Stdout: ${stdout}`);
        console.log(`Stderr: ${stderr}`);
        console.log("Print command sent successfully.");
    });
}

testPrint();
