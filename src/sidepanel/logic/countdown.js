import { EL } from '../ui/dom.js';

let localCountdownTimer = null;

export function updateCountdown(val) {
    EL.countdown.classList.remove("active", "processing");
    EL.countdown.style.color = "";

    if (val === undefined || val === null) {
        EL.countdown.textContent = "Ready";
    } else {
        EL.countdown.textContent = `Next in ${val}s`;
        EL.countdown.classList.add("active");
        if (val <= 5) EL.countdown.style.color = "#ef4444";
    }
}

export function handleCountdown(state) {
    if (localCountdownTimer) clearInterval(localCountdownTimer);

    // Check if either is active
    if (state.countdownTarget || state.timeoutTarget) {
        const tick = () => {
            const now = Date.now();

            // Main Countdown
            if (state.countdownTarget) {
                const rem = Math.ceil((state.countdownTarget - now) / 1000);
                updateCountdown(rem > 0 ? rem : 0);
            } else {
                updateCountdown(null);
            }

            // Timeout Countdown (Ghost Delay)
            if (state.timeoutTarget) {
                const rem = Math.ceil((state.timeoutTarget - now) / 1000);
                if (rem > 0 && EL.timeout) {
                    EL.timeout.textContent = `Waiting for page load: ${rem}s`;
                    EL.timeout.style.color = "#fbbf24";
                } else if (EL.timeout) {
                    EL.timeout.textContent = "";
                }
            } else if (EL.timeout) {
                EL.timeout.textContent = "";
            }

            // Stop if both done? No, because state updates clear it.
            // But we can check if both < 0
        };
        localCountdownTimer = setInterval(tick, 200);
        tick();
    } else {
        updateCountdown(null);
        if (EL.timeout) EL.timeout.textContent = "";
    }
}
