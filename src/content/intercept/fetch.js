import { processGraphQLResponse } from '../extract/processor.js';

export function interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        response.clone().text().then(text => {
            if (text.includes('story') || text.includes('post') || args[0]?.includes('graphql')) {
                try {
                    processGraphQLResponse(JSON.parse(text));
                } catch (e) { }
            }
        });
        return response;
    };
}
