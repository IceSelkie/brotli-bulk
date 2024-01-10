#!node

const { Worker } = require('worker_threads');
const os = require('os');
const fs = require('fs');
const path = require('path');

const numCores = os.cpus().length;
var workers = []; // mutable to remove elements later
const tasks = [];
const processedFiles = new Set();
console.log(`${numCores} cores detected. Allowing ${numCores/2} concurrent worker threads.`);

const inputDir = './input';
const outputDir = './output';

// Ensure directories exist
fs.mkdirSync(inputDir, {recursive:true});
fs.mkdirSync(outputDir, {recursive:true});

// Create a new Worker with callback
function createWorker() {
    const worker = new Worker('./compressWorker.js');
    worker.on('message', (message) => {
        console.log(`Worker finished processing ${message.inputPath}, Status: ${message.status}, Duration: ${message.duration} seconds`);
        if (tasks.length > 0) {
            const nextTask = tasks.shift();
            console.log(`Worker continuing with ${JSON.stringify(nextTask)} (${tasks.length} tasks in queue)`);
            worker.postMessage(nextTask);
        } else {
            console.log(`Worker thread stopping... No more work. Workers: ${workers.length}-1`);
            worker.terminate();
            // Remove this worker from the worker list.
            workers = workers.filter(w=>w!=worker);
            console.log(`Workers now ${workers.length}`);
        }
    });
    return worker;
}

// Assign tasks to workers
function assignTasks(filePath) {
    const task = { inputPath: filePath, outputPath: outputDir };
    if (workers.length < numCores/2) {
        const worker = createWorker();
        console.log(`Creating new worker for ${JSON.stringify(task)}. Workers: ${workers.length}+1`);
        worker.postMessage(task);
        workers.push(worker);
    } else {
        tasks.push(task);
        console.log(`Waiting on workers. Added ${JSON.stringify(task)} to the queue (${tasks.length} tasks in queue)`);
    }
}

// Check for new files and add them to the queue
function checkForNewFiles() {
    const files = fs.readdirSync(inputDir);
    files.forEach(file => {
        const filePath = path.join(inputDir, file);
        if (!processedFiles.has(filePath)) {
            processedFiles.add(filePath);
            console.log(`Found ${filePath}!`);
            // Wait 5 seconds to ensure file is fully uploaded.
            // If server is slow due to processing other files, then it should end up in the queue,
            // and thus have much more time to finish uploading.
            setTimeout(() => assignTasks(filePath), 5000);
        }
    });
}

// Periodically check for new files every 2.5 seconds
setInterval(checkForNewFiles, 2500);

checkForNewFiles();

