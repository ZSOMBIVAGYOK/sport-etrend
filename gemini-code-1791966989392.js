// ==============================================================
// FitPlan Pro - Egyéni Rekordok & PR Hub (js/records.js)
// ==============================================================

window.personalRecords = [];

window.renderRecordsDashboard = function() {
    const totalCountEl = document.getElementById('pr-stat-total-count');
    const heavy1rmEl = document.getElementById('pr-stat-max-weight');
    const fastSpeedEl = document.getElementById('pr-stat-top-speed');

    if (totalCountEl) totalCountEl.textContent = '0';
    if (heavy1rmEl) heavy1rmEl.textContent = '-';
    if (fastSpeedEl) fastSpeedEl.textContent = '-';
};