// ==============================================================
// FitPlan Pro - PR Hub & Egyéni Rekordok (js/pr.js)
// ==============================================================

// Alapértelmezett állapot inicializálása
if (!window.personalRecords) window.personalRecords = [];
if (!window.activePRCategory) window.activePRCategory = 'all';

// ==============================================================
// 1. SEGÉDFÜGGVÉNYEK & SZÁMÍTÁSI MOTOROK (1RM, TEMPÓ, SEBESSÉG)
// ==============================================================

/**
 * Elméleti 1RM számítása az Epley-formula alapján:
 * 1RM = Súly * (1 + Ismétlés / 30)
 * 1 ismétlés esetén a számított érték pontosan megegyezik a súllyal.
 */
window.calculateEpley1RM = function(weight, reps) {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    if (w <= 0 || r <= 0) return 0;
    if (r === 1) return Math.round(w * 10) / 10;
    const oneRm = w * (1 + (r / 30));
    return Math.round(oneRm * 10) / 10;
};

/**
 * Sportág szerinti betűtípus ikon visszadása
 */
window.getPRSportIcon = function(category) {
    switch (category) {
        case 'Súlyzós edzés':
            return 'fa-dumbbell';
        case 'Funkcionális tréning':
            return 'fa-fire';
        case 'Futás':
            return 'fa-person-running';
        case 'Kerékpár':
            return 'fa-person-biking';
        case 'Úszás':
            return 'fa-person-swimming';
        case 'Evezés':
            return 'fa-water';
        default:
            return 'fa-trophy';
    }
};

/**
 * Idő formázása (másodperc -> ÓÓ:PP:MM vagy PP:MM)
 */
function formatSecondsToTime(totalSec) {
    if (!totalSec || totalSec <= 0) return '00:00';
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
}

// ==============================================================
// 2. PR HUB VEZÉRLŐPULT NÉZETEK RENDERELÉSE
// ==============================================================

/**
 * A teljes PR Hub képernyő újrarajzolása
 */
window.renderPRHub = function() {
    window.renderPRStats();
    window.renderPRCategoryPills();
    window.renderPRGrid();
};

/**
 * Felső 3 Gyorsstatisztika Kártya Frissítése
 */
window.renderPRStats = function() {
    const records = window.personalRecords || [];

    // 1. Kártya: Összes Rögzített Rekord
    const totalEl = document.getElementById('pr-stat-total');
    if (totalEl) {
        totalEl.innerHTML = `${records.length} <span class="text-xs font-medium text-slate-400">db</span>`;
    }

    // 2. Kártya: Legnagyobb 1RM Súly
    let max1RM = 0;
    let max1RMExercise = '';
    records.forEach(r => {
        const val = parseFloat(r.calculated1RM) || parseFloat(r.weight) || 0;
        if (val > max1RM) {
            max1RM = val;
            max1RMExercise = `${r.exerciseName} (${r.weight} kg × ${r.reps} ism.)`;
        }
    });

    const maxWeightEl = document.getElementById('pr-stat-max-weight');
    const maxWeightSubEl = document.getElementById('pr-stat-max-weight-sub');
    if (maxWeightEl) {
        if (max1RM > 0) {
            maxWeightEl.innerHTML = `${max1RM} <span class="text-xs font-medium text-slate-400">kg</span>`;
            if (maxWeightSubEl) maxWeightSubEl.textContent = max1RMExercise;
        } else {
            maxWeightEl.innerHTML = `- <span class="text-xs font-medium text-slate-400">kg</span>`;
            if (maxWeightSubEl) maxWeightSubEl.textContent = 'Erőemelő csúcsteljesítmény';
        }
    }

    // 3. Kártya: Csúcs Sebesség
    let maxSpeed = 0;
    let maxSpeedActivity = '';
    records.forEach(r => {
        const sp = parseFloat(r.avgSpeed) || 0;
        if (sp > maxSpeed) {
            maxSpeed = sp;
            maxSpeedActivity = `${r.sportCategory}: ${r.exerciseName} (${r.distance} km)`;
        }
    });

    const maxSpeedEl = document.getElementById('pr-stat-max-speed');
    const maxSpeedSubEl = document.getElementById('pr-stat-max-speed-sub');
    if (maxSpeedEl) {
        if (maxSpeed > 0) {
            maxSpeedEl.innerHTML = `${maxSpeed.toFixed(2)} <span class="text-xs font-medium text-slate-400">km/h</span>`;
            if (maxSpeedSubEl) maxSpeedSubEl.textContent = maxSpeedActivity;
        } else {
            maxSpeedEl.innerHTML = `- <span class="text-xs font-medium text-slate-400">km/h</span>`;
            if (maxSpeedSubEl) maxSpeedSubEl.textContent = 'Állóképességi csúcssebesség';
        }
    }
};

