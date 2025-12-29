export const EL = {
    log: document.getElementById("log"),
    status: document.getElementById("status"),
    errors: document.getElementById("errors"),
    finalCount: document.getElementById("final-count"),
    progressFill: document.getElementById("progress-fill"),
    progressPercent: document.getElementById("progress-percent-text"),
    progressFraction: document.getElementById("progress-fraction"),
    serverHealth: document.getElementById("server-health"),
    countdown: document.getElementById("countdown"),
    timeout: document.getElementById("timeout-countdown"),
    inputs: {
        file: document.getElementById("file"),
        finalFile: document.getElementById("final-file"),
        minDelay: document.getElementById("min-delay"),
        maxDelay: document.getElementById("max-delay"),
        startIndex: document.getElementById("start-index-input")
    },
    buttons: {
        start: document.getElementById("start"),
        pause: document.getElementById("pause"),
        resume: document.getElementById("resume"),
        stop: document.getElementById("stop"),
        prev: document.getElementById("previous"),
        next: document.getElementById("next"),
        reset: document.getElementById("reset"),
        setIndex: document.getElementById("set-index-btn")
    }
};
