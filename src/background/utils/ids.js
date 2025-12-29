export function extractNumericId(url) {
    if (!url) return null;
    const match = url.match(/(?:\/posts\/|\/permalink\/|\/groups\/[^/]+\/user\/)(\d+)/);
    if (!match) {
        const simpleMatch = url.match(/(\d+)\/?$/);
        return simpleMatch ? simpleMatch[1] : null;
    }
    return match ? match[1] : null;
}
