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
// Route to process and append data
app.post('/append-data', (req, res) => {
    try {
        const rawData = req.body; // Can be an array or single object
        const rawDataArray = Array.isArray(rawData) ? rawData : [rawData];
        console.log(`📥 Received ${rawDataArray.length} raw items`);

        // --- BACKUP RAW DATA LOGIC ---
        const BACKUP_DIR = path.join(DATA_DIR, 'backup');
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR);
        }

        const RAW_BACKUP_PATH = path.join(BACKUP_DIR, 'raw_posts_backup.json');

        // Configuration for rotation
        const MAX_BACKUP_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

        // Initialize backup file if needed
        if (!fs.existsSync(RAW_BACKUP_PATH)) {
            fs.writeFileSync(RAW_BACKUP_PATH, '[]');
        } else {
            // Check size and rotate if necessary
            try {
                const stats = fs.statSync(RAW_BACKUP_PATH);
                if (stats.size > MAX_BACKUP_SIZE_BYTES) {
                    // Find next incremental number
                    const files = fs.readdirSync(BACKUP_DIR);
                    let maxNum = 0;
                    const regex = /^raw_posts_backup_(\d+)\.json$/;

                    files.forEach(file => {
                        const match = file.match(regex);
                        if (match) {
                            const num = parseInt(match[1], 10);
                            if (num > maxNum) maxNum = num;
                        }
                    });

                    const nextNum = maxNum + 1;
                    const newPath = path.join(BACKUP_DIR, `raw_posts_backup_${nextNum}.json`);

                    fs.renameSync(RAW_BACKUP_PATH, newPath);
                    fs.writeFileSync(RAW_BACKUP_PATH, '[]'); // Start fresh
                    console.log(`📦 Rotated backup file: ${path.basename(newPath)} (Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                }
            } catch (err) {
                console.error('⚠️ Error checking backup file size/rotation:', err);
            }
        }

        let existingRawData = [];
        try {
            existingRawData = JSON.parse(fs.readFileSync(RAW_BACKUP_PATH, 'utf8'));
            if (!Array.isArray(existingRawData)) existingRawData = [];
        } catch (e) {
            existingRawData = [];
        }

        // Helper to extract ID from raw item
        const getRawId = (item) => {
            if (item?.post?.id) return item.post.id;
            if (item?.id) return item.id;
            return null;
        };

        const existingRawIds = new Set(existingRawData.map(getRawId).filter(id => id));

        const newRawItems = rawDataArray.filter(item => {
            const id = getRawId(item);
            if (!id) return true; // Keep if no ID found (safer to keep)
            if (existingRawIds.has(id)) return false;
            return true;
        });

        if (newRawItems.length > 0) {
            const updatedRawData = [...existingRawData, ...newRawItems];
            fs.writeFileSync(RAW_BACKUP_PATH, JSON.stringify(updatedRawData, null, 2));
            console.log(`💾 Backed up ${newRawItems.length} new raw items to raw_posts_backup.json`);
        } else {
            console.log(`ℹ️ All received raw items already exist in backup.`);
        }
        // -----------------------------


        // Process the raw data immediately (Standard Logic)
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

        // Merge Strategy: Update existing posts with new comments or add new posts
        let updatedCount = 0;
        let appendedCount = 0;

        processedNewData.forEach(newItem => {
            const newItemId = newItem.post?.id;
            if (!newItemId) {
                // No ID, treat as new (rare)
                existingData.push(newItem);
                appendedCount++;
                return;
            }

            const existingIndex = existingData.findIndex(item => item.post?.id === newItemId);

            if (existingIndex !== -1) {
                // Post exists! Merge comments.
                const existingItem = existingData[existingIndex];
                const existingComments = existingItem.comments || [];
                const newComments = newItem.comments || [];

                // Comment Deduplication Map
                const commentMap = new Map();

                // Add existing comments to map
                existingComments.forEach(c => commentMap.set(c.id, c));

                // Add NEW comments to map (overwriting if ID matches, or adding if new)
                let addedComments = 0;
                newComments.forEach(c => {
                    if (!commentMap.has(c.id)) {
                        commentMap.set(c.id, c);
                        addedComments++;
                    }
                });

                if (addedComments > 0) {
                    console.log(`🔄 Merging ${addedComments} new comments into existing Post ${newItemId}`);
                    // Convert map back to array
                    existingItem.comments = Array.from(commentMap.values());
                    // Update the item in the main array
                    existingData[existingIndex] = existingItem;
                    updatedCount++;
                } else {
                    console.log(`ℹ️ Post ${newItemId} exists but no new unique comments found.`);
                }

            } else {
                // New Post
                existingData.push(newItem);
                appendedCount++;
            }
        });

        // Write back to file
        fs.writeFileSync(FINAL_JSON_PATH, JSON.stringify(existingData, null, 2));

        console.log(`✅ Sync Complete: Appended ${appendedCount} new posts, Updated ${updatedCount} existing posts. Total: ${existingData.length}`);

        res.json({
            success: true,
            appended: appendedCount,
            updated: updatedCount,
            total: existingData.length
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
