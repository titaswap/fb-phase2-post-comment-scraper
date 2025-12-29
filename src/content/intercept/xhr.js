import { processGraphQLResponse } from '../extract/processor.js';

export function interceptXHR() {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        this.addEventListener("load", () => {
            if (this.responseText && (
                url.includes('graphql') ||
                url.includes('api') ||
                this.responseText.includes('story')
            )) {
                try {
                    processGraphQLResponse(JSON.parse(this.responseText));
                } catch (e) { }
            }
        });
        return originalOpen.apply(this, arguments);
    };
}
