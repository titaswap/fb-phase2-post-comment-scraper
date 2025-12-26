// Script to update final.json from extension data
// Run this with: node update-final.js

const fs = require('fs');
const path = require('path');

// This script would need to access chrome.storage.local data
// Since we can't access it directly from Node.js, this is just a template

console.log('To update final.json:');
console.log('1. Open Chrome DevTools (F12)');
console.log('2. Go to Application tab > Storage > Local Storage');
console.log('3. Find the extension storage');
console.log('4. Copy the "final" key value');
console.log('5. Paste it into data/final.json');
console.log('');
console.log('Or use the "Update final.json" button in the extension to copy data manually.');