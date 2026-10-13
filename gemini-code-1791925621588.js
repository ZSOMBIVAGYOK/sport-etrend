// ==============================================================
// FitPlan Pro - Egyéni Rekordok & PR Hub (js/records.js)
// ==============================================================

window.activeRecordSportFilter = 'all';

window.calculate1RM = function(weight, reps) {
    const w = Number(weight) || 0;
    const r = Number(reps) || 1;
    if (r <= 1) return w;
    return Math.round(w * (1 + r / 30));
};

window.renderRecordsDashboard = function() {
    const records = window.personalRecords || [];
    
    const totalCountEl = document.getElementById('pr-stat-total-count');
    const heavy1rmEl = document.getElementById('pr-stat-max-weight');
    const fastSpeedEl = document.getElementById('pr-stat-top-speed');

    const strengthRecords = records.filter(r => r.type === 'strength');
    const enduranceRecords = records.filter(r => r.type === 'endurance');

    let maxStrength = 0;
    strengthRecords.forEach(r => {
        const val = Number(r.calculated1RM) || Number(r.weight) || 0;
        if (val > maxStrength) maxStrength = val;
    });

    let maxSpeed = 0;
    enduranceRecords.forEach(r => {
        const val = Number(r.speedKmh) || 0;
        if (val > maxSpeed) maxSpeed = val;
    });

    if (totalCountEl) totalCountEl.textContent = records.length;
    if (heavy1rmEl) heavy1rmEl.textContent = maxStrength > 0 ? `${maxStrength} kg` : '-';
    if (fastSpeedEl) fastSpeedEl.textContent = maxSpeed > 0 ? `${maxSpeed} km/h` : '-';

    window.renderRecordSportFilters();

    const grid = document.getElementById('records-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let filtered = records;
    if (window.activeRecordSportFilter !== 'all') {
        filtered = filtered.filter(r => r.sport === window.activeRecordSportFilter);
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-400">
                <i class="fa-solid fa-trophy text-4xl mb-3 text-yellow-400/40 block"></i>
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Nincsenek rögzített egyéni rekordok ebben a kategóriában.</p>
                <p class="text-xs text-slate-500 mt-1">Kattints a fenti „Új Rekord” gombra a rögzítéshez!</p>
            </div>
        `;
        return;
    }

    filtered.forEach(rec => {
        const badge = typeof window.getSportBadgeConfig === 'function' ? window.getSportBadgeConfig(rec.sport) : { name: rec.sport, icon: 'fa-trophy' };
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-900 border border-yellow-300/60 dark:border-yellow-500/30 hover:border-yellow-400 rounded-3xl p-5 shadow-sm transition flex flex-col justify-between";

        let metricContent = '';
        if (rec.type === 'strength') {
            metricContent = `
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
            metricContent = `
                <div class="bg-yellow-50 dark:bg-yellow-950/30 p-3.5 rounded-2xl border border-yellow-200 dark:border-yellow-800/40 my-3 space-y-2">
                    <div class="flex items-baseline justify-between">
                        <span class="text-xl font-black text-slate-900 dark:text-white">${rec.distanceKm} km</span>
                        <span class="text-base font-black text-yellow-600 dark:text-yellow-400 font-mono">${rec.timeString}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs pt-1 border-t border-yellow-200/60 dark:border-yellow-800/40">
                        <span class="text-slate-500 font-semibold">⚡ ${rec.pace || '-'}</span>
                        <span class="text-slate-700 dark:text-slate-300 font-bold">🏎️ ${rec.speedKmh ? rec.speedKmh + ' km/h' : '-'}</span>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400 text-slate-950 flex items-center gap-1">
                        <i class="fa-solid ${badge.icon} text-[9px]"></i> ${badge.name}
                    </span>
                    <div class="flex items-center gap-1">
                        <span class="text-[10px] text-slate-400 font-medium">${rec.date}</span>
                        <button type="button" onclick="deleteRecordItem('${rec.id}')" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer ml-1" title="Törlés">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </div>
                <h4 class="font-bold text-base text-slate-900 dark:text-white">${rec.exerciseName || rec.title}</h4>
                ${metricContent}
                ${rec.notes ? `<p class="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2 leading-relaxed">"${rec.notes}"</p>` : ''}
            </div>
            <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span><i class="fa-solid fa-award text-yellow-500 mr-1"></i> Hitelesített Egyéni Csúcs</span>
            </div>
        `;
        grid.appendChild(card);
    });
};