/**
 * Intelligens Szűrősáv: Csak azok a kategóriák jelennek meg, amelyekben van rekord
 */
window.renderPRCategoryPills = function() {
    const container = document.getElementById('pr-category-pills');
    if (!container) return;

    const records = window.personalRecords || [];
    const countsByCategory = {};

    records.forEach(r => {
        const cat = r.sportCategory || 'Egyéb';
        countsByCategory[cat] = (countsByCategory[cat] || 0) + 1;
    });

    const uniqueCategories = Object.keys(countsByCategory);

    // Ha a kiválasztott szűrőben már nincs elem, visszatérünk 'all'-ra
    if (window.activePRCategory !== 'all' && !countsByCategory[window.activePRCategory]) {
        window.activePRCategory = 'all';
    }

    let html = `
        <button type="button" onclick="filterPRCategory('all')" 
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                window.activePRCategory === 'all'
                    ? 'bg-yellow-500 text-slate-950 font-black shadow-md shadow-yellow-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
            }">
            <span>Összes</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${window.activePRCategory === 'all' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}">${records.length}</span>
        </button>
    `;

    uniqueCategories.forEach(cat => {
        const isSelected = window.activePRCategory === cat;
        const icon = window.getPRSportIcon(cat);
        const count = countsByCategory[cat];

        html += `
            <button type="button" onclick="filterPRCategory('${cat}')" 
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                        ? 'bg-yellow-500 text-slate-950 font-black shadow-md shadow-yellow-500/20'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }">
                <i class="fa-solid ${icon} ${isSelected ? 'text-slate-950' : 'text-yellow-500'}"></i>
                <span>${cat}</span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}">${count}</span>
            </button>
        `;
    });

    container.innerHTML = html;
};

/**
 * Kategória szűrése a PR Hub-ban
 */
window.filterPRCategory = function(cat) {
    window.activePRCategory = cat;
    window.renderPRCategoryPills();
    window.renderPRGrid();
};

/**
 * Rekord Kártyák Rácsos Nézete (Grid)
 */
