const { parentPort } = require('worker_threads');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

parentPort.on('message', ({ inputPath, outputPath }) => {
    const startTime = Date.now();
    try {
        const data = fs.readFileSync(inputPath);
        const compressed = zlib.brotliCompressSync(data);
        // Temp directory to write to, so entire file is written before appearing in output.
        const tempOutputPath = path.join('./temp', path.basename(inputPath) + '.br');
        fs.mkdirSync("./temp",{recursive:true});
        fs.writeFileSync(tempOutputPath, compressed);

        // Now that file is completely written, move output file to out and remove original file.
        const finalOutputPath = path.join(outputPath, path.basename(inputPath) + '.br');
        fs.renameSync(tempOutputPath, finalOutputPath);
        fs.unlinkSync(inputPath);

        const endTime = Date.now();
        parentPort.postMessage({ 
            inputPath, 
            status: 'done', 
            duration: (endTime - startTime) / 1000 // Duration in seconds
        });
    } catch (error) {
        parentPort.postMessage({ 
            inputPath, 
            status: 'error', 
            error: error.message 
        });
    }
});

