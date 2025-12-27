// page_interceptor.js
console.log("[PAGE] interceptor loaded");

(function () {
    function sendToContent(data) {
        window.postMessage(
            { type: "FB_GRAPHQL_RAW", payload: data },
            "*"
        );
    }

    // FETCH
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
        const url = args[0];
        return originalFetch.apply(this, args).then(res => {
            if (typeof url === "string" && url.includes("graphql")) {
                res.clone().text().then(t => {
                    try {
                        sendToContent(JSON.parse(t));
                    } catch { }
                });
            }
            return res;
        });
    };

    // XHR
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        this.addEventListener("load", () => {
            if (typeof url === "string" && url.includes("graphql")) {
                try {
                    sendToContent(JSON.parse(this.responseText));
                } catch { }
            }
        });
        return originalOpen.apply(this, arguments);
    };
})();