window.renderRecordSportFilters = function() {
    const container = document.getElementById('pr-sport-filters');
    if (!container) return;
    container.innerHTML = '';

    const records = window.personalRecords || [];
    const usedSports = new Set(records.map(r => r.sport));

    const isAll = (window.activeRecordSportFilter === 'all');
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.onclick = () => { window.activeRecordSportFilter = 'all'; window.renderRecordsDashboard(); };
    allBtn.className = isAll ? "px-3 py-1.5 rounded-xl text-xs font-bold transition bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20 cursor-pointer" : "px-3 py-1.5 rounded-xl text-xs font-bold transition bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer";
    allBtn.textContent = "Összes Rekord";
    container.appendChild(allBtn);

    usedSports.forEach(sportKey => {
        const badge = typeof window.getSportBadgeConfig === 'function' ? window.getSportBadgeConfig(sportKey) : { name: sportKey, icon: 'fa-trophy' };
        const isActive = (window.activeRecordSportFilter === sportKey);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => { window.activeRecordSportFilter = sportKey; window.renderRecordsDashboard(); };
        btn.className = isActive ? "px-3 py-1.5 rounded-xl text-xs font-bold transition bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20 flex items-center gap-1.5 cursor-pointer" : "px-3 py-1.5 rounded-xl text-xs font-bold transition bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer";
        btn.innerHTML = `<i class="fa-solid ${badge.icon} text-[10px]"></i> ${badge.name}`;
        container.appendChild(btn);
    });
};

window.openAddRecordModal = function() {
    const exSelect = document.getElementById('pr-exercise-select');
    if (exSelect) {
        exSelect.innerHTML = '<option value="">-- Válassz gyakorlatot --</option>';
        (window.workoutExercises || []).forEach(ex => {
            const opt = document.createElement('option'); opt.value = ex.id; opt.textContent = ex.name;
            exSelect.appendChild(opt);
        });
    }

    document.getElementById('pr-sport-select').value = 'strength_training';
    document.getElementById('pr-weight-input').value = 80;
    document.getElementById('pr-reps-input').value = 1;
    document.getElementById('pr-notes-input').value = '';
    document.getElementById('pr-date-input').value = window.getTodayKey();

    document.getElementById('pr-dist-input').value = 5.0;
    document.getElementById('pr-time-hours').value = 0;
    document.getElementById('pr-time-minutes').value = 25;
    document.getElementById('pr-time-seconds').value = 0;

    window.handlePrSportSwitch('strength_training');
    window.recalcModal1RM();
    window.recalcModalSpeedAndPace();
    document.getElementById('record-add-modal').classList.remove('hidden');
};

window.handlePrSportSwitch = function(sportKey) {
    const isStrength = (sportKey === 'strength_training' || sportKey === 'functional_training');
    const strengthSec = document.getElementById('pr-strength-section');
    const enduranceSec = document.getElementById('pr-endurance-section');

    if (isStrength) { strengthSec.classList.remove('hidden'); enduranceSec.classList.add('hidden'); } 
    else { strengthSec.classList.add('hidden'); enduranceSec.classList.remove('hidden'); }
};

window.recalcModal1RM = function() {
    const w = Number(document.getElementById('pr-weight-input').value) || 0;
    const r = Number(document.getElementById('pr-reps-input').value) || 1;
    const calculated = window.calculate1RM(w, r);
    const display = document.getElementById('pr-calc-1rm-display');
    if (display) display.textContent = `${calculated} kg`;
};

