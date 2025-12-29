import { interceptXHR } from './intercept/xhr.js';
import { interceptFetch } from './intercept/fetch.js';
import { setupDOMObservers } from './extract/dom.js';

console.log("[FB Extractor] Booting Micro-Modules...");

interceptXHR();
interceptFetch();
setupDOMObservers();

// Reset on navigation
let currentUrl = window.location.href;
new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        // Ideally reset state here, but simple module reload is hard without navigation.
        // We rely on new page load or just accept accumulating state until next navigation.
    }
}).observe(document, { childList: true, subtree: true });
