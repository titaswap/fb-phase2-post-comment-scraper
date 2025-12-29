const app = require('./app');
const { PORT, DATA_DIR } = require('./config/constants');
const { initServerFiles } = require('./logic/init');

initServerFiles();

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📂 Data directory: ${DATA_DIR}`);
});
