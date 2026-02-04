const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');
const lines = content.split('\n');
const start = 370;
const end = 390;
console.log("Lines 370 to 390 of server.js:");
for (let i = start; i <= end; i++) {
    console.log(`${i}: ${lines[i - 1]}`);
}