window.recalcModalSpeedAndPace = function() {
    const distKm = Number(document.getElementById('pr-dist-input').value) || 0;
    const h = Number(document.getElementById('pr-time-hours').value) || 0;
    const m = Number(document.getElementById('pr-time-minutes').value) || 0;
    const s = Number(document.getElementById('pr-time-seconds').value) || 0;

    const totalSeconds = (h * 3600) + (m * 60) + s;
    const paceDisplay = document.getElementById('pr-calc-pace-display');
    const speedDisplay = document.getElementById('pr-calc-speed-display');

    if (distKm <= 0 || totalSeconds <= 0) {
        if (paceDisplay) paceDisplay.textContent = '-:-- min/km';
        if (speedDisplay) speedDisplay.textContent = '- km/h';
        return;
    }
    const secPerKm = Math.round(totalSeconds / distKm);
    const paceStr = `${Math.floor(secPerKm / 60)}:${String(secPerKm % 60).padStart(2, '0')} min/km`;
    const speedKmh = ((distKm / totalSeconds) * 3600).toFixed(2);
    if (paceDisplay) paceDisplay.textContent = paceStr;
    if (speedDisplay) speedDisplay.textContent = `${speedKmh} km/h`;
};

window.setPrQuickDistance = function(km) {
    document.getElementById('pr-dist-input').value = km;
    window.recalcModalSpeedAndPace();
};

window.saveRecordForm = function(e) {
    e.preventDefault();
    const sportKey = document.getElementById('pr-sport-select').value;
    const date = document.getElementById('pr-date-input').value || window.getTodayKey();
    const notes = document.getElementById('pr-notes-input').value.trim();
    const isStrength = (sportKey === 'strength_training' || sportKey === 'functional_training');

    let newRecord = null;
    if (isStrength) {
        const exSelect = document.getElementById('pr-exercise-select');
        const exId = exSelect.value;
        const exName = exId ? exSelect.options[exSelect.selectedIndex].text : 'Gyakorlat';
        const weight = Number(document.getElementById('pr-weight-input').value) || 0;
        const reps = Number(document.getElementById('pr-reps-input').value) || 1;
        
        newRecord = {
            id: 'pr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            sport: sportKey, type: 'strength', exerciseId: exId, exerciseName: exName,
            weight: weight, reps: reps, calculated1RM: window.calculate1RM(weight, reps), date: date, notes: notes
        };
    } else {
        const distKm = Number(document.getElementById('pr-dist-input').value) || 0;
        const h = Number(document.getElementById('pr-time-hours').value) || 0;
        const m = Number(document.getElementById('pr-time-minutes').value) || 0;
        const s = Number(document.getElementById('pr-time-seconds').value) || 0;
        const totalSeconds = (h * 3600) + (m * 60) + s;
        const secPerKm = Math.round(totalSeconds / distKm);
        const paceStr = `${Math.floor(secPerKm / 60)}:${String(secPerKm % 60).padStart(2, '0')} min/km`;
        
        newRecord = {
            id: 'pr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            sport: sportKey, type: 'endurance', title: `${distKm} km Egyéni Csúcs`,
            distanceKm: distKm, durationSeconds: totalSeconds, timeString: `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
            pace: paceStr, speedKmh: Number(((distKm / totalSeconds) * 3600).toFixed(2)), date: date, notes: notes
        };
    }

    if (!Array.isArray(window.personalRecords)) window.personalRecords = [];
    window.personalRecords.unshift(newRecord);

    window.saveData(); // MENTÉS!
    window.closeModal('record-add-modal');
    window.renderRecordsDashboard();
    window.showToast("🏆 Új Egyéni Rekord mentve!", "fa-trophy", "yellow");
};

window.deleteRecordItem = function(recId) {
    window.customConfirm("Megerősítés", "Biztosan törlöd ezt az egyéni rekordot?", () => {
        window.personalRecords = window.personalRecords.filter(r => String(r.id) !== String(recId));
        window.saveData(); // MENTÉS!
        window.renderRecordsDashboard();
        window.showToast("Rekord sikeresen törölve!", "fa-trash", "red");
    });
};

window.openOneRepMaxCalcModal = function() {
    document.getElementById('standalone-calc-weight').value = 100;
    document.getElementById('standalone-calc-reps').value = 5;
    window.updateStandalone1RMTable();
    document.getElementById('onerep-calc-modal').classList.remove('hidden');
};

window.updateStandalone1RMTable = function() {
    const w = Number(document.getElementById('standalone-calc-weight').value) || 0;
    const r = Number(document.getElementById('standalone-calc-reps').value) || 1;
    const epley1RM = window.calculate1RM(w, r);

    const banner = document.getElementById('standalone-1rm-banner');
    if (banner) banner.textContent = `${epley1RM} kg`;

    const tableBody = document.getElementById('standalone-1rm-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const repPercentages = [
        { reps: 1, pct: 1.00 }, { reps: 2, pct: 0.95 }, { reps: 3, pct: 0.93 },
        { reps: 4, pct: 0.90 }, { reps: 5, pct: 0.87 }, { reps: 6, pct: 0.85 },
        { reps: 8, pct: 0.80 }, { reps: 10, pct: 0.75 }, { reps: 12, pct: 0.70 }
    ];

    repPercentages.forEach(row => {
        const calculatedWeight = Math.round(epley1RM * row.pct);
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-100 dark:border-slate-800 text-xs";
        tr.innerHTML = `
            <td class="py-2 font-bold text-slate-800 dark:text-slate-200">${row.reps} RM</td>
            <td class="py-2 text-slate-400 font-medium">${Math.round(row.pct * 100)}%</td>
            <td class="py-2 text-right font-black text-yellow-500 dark:text-yellow-400">${calculatedWeight} kg</td>
        `;
        tableBody.appendChild(tr);
    });
};

const baseSwitchAppMode = window.switchAppMode;
window.switchAppMode = function(mode) {
    const dd = document.getElementById('app-selector-dropdown');
    if (dd) dd.classList.add('hidden');

    if (mode === 'records') {
        window.currentAppMode = 'records';
        ['diet', 'workout', 'recovery', 'gear', 'docs'].forEach(m => {
            const nav = document.getElementById(`${m}-nav`);
            const act = document.getElementById(`${m}-actions`);
            if (nav) nav.classList.add('hidden');
            if (act) act.classList.add('hidden');
        });

        ['tab-planner', 'tab-month-diet', 'tab-library', 'tab-workout-planner', 
         'tab-month-workout', 'tab-workout-programs', 'tab-workout-exercises', 
         'tab-recovery-planner', 'tab-month-recovery', 'tab-recovery-routines', 
         'tab-gear', 'tab-docs'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        const tabRecords = document.getElementById('tab-records');
        if (tabRecords) tabRecords.classList.remove('hidden');

        const logoBg = document.getElementById('app-logo-bg');
        const logoIcon = document.getElementById('app-logo-icon');
        const title = document.getElementById('app-title');
        const sub = document.getElementById('app-subtitle');

        if (logoBg) logoBg.className = "w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-yellow-400/25 transition-all duration-300";
        if (logoIcon) logoIcon.className = "fa-solid fa-trophy text-slate-950";
        if (title) title.textContent = "PR Hub";
        if (sub) { sub.textContent = "Egyéni Rekordok & 1RM"; sub.className = "text-xs text-yellow-600 dark:text-yellow-400 font-medium transition-colors"; }

        window.renderRecordsDashboard();
        return;
    }

    const tabRecords = document.getElementById('tab-records');
    if (tabRecords) tabRecords.classList.add('hidden');

    if (typeof baseSwitchAppMode === 'function') {
        baseSwitchAppMode(mode);
    }
};