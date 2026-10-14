// ==============================================================
// FitPlan Pro - Egyéni Rekordok & PR Hub (js/records.js)
// ==============================================================

window.personalRecords = [
    { 
        id: 'test-1', 
        sport: 'strength_training', 
        type: 'strength', 
        exerciseName: 'Fekvenyomás rúddal', 
        weight: 100, 
        reps: 5, 
        calculated1RM: 117, 
        date: '2026-10-13', 
        notes: 'Ez egy minta rekord a teszteléshez!' 
    }
];

window.renderRecordsDashboard = function() {
    const records = window.personalRecords || [];
    
    const totalCountEl = document.getElementById('pr-stat-total-count');
    const heavy1rmEl = document.getElementById('pr-stat-max-weight');
    const fastSpeedEl = document.getElementById('pr-stat-top-speed');

    if (totalCountEl) totalCountEl.textContent = records.length;
    if (heavy1rmEl) heavy1rmEl.textContent = '117 kg';
    if (fastSpeedEl) fastSpeedEl.textContent = '-';

    const grid = document.getElementById('records-grid');
    if (!grid) return;
    grid.innerHTML = '';

    records.forEach(rec => {
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-900 border border-yellow-300/60 dark:border-yellow-500/30 rounded-3xl p-5 shadow-sm transition flex flex-col justify-between";
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400 text-slate-950">🏋️ Súlyzós Edzés</span>
                    <span class="text-[10px] text-slate-400 font-medium">${rec.date}</span>
                </div>
                <h4 class="font-bold text-base text-slate-900 dark:text-white">${rec.exerciseName}</h4>
                <div class="bg-yellow-50 dark:bg-yellow-950/30 p-3.5 rounded-2xl border border-yellow-200 dark:border-yellow-800/40 my-3">
                    <div class="flex items-baseline justify-between">
                        <div>
                            <span class="text-2xl font-black text-slate-900 dark:text-white">${rec.weight} kg</span>
                            <span class="text-xs font-bold text-yellow-600 dark:text-yellow-400 ml-1">× ${rec.reps} ism.</span>
                        </div>
                        <div class="text-right">
                            <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Becsült 1RM</span>
                            <span class="text-base font-black text-yellow-500 dark:text-yellow-400">${rec.calculated1RM} kg</span>
                        </div>
                    </div>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 italic">"${rec.notes}"</p>
            </div>
        `;
        grid.appendChild(card);
    });
};
window.openRecordModal = function() {
    const modal = document.getElementById('record-modal');
    if (modal) modal.classList.remove('hidden');
};

window.closeRecordModal = function() {
    const modal = document.getElementById('record-modal');
    if (modal) modal.classList.add('hidden');
};
