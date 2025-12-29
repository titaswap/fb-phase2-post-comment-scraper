export function walkObject(obj, callback) {
    if (!obj || typeof obj !== 'object') return;
    callback(obj);
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            walkObject(obj[key], callback);
        }
    }
}
