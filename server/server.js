const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Path to final.json
const FINAL_JSON_PATH = path.join(__dirname, '..', 'data', 'final.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, '..', 'data'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'data'));
}

// Initialize final.json if it doesn't exist
if (!fs.existsSync(FINAL_JSON_PATH)) {
    fs.writeFileSync(FINAL_JSON_PATH, '[]');
    console.log('✅ Created final.json file');
}

// Route to append data to final.json
app.post('/append-data', (req, res) => {
    try {
        const newData = req.body;

        // Read existing data
        let existingData = [];
        try {
            const fileContent = fs.readFileSync(FINAL_JSON_PATH, 'utf8');
            existingData = JSON.parse(fileContent);
            if (!Array.isArray(existingData)) {
                existingData = [];
            }
        } catch (error) {
            console.log('⚠️ Could not read existing data, starting fresh');
            existingData = [];
        }

        // Check for duplicates (by post ID)
        const existingIds = new Set(existingData.map(item => item.post?.id).filter(id => id));
        const filteredNewData = newData.filter(item => {
            const postId = item.post?.id;
            if (!postId) return true; // Keep items without ID
            if (existingIds.has(postId)) {
                console.log(`⚠️ Skipping duplicate post: ${postId}`);
                return false;
            }
            return true;
        });

        // Append new data
        const updatedData = [...existingData, ...filteredNewData];

        // Write back to file
        fs.writeFileSync(FINAL_JSON_PATH, JSON.stringify(updatedData, null, 2));

        console.log(`✅ Appended ${filteredNewData.length} new posts to final.json (Total: ${updatedData.length})`);

        res.json({
            success: true,
            appended: filteredNewData.length,
            duplicatesSkipped: newData.length - filteredNewData.length,
            total: updatedData.length
        });

    } catch (error) {
        console.error('❌ Error appending data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route to get current data
app.get('/get-data', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(FINAL_JSON_PATH, 'utf8'));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to clear data
app.post('/clear-data', (req, res) => {
    try {
        fs.writeFileSync(FINAL_JSON_PATH, '[]');
        console.log('🗑️ Cleared final.json');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Data server running on http://localhost:${PORT}`);
    console.log(`📁 final.json location: ${FINAL_JSON_PATH}`);
    console.log(`📊 Endpoints:`);
    console.log(`   POST /append-data - Append new data`);
    console.log(`   GET  /get-data    - Get current data`);
    console.log(`   POST /clear-data  - Clear all data`);
    console.log(`   GET  /health      - Health check`);
}).on('error', (err) => {
    console.error('❌ Server failed to start:', err.message);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
