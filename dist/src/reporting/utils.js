"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtml = escapeHtml;
function escapeHtml(text) {
    return text
        ? text.replace(/[&<>"']/g, (m) => {
            const map = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;",
            };
            return map[m];
        })
        : "";
}
