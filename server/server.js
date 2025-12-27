const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { processRawData } = require('../process_formatted_posts');

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Path to formatted_posts_final.json
const DATA_DIR = path.join(__dirname, '..', 'data');
const FINAL_JSON_PATH = path.join(DATA_DIR, 'formatted_posts_final.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, '..', 'data'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'data'));
}

// Initialize file if it doesn't exist
if (!fs.existsSync(FINAL_JSON_PATH)) {
    fs.writeFileSync(FINAL_JSON_PATH, '[]');
    console.log('✅ Created formatted_posts_final.json file');
}

// Route to process and append data
app.post('/append-data', (req, res) => {
    try {
        const rawData = req.body;
        console.log(`📥 Received ${Array.isArray(rawData) ? rawData.length : 1} raw items`);

        // Process the raw data immediately
        const processedNewData = processRawData(rawData);
        console.log(`🔄 Processed into ${processedNewData.length} formatted posts`);

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

        const filteredNewData = processedNewData.filter(item => {
            const postId = item.post?.id;
            if (!postId) return true; // Keep items without ID (rare)
            if (existingIds.has(postId)) {
                console.log(`⚠️ Skipping duplicate post: ${postId}`);
                return false;
            }
            return true;
        });

        if (filteredNewData.length === 0) {
            console.log('ℹ️ No new data to append after duplicate check');
            return res.json({
                success: true,
                appended: 0,
                message: "No new posts to add"
            });
        }

        // Append new data
        const updatedData = [...existingData, ...filteredNewData];

        // Write back to file
        fs.writeFileSync(FINAL_JSON_PATH, JSON.stringify(updatedData, null, 2));

        console.log(`✅ Appended ${filteredNewData.length} new processed posts to formatted_posts_final.json (Total: ${updatedData.length})`);

        res.json({
            success: true,
            appended: filteredNewData.length,
            duplicatesSkipped: processedNewData.length - filteredNewData.length,
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
        console.log('🗑️ Cleared formatted_posts_final.json');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Endpoint to get all processed URLs for client-side deduplication
app.get('/get-processed-urls', (req, res) => {
    try {
        const finalPath = path.join(DATA_DIR, 'formatted_posts_final.json');
        if (!fs.existsSync(finalPath)) {
            return res.json({ success: true, urls: [] });
        }

        const rawData = fs.readFileSync(finalPath, 'utf8');
        const posts = JSON.parse(rawData);

        // Extract URLs or IDs
        // We will return URLs, but ideally we should extract the numeric ID if possible
        // Let's return the full URLs and let the client handle ID extraction for matching
        const urls = posts
            .filter(item => item.post && item.post.url)
            .map(item => item.post.url);

        res.json({ success: true, urls: urls });
    } catch (error) {
        console.error('❌ Error fetching processed URLs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📂 Data directory: ${DATA_DIR}`);
}).on('error', (err) => {
    console.error('❌ Server failed to start:', err.message);
    process.exit(1);
});
