/**
 * Safely access nested object properties
 * @param {Object} obj 
 * @param {string} path 
 * @param {any} defaultValue 
 * @returns {any}
 */
function getNestedValue(obj, path, defaultValue = null) {
    if (!obj || !path) return defaultValue;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (current == null) return defaultValue;
        const arrayMatch = key.match(/(\w+)\[(\d+)\]/);
        if (arrayMatch) {
            current = current[arrayMatch[1]]?.[parseInt(arrayMatch[2])];
        } else {
            current = current[key];
        }
    }
    return current === undefined ? defaultValue : current;
}

module.exports = { getNestedValue };
