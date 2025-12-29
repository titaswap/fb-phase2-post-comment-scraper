import { EL } from './dom.js';

export const log = msg => {
    const timestamp = new Date().toLocaleTimeString();
    const newEntry = `[${timestamp}] ${msg}`;
    const currentText = EL.log.textContent;
    let lines = currentText.split('\n').filter(line => line.trim() !== '');
    lines.push(newEntry);
    if (lines.length > 20) lines = lines.slice(lines.length - 20);
    EL.log.textContent = lines.join('\n') + '\n';
    EL.log.scrollTop = EL.log.scrollHeight;
};

export const debug = log;
