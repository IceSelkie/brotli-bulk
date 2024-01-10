#!/usr/local/bin/node
const fs = require("fs");
const zlib = require("zlib");
const createHash = require('crypto').createHash;
const sha256 = buff => createHash("sha256").update(buff).digest("hex");

console.log(sha256(zlib.brotliDecompressSync(fs.readFileSync(process.argv[2]))));
