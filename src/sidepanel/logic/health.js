import { EL } from '../ui/dom.js';

export async function checkServerHealth() {
    if (!EL.serverHealth) return;
    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 1500);
        const res = await fetch("http://localhost:8080/health", { method: 'GET', signal: controller.signal });
        clearTimeout(tid);

        if (res.ok) {
            EL.serverHealth.textContent = "● Online";
            EL.serverHealth.className = "online";
        } else throw new Error("Not OK");
    } catch (e) {
        EL.serverHealth.textContent = "● Offline";
        EL.serverHealth.className = "offline";
    }
}
