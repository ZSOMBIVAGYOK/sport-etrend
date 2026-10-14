// ==============================================================
// FitPlan Pro - Egyéni Rekordok & PR Hub (js/records.js)
// ==============================================================

window.personalRecords = [
    { 
        id: 'test-1', 
        sport: 'strength_training', 
        exerciseName: 'Fekvenyomás rúddal', 
        weight: 100, 
        reps: 5, 
        calculated1RM: 117, 
        date: '2026-10-13', 
        notes: 'Minta rekord az induláshoz' 
    }
];

window.currentRecordFilter = 'all';

// Modál nyitása / zárása
window.openRecordModal = function() {
    const modal = document.getElementById('record-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('rec-date');
        if (dateInput) dateInput.value = today;
    }
};

window.closeRecordModal = function() {
    const modal = document.getElementById('record-modal');
    if (modal) modal.classList.add('hidden');
};

// Sportág váltás az űrlapon belül
window.toggleRecordFields = function() {
    const sport = document.getElementById('rec-sport')?.value;
    const strengthFields = document.getElementById('strength-fields');
    const cardioFields = document.getElementById('cardio-fields');

    if (!strengthFields || !cardioFields) return;

    if (sport === 'strength_training') {
        strengthFields.classList.remove('hidden');
        cardioFields.classList.add('hidden');
    } else {
        strengthFields.classList.add('hidden');
        cardioFields.classList.remove('hidden');
    }
};

// Élő 1RM számítás (Epley-formula)
window.calculateLive1RM = function() {
    const weight = parseFloat(document.getElementById('rec-weight')?.value) || 0;
    const reps = parseInt(document.getElementById('rec-reps')?.value) || 0;
    const display = document.getElementById('live-1rm-display');
    if (!display) return;

    if (weight > 0 && reps > 0) {
        let rm1 = reps === 1 ? weight : Math.round(weight * (1 + reps / 30));
        display.textContent = `${rm1} kg`;
    } else {
        display.textContent = '- kg';
    }
};

// Új rekord mentése az űrlapról
window.handleRecordSubmit = function(e) {
    e.preventDefault();
    const sport = document.getElementById('rec-sport')?.value;
    const exerciseName = document.getElementById('rec-name')?.value;
    const date = document.getElementById('rec-date')?.value || new Date().toISOString().split('T')[0];
    const notes = document.getElementById('rec-notes')?.value || '';

    let newRecord = {
        id: 'rec_' + Date.now(),
        sport,
        exerciseName,
        date,
        notes
    };

    if (sport === 'strength_training') {
        const weight = parseFloat(document.getElementById('rec-weight')?.value) || 0;
        const reps = parseInt(document.getElementById('rec-reps')?.value) || 0;
        const calculated1RM = reps === 1 ? weight : Math.round(weight * (1 + reps / 30));
        newRecord.weight = weight;
        newRecord.reps = reps;
        newRecord.calculated1RM = calculated1RM;
    } else {
        const distance = parseFloat(document.getElementById('rec-distance')?.value) || 0;
        const duration = parseFloat(document.getElementById('rec-duration')?.value) || 0;
        newRecord.distance = distance;
        newRecord.duration = duration;
    }

    window.personalRecords.push(newRecord);
    window.closeRecordModal();
    window.renderRecordsDashboard();
    
    document.getElementById('record-form')?.reset();
};

// Szűrés sportág szerint
window.filterRecords = function(sport) {
    window.currentRecordFilter = sport;
    window.renderRecordsDashboard();
};

// Dashboard és kártyák kirajzolása
window.renderRecordsDashboard = function() {
    const records = window.personalRecords || [];
    
    const totalCountEl = document.getElementById('pr-stat-total-count');
    const heavy1rmEl = document.getElementById('pr-stat-max-weight');
    const fastSpeedEl = document.getElementById('pr-stat-top-speed');

    if (totalCountEl) totalCountEl.textContent = records.length;

    let maxWeight = 0;
    records.forEach(r => {
        if (r.calculated1RM && r.calculated1RM > maxWeight) maxWeight = r.calculated1RM;
    });
    if (heavy1rmEl) heavy1rmEl.textContent = maxWeight > 0 ? `${maxWeight} kg` : '-';
    if (fastSpeedEl) fastSpeedEl.textContent = '-';

    const grid = document.getElementById('records-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = window.currentRecordFilter === 'all' 
        ? records 
        : records.filter(r => r.sport === window.currentRecordFilter);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-10 text-center text-slate-400 text-xs">
                Még nincsenek rögzített rekordok ebben a kategóriában.
            </div>
        `;
        return;
    }

    filtered.forEach(rec => {
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-900 border border-yellow-300/60 dark:border-yellow-500/30 rounded-3xl p-5 shadow-sm transition flex flex-col justify-between";
        
        let sportLabel = '🏋️ Súlyzós Edzés';
        if (rec.sport === 'running') sportLabel = '🏃 Futás';
        if (rec.sport === 'cycling') sportLabel = '🚴 Kerékpár';
        if (rec.sport === 'swimming') sportLabel = '🏊 Úszás';

        let innerContent = '';
        if (rec.sport === 'strength_training') {
            innerContent = `
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
            `;
        } else {
            innerContent = `
                <div class="bg-yellow-50 dark:bg-yellow-950/30 p-3.5 rounded-2xl border border-yellow-200 dark:border-yellow-800/40 my-3">
                    <div class="flex items-baseline justify-between">
                        <div>
                            <span class="text-2xl font-black text-slate-900 dark:text-white">${rec.distance || 0} km</span>
                        </div>
                        <div class="text-right">
                            <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Idő</span>
                            <span class="text-base font-black text-yellow-500 dark:text-yellow-400">${rec.duration || 0} perc</span>
                        </div>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400 text-slate-950">${sportLabel}</span>
                    <span class="text-[10px] text-slate-400 font-medium">${rec.date}</span>
                </div>
                <h4 class="font-bold text-base text-slate-900 dark:text-white">${rec.exerciseName}</h4>
                ${innerContent}
                ${rec.notes ? `<p class="text-xs text-slate-500 dark:text-slate-400 italic">"${rec.notes}"</p>` : ''}
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button onclick="deleteRecord('${rec.id}')" class="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer">Törlés</button>
            </div>
        `;
        grid.appendChild(card);
    });
};

window.deleteRecord = function(id) {
    window.personalRecords = window.personalRecords.filter(r => r.id !== id);
    window.renderRecordsDashboard();
};