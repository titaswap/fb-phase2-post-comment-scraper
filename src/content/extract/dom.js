import { processGraphQLResponse } from './processor.js';

function checkElementForData(element) {
    if (element.textContent && element.textContent.includes('story')) {
        try {
            // Simple check or regex match for JSON
            const match = element.textContent.match(/(\{.*\}|\[.*\])/s);
            if (match) processGraphQLResponse(JSON.parse(match[0]));
        } catch (e) { }
    }
}

export function setupDOMObservers() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.tagName === 'SCRIPT') checkElementForData(node);
            });
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Initial check
    document.querySelectorAll('script').forEach(checkElementForData);
}