window.renderPRGrid = function() {
    const grid = document.getElementById('pr-grid');
    if (!grid) return;

    let records = window.personalRecords || [];

    if (window.activePRCategory !== 'all') {
        records = records.filter(r => r.sportCategory === window.activePRCategory);
    }

    if (records.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-16 text-center border-2 border-dashed border-yellow-500/20 rounded-3xl p-8 bg-yellow-500/5">
                <div class="w-16 h-16 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
                    <i class="fa-solid fa-trophy"></i>
                </div>
                <h3 class="font-bold text-base text-slate-800 dark:text-slate-100">Még nincsenek rögzített egyéni rekordjaid</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
                    Kezdd el rögzíteni a súlyzós 1RM maximumaidat és az állóképességi csúcsteljesítményeidet a folyamatos sportolói fejlődés követéséhez!
                </p>
                <button type="button" onclick="openPRModal()" class="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-yellow-500/30 transition cursor-pointer">
                    <i class="fa-solid fa-plus mr-1.5 font-black"></i> Első Rekord Hozzáadása
                </button>
            </div>
        `;
        return;
    }

    // Dátum szerint csökkenő sorrend (legfrissebb elöl)
    const sorted = [...records].sort((a, b) => {
        const da = new Date(a.date || a.createdAt || 0).getTime();
        const db = new Date(b.date || b.createdAt || 0).getTime();
        return db - da;
    });

    let html = '';
    sorted.forEach(r => {
        const isStrength = (r.type === 'strength' || r.sportCategory === 'Súlyzós edzés' || r.sportCategory === 'Funkcionális tréning');
        const icon = window.getPRSportIcon(r.sportCategory);

        html += `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-yellow-500/50 dark:hover:border-yellow-500/50 rounded-2xl p-4 shadow-sm hover:shadow-lg transition flex flex-col justify-between group relative">
                <div>
                    <!-- Kártya Felső Sáv: Kategória címke és Dátum -->
                    <div class="flex items-center justify-between gap-2 mb-2.5">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-yellow-500/15 text-yellow-700 dark:text-yellow-400">
                            <i class="fa-solid ${icon}"></i>
                            <span>${r.sportCategory}</span>
                        </span>
                        <span class="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                            <i class="fa-regular fa-calendar"></i>
                            ${r.date || ''}
                        </span>
                    </div>

                    <!-- Gyakorlat / Esemény Neve -->
                    <h3 class="font-bold text-base text-slate-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors mb-3">
                        ${r.exerciseName}
                    </h3>

                    <!-- Fő Eredmény Megjelenítés -->
                    ${isStrength ? `
                        <div class="space-y-2 mb-3">
                            <div class="flex items-baseline justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                <span class="text-xs text-slate-500 dark:text-slate-400">Elért eredmény:</span>
                                <span class="font-black text-sm text-slate-900 dark:text-white">${r.weight} kg <span class="text-xs font-normal text-slate-400">× ${r.reps} ism.</span></span>
                            </div>
                            <div class="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/25 flex items-center justify-between">
                                <span class="text-xs font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-1.5">
                                    <i class="fa-solid fa-calculator text-yellow-500"></i> Becsült 1RM:
                                </span>
                                <span class="font-black text-base text-yellow-600 dark:text-yellow-400">${r.calculated1RM} kg</span>
                            </div>
                        </div>
                    ` : `
                        <div class="space-y-2 mb-3">
                            <div class="flex items-baseline justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                <span class="text-xs text-slate-500 dark:text-slate-400">Táv & Idő:</span>
                                <span class="font-black text-sm text-slate-900 dark:text-white">${r.distance} km <span class="text-xs font-normal text-slate-400">/ ${r.timeFormatted}</span></span>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div class="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-center">
                                    <span class="text-[10px] text-yellow-700 dark:text-yellow-300 block font-semibold">Átlagtempó</span>
                                    <span class="font-black text-xs text-yellow-600 dark:text-yellow-400">${r.avgPace} min/km</span>
                                </div>
                                <div class="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-center">
                                    <span class="text-[10px] text-yellow-700 dark:text-yellow-300 block font-semibold">Átlagsebesség</span>
                                    <span class="font-black text-xs text-yellow-600 dark:text-yellow-400">${r.avgSpeed} km/h</span>
                                </div>
                            </div>
                        </div>
                    `}

                    <!-- Megjegyzés (ha van) -->
                    ${r.notes ? `
                        <div class="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-3">
                            <p class="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-2">
                                <i class="fa-solid fa-quote-left text-[9px] text-slate-400 mr-1"></i>${r.notes}
                            </p>
                        </div>
                    ` : ''}
                </div>

                <!-- Kártya Alsó Sáv: Hitelesített pecsét és Törlés gomb -->
                <div class="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <i class="fa-solid fa-circle-check"></i> Hitelesített Csúcs
                    </span>
                    <button type="button" onclick="deletePRRecord('${r.id}')" 
                        class="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer" 
                        title="Rekord törlése">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
};

// ==============================================================
// 3. KÉTIRÁNYÚ ADATRÖGZÍTÉS (ÚJ REKORD MODÁL MOTORJA)
// ==============================================================

/**
 * Új Rekord Modál megnyitása
 */
window.openPRModal = function(editId = null) {
    const modal = document.getElementById('pr-modal');
    if (!modal) return;

    // Űrlap alaphelyzetbe állítása
    document.getElementById('pr-form').reset();
    document.getElementById('pr-edit-id').value = editId || '';

    const today = (typeof window.getTodayKey === 'function') ? window.getTodayKey() : new Date().toISOString().split('T')[0];
    document.getElementById('pr-date').value = today;

    // Gyakorlatok betöltése a Workout modul adatbázisából
    window.populatePRExerciseSelect();

    if (editId) {
        document.getElementById('pr-modal-title').textContent = 'Rekord Módosítása';
        const rec = (window.personalRecords || []).find(r => r.id === editId);
        if (rec) {
            // Rádiógomb beállítása
            const radios = document.getElementsByName('pr-sport');
            for (let radio of radios) {
                if (radio.value === rec.sportCategory) radio.checked = true;
            }
            window.handlePRSportChange(rec.sportCategory);

            if (rec.type === 'strength' || rec.sportCategory === 'Súlyzós edzés' || rec.sportCategory === 'Funkcionális tréning') {
                const exSelect = document.getElementById('pr-strength-exercise');
                let found = false;
                for (let opt of exSelect.options) {
                    if (opt.value === rec.exerciseName) { opt.selected = true; found = true; break; }
                }
                if (!found) {
                    exSelect.value = '__custom__';
                    const customInput = document.getElementById('pr-strength-custom-exercise');
                    customInput.value = rec.exerciseName;
                    customInput.classList.remove('hidden');
                }
                document.getElementById('pr-weight').value = rec.weight || '';
                document.getElementById('pr-reps').value = rec.reps || 1;
                window.calculateLivePRStrength1RM();
            } else {
                document.getElementById('pr-endurance-name').value = rec.exerciseName || '';
                document.getElementById('pr-distance').value = rec.distance || '';
                if (rec.durationSeconds) {
                    const h = Math.floor(rec.durationSeconds / 3600);
                    const m = Math.floor((rec.durationSeconds % 3600) / 60);
                    const s = Math.floor(rec.durationSeconds % 60);
                    document.getElementById('pr-time-hours').value = h;
                    document.getElementById('pr-time-minutes').value = m;
                    document.getElementById('pr-time-seconds').value = s;
                }
                window.calculateLivePREnduranceMetrics();
            }

            document.getElementById('pr-date').value = rec.date || today;
            document.getElementById('pr-notes').value = rec.notes || '';
        }
    } else {
        document.getElementById('pr-modal-title').textContent = 'Új Rekord Rögzítése';
        const radios = document.getElementsByName('pr-sport');
        if (radios.length > 0) {
            radios[0].checked = true;
            window.handlePRSportChange(radios[0].value);
        }
        window.calculateLivePRStrength1RM();
        window.calculateLivePREnduranceMetrics();
    }

    modal.classList.remove('hidden');
};

/**
 * Workout modulból származó gyakorlatok listájának feltöltése
 */
window.populatePRExerciseSelect = function() {
    const select = document.getElementById('pr-strength-exercise');
    if (!select) return;

    select.innerHTML = '';
    const exercises = window.workoutExercises || window.DEFAULT_WORKOUT_EXERCISES || [];

    exercises.forEach(ex => {
        const opt = document.createElement('option');
        opt.value = ex.name;
        opt.textContent = ex.name;
        select.appendChild(opt);
    });

    // Egyedi gyakorlat megadása opció
    const customOpt = document.createElement('option');
    customOpt.value = '__custom__';
    customOpt.textContent = '➕ Egyedi gyakorlat beírása...';
    select.appendChild(customOpt);

    const customInput = document.getElementById('pr-strength-custom-exercise');
    if (customInput) customInput.classList.add('hidden');
};

/**
 * Gyakorlat lenyíló változás kezelése (egyedi gyakorlat beviteli mező megjelenítése)
 */
window.handlePRExerciseSelectChange = function() {
    const select = document.getElementById('pr-strength-exercise');
    const customInput = document.getElementById('pr-strength-custom-exercise');
    if (!select || !customInput) return;

    if (select.value === '__custom__') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
    }
};

/**
 * Sportág váltása a modálban: az űrlap átalakul erő vagy állóképességi mezőkre
 */
window.handlePRSportChange = function(sport) {
    const strengthSec = document.getElementById('pr-form-strength');
    const enduranceSec = document.getElementById('pr-form-endurance');
    if (!strengthSec || !enduranceSec) return;

    const isStrength = (sport === 'Súlyzós edzés' || sport === 'Funkcionális tréning');

    if (isStrength) {
        strengthSec.classList.remove('hidden');
        enduranceSec.classList.add('hidden');
        window.calculateLivePRStrength1RM();
    } else {
        strengthSec.classList.add('hidden');
        enduranceSec.classList.remove('hidden');
        // Alapértelmezett elnevezés kitöltése, ha üres
        const nameInput = document.getElementById('pr-endurance-name');
        if (nameInput && !nameInput.value.trim()) {
            nameInput.placeholder = `pl. ${sport} (5 km vagy egyéni táv)`;
        }
        window.calculateLivePREnduranceMetrics();
    }
};

/**
 * Élő 1RM kalkuláció gépelés közben az űrlapon
 */
window.calculateLivePRStrength1RM = function() {
    const weight = parseFloat(document.getElementById('pr-weight')?.value) || 0;
    const reps = parseInt(document.getElementById('pr-reps')?.value, 10) || 0;
    const display = document.getElementById('pr-live-1rm-val');
    if (!display) return;

    if (weight <= 0 || reps <= 0) {
        display.textContent = '0 kg';
        return;
    }

    const oneRm = window.calculateEpley1RM(weight, reps);
    display.textContent = `${oneRm} kg`;
};

/**
 * Gyorsgombok a leggyakoribb állóképességi távokhoz
 */
window.setPREnduranceDistance = function(km) {
    const distInput = document.getElementById('pr-distance');
    if (distInput) {
        distInput.value = km;
        window.calculateLivePREnduranceMetrics();
    }
};

/**
 * Élő Tempó és Sebesség kalkuláció az állóképességi űrlapon
 */
window.calculateLivePREnduranceMetrics = function() {
    const dist = parseFloat(document.getElementById('pr-distance')?.value) || 0;
    const h = parseInt(document.getElementById('pr-time-hours')?.value, 10) || 0;
    const m = parseInt(document.getElementById('pr-time-minutes')?.value, 10) || 0;
    const s = parseInt(document.getElementById('pr-time-seconds')?.value, 10) || 0;

    const paceDisplay = document.getElementById('pr-live-pace-val');
    const speedDisplay = document.getElementById('pr-live-speed-val');
    if (!paceDisplay || !speedDisplay) return;

    const totalSeconds = (h * 3600) + (m * 60) + s;

    if (dist <= 0 || totalSeconds <= 0) {
        paceDisplay.textContent = '0:00 min/km';
        speedDisplay.textContent = '0.00 km/h';
        return;
    }

    // Átlagsebesség (km/h)
    const hours = totalSeconds / 3600;
    const speed = dist / hours;
    speedDisplay.textContent = `${speed.toFixed(2)} km/h`;

    // Átlagtempó (perc/km)
    const totalMinutes = totalSeconds / 60;
    const paceDecimal = totalMinutes / dist;
    const paceMin = Math.floor(paceDecimal);
    let paceSec = Math.round((paceDecimal - paceMin) * 60);
    let finalPaceMin = paceMin;
    if (paceSec >= 60) {
        finalPaceMin += 1;
        paceSec = 0;
    }
    paceDisplay.textContent = `${finalPaceMin}:${String(paceSec).padStart(2, '0')} min/km`;
};

/**
 * Új vagy Módosított Rekord Mentése
 */
window.savePRRecord = function(e) {
    e.preventDefault();

    const editId = document.getElementById('pr-edit-id')?.value;
    const radios = document.getElementsByName('pr-sport');
    let selectedSport = 'Súlyzós edzés';
    for (let r of radios) {
        if (r.checked) { selectedSport = r.value; break; }
    }

    const isStrength = (selectedSport === 'Súlyzós edzés' || selectedSport === 'Funkcionális tréning');
    const date = document.getElementById('pr-date')?.value || (typeof window.getTodayKey === 'function' ? window.getTodayKey() : '');
    const notes = document.getElementById('pr-notes')?.value.trim() || '';

    let recordData = {
        id: editId || ('pr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
        sportCategory: selectedSport,
        type: isStrength ? 'strength' : 'endurance',
        date,
        notes,
        createdAt: editId ? undefined : Date.now()
    };

    if (isStrength) {
        const select = document.getElementById('pr-strength-exercise');
        let exName = select.value;
        if (exName === '__custom__') {
            exName = document.getElementById('pr-strength-custom-exercise').value.trim() || 'Egyedi gyakorlat';
        }
        const weight = parseFloat(document.getElementById('pr-weight').value) || 0;
        const reps = parseInt(document.getElementById('pr-reps').value, 10) || 1;
        if (weight <= 0) {
            alert('Kérlek adj meg egy érvényes súlyt (kg)!');
            return;
        }

        const calculated1RM = window.calculateEpley1RM(weight, reps);

        recordData.exerciseName = exName;
        recordData.weight = weight;
        recordData.reps = reps;
        recordData.calculated1RM = calculated1RM;
    } else {
        const customName = document.getElementById('pr-endurance-name').value.trim();
        const dist = parseFloat(document.getElementById('pr-distance').value) || 0;
        const h = parseInt(document.getElementById('pr-time-hours').value, 10) || 0;
        const m = parseInt(document.getElementById('pr-time-minutes').value, 10) || 0;
        const s = parseInt(document.getElementById('pr-time-seconds').value, 10) || 0;
        const totalSeconds = (h * 3600) + (m * 60) + s;

        if (dist <= 0 || totalSeconds <= 0) {
            alert('Kérlek adj meg érvényes távolságot és időeredményt!');
            return;
        }

        const hours = totalSeconds / 3600;
        const speed = dist / hours;
        const totalMinutes = totalSeconds / 60;
        const paceDecimal = totalMinutes / dist;
        const paceMin = Math.floor(paceDecimal);
        let paceSec = Math.round((paceDecimal - paceMin) * 60);
        let finalPaceMin = paceMin;
        if (paceSec >= 60) { finalPaceMin += 1; paceSec = 0; }

        recordData.exerciseName = customName || `${selectedSport} (${dist} km)`;
        recordData.distance = dist;
        recordData.durationSeconds = totalSeconds;
        recordData.timeFormatted = formatSecondsToTime(totalSeconds);
        recordData.avgSpeed = Math.round(speed * 100) / 100;
        recordData.avgPace = `${finalPaceMin}:${String(paceSec).padStart(2, '0')}`;
    }

    if (!window.personalRecords) window.personalRecords = [];

    if (editId) {
        const idx = window.personalRecords.findIndex(r => r.id === editId);
        if (idx !== -1) {
            recordData.createdAt = window.personalRecords[idx].createdAt || Date.now();
            window.personalRecords[idx] = recordData;
        } else {
            window.personalRecords.unshift(recordData);
        }
    } else {
        window.personalRecords.unshift(recordData);
    }

    // Központi mentés meghívása (Firebase & LocalStorage)
    if (typeof window.saveData === 'function') {
        window.saveData();
    }

    if (typeof window.closeModal === 'function') {
        window.closeModal('pr-modal');
    }

    window.renderPRHub();

    if (typeof window.showToast === 'function') {
        window.showToast('Egyéni rekord sikeresen elmentve!', 'fa-trophy', 'brand');
    }
};

/**
 * Rekord törlése megerősítéssel
 */
window.deletePRRecord = function(id) {
    const doDelete = function() {
        window.personalRecords = (window.personalRecords || []).filter(r => r.id !== id);
        if (typeof window.saveData === 'function') window.saveData();
        window.renderPRHub();
        if (typeof window.showToast === 'function') {
            window.showToast('Rekord törölve!', 'fa-trash-can', 'brand');
        }
    };

    if (typeof window.customConfirm === 'function') {
        window.customConfirm('Rekord Törlése', 'Biztosan törölni szeretnéd ezt a csúcsteljesítményt?', doDelete);
    } else if (confirm('Biztosan törölni szeretnéd ezt a rekordot?')) {
        doDelete();
    }
};

// ==============================================================
// 4. KÜLÖNÁLLÓ 1RM KALKULÁTOR MODÁL MOTORJA
// ==============================================================

/**
 * 1RM Kalkulátor Modál megnyitása
 */
window.open1RMCalculatorModal = function() {
    const modal = document.getElementById('pr-calc-modal');
    if (!modal) return;
    window.calculateStandalone1RM();
    modal.classList.remove('hidden');
};

/**
 * Standalone 1RM és Ismétlési Terhelési Zónák Élő Számítása
 */
window.calculateStandalone1RM = function() {
    const w = parseFloat(document.getElementById('standalone-calc-weight')?.value) || 0;
    const r = parseInt(document.getElementById('standalone-calc-reps')?.value, 10) || 0;
    const resultEl = document.getElementById('calc-result-1rm');
    const tableBody = document.getElementById('calc-zones-table-body');

    if (w <= 0 || r <= 0) {
        if (resultEl) resultEl.textContent = '0 kg';
        if (tableBody) tableBody.innerHTML = '';
        return;
    }

    const oneRM = window.calculateEpley1RM(w, r);
    if (resultEl) resultEl.textContent = `${oneRM} kg`;

    if (!tableBody) return;

    // Terhelési zónák és százalékos értékek
    const zones = [
        { reps: '1 RM', percent: 1.00, desc: 'Maximális Erő (Neuromuszkuláris csúcs)', badgeClass: 'text-rose-500 bg-rose-500/10' },
        { reps: '2 RM', percent: 0.95, desc: 'Relatív Maximális Erő', badgeClass: 'text-amber-500 bg-amber-500/10' },
        { reps: '3 RM', percent: 0.93, desc: 'Súlyemelő & Robbanékony Erőfejlesztés', badgeClass: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10' },
        { reps: '5 RM', percent: 0.87, desc: 'Funkcionális Erő & Alapgyakorlatok', badgeClass: 'text-emerald-500 bg-emerald-500/10' },
        { reps: '8 RM', percent: 0.80, desc: 'Izomtömeg-növelés (Hipertrófia)', badgeClass: 'text-blue-500 bg-blue-500/10' },
        { reps: '10 RM', percent: 0.75, desc: 'Tiszta Hipertrófia & Volumentréning', badgeClass: 'text-indigo-500 bg-indigo-500/10' },
        { reps: '12 RM', percent: 0.70, desc: 'Izomállóképesség & Metabolikus Stressz', badgeClass: 'text-purple-500 bg-purple-500/10' }
    ];

    let html = '';
    zones.forEach(z => {
        // Valós edzőtermi tárcsákhoz kerekítés (legközelebbi 0.5 kg)
        const targetWeight = Math.round((oneRM * z.percent) * 2) / 2;
        const percentFormatted = Math.round(z.percent * 100);

        html += `
            <tr class="hover:bg-yellow-500/5 transition">
                <td class="p-2 sm:p-2.5 font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                        ${z.reps.split(' ')[0]}
                    </span>
                    <span>${z.reps}</span>
                </td>
                <td class="p-2 sm:p-2.5 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${z.badgeClass}">
                        ${percentFormatted}%
                    </span>
                </td>
                <td class="p-2 sm:p-2.5 text-right font-black text-sm text-yellow-600 dark:text-yellow-400">
                    ${targetWeight} <span class="text-[10px] text-slate-400 font-normal">kg</span>
                </td>
                <td class="p-2 sm:p-2.5 text-right text-slate-500 dark:text-slate-400 text-[11px] hidden sm:table-cell">
                    ${z.desc}
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
};
