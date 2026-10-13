// ==============================================================
// FitPlan Pro - Edzés, Programok, Izomtérkép & Garmin (js/workout.js)
// ==============================================================

// ==============================================================
// 1. GARMIN .FIT BINÁRIS PARSER & METRIKÁK MOTORJA
// ==============================================================
function parseGarminFitBinary(arrayBuffer) {
    const dataView = new DataView(arrayBuffer);
    const byteLength = arrayBuffer.byteLength;
    if (byteLength < 14) throw new Error("A fájl túl kicsi, nem érvényes .FIT formátum!");

    const headerSize = dataView.getUint8(0);
    let fitTag = "";
    for (let i = 8; i < 12; i++) fitTag += String.fromCharCode(dataView.getUint8(i));
    if (fitTag !== ".FIT" && dataView.getUint8(1) !== 0x10 && dataView.getUint8(1) !== 0x20) {
        throw new Error("Nem felismerhető Garmin .FIT fájl!");
    }

    const definitions = {};
    const extracted = {
        total_distance: null, total_timer_time: null, total_calories: null,
        avg_speed: null, avg_heart_rate: null, max_heart_rate: null,
        avg_cadence: null, total_ascent: null, avg_power: null,
        total_training_effect: null, total_anaerobic_effect: null,
        total_sweat_loss: null, total_reps: null, sets_count: 0
    };

    let offset = headerSize;
    const isInvalid8 = (v) => v === 0xFF;
    const isInvalid16 = (v) => v === 0xFFFF || v === 0x7FFF;
    const isInvalid32 = (v) => v === 0xFFFFFFFF || v === 0x7FFFFFFF;

    while (offset < byteLength - 2) {
        const recordHeader = dataView.getUint8(offset);
        offset++;
        if ((recordHeader & 0x80) === 0) {
            const isDefinition = (recordHeader & 0x40) !== 0;
            const hasDevData = (recordHeader & 0x20) !== 0;
            const localMesgNum = recordHeader & 0x0F;

            if (isDefinition) {
                if (offset + 5 > byteLength) break;
                offset++;
                const arch = dataView.getUint8(offset);
                offset++;
                const isLE = (arch === 0);
                const globalMesgNum = dataView.getUint16(offset, isLE);
                offset += 2;
                const numFields = dataView.getUint8(offset);
                offset++;

                const fields = [];
                for (let f = 0; f < numFields; f++) {
                    if (offset + 3 > byteLength) break;
                    const fNum = dataView.getUint8(offset);
                    const fSize = dataView.getUint8(offset + 1);
                    const fType = dataView.getUint8(offset + 2);
                    fields.push({ num: fNum, size: fSize, type: fType });
                    offset += 3;
                }
                if (hasDevData && offset < byteLength) {
                    const numDevFields = dataView.getUint8(offset);
                    offset += 1 + (numDevFields * 3);
                }
                definitions[localMesgNum] = { isLE, globalMesgNum, fields };
            } else {
                const def = definitions[localMesgNum];
                if (!def) { offset += 2; continue; }
                const isLE = def.isLE;
                const globalNum = def.globalMesgNum;

                if (globalNum === 18) { // Session rekord
                    for (const f of def.fields) {
                        if (offset + f.size > byteLength) break;
                        if ((f.num === 7 || f.num === 8) && f.size === 4) {
                            const val = dataView.getUint32(offset, isLE);
                            if (!isInvalid32(val)) extracted.total_timer_time = val / 1000;
                        }
                        if (f.num === 9 && f.size === 4) {
                            const val = dataView.getUint32(offset, isLE);
                            if (!isInvalid32(val)) extracted.total_distance = val / 100000;
                        }
                        if (f.num === 11 && f.size === 2) {
                            const val = dataView.getUint16(offset, isLE);
                            if (!isInvalid16(val)) extracted.total_calories = val;
                        }
                        if (f.num === 14 && f.size === 2) {
                            const val = dataView.getUint16(offset, isLE);
                            if (!isInvalid16(val)) extracted.avg_speed = (val / 1000) * 3.6;
                        }
                        if (f.num === 16 && f.size === 1) {
                            const val = dataView.getUint8(offset);
                            if (!isInvalid8(val) && val > 30 && val < 240) extracted.avg_heart_rate = val;
                        }
                        if (f.num === 17 && f.size === 1) {
                            const val = dataView.getUint8(offset);
                            if (!isInvalid8(val) && val > 30 && val < 240) extracted.max_heart_rate = val;
                        }
                        if (f.num === 18 && f.size === 1) {
                            const val = dataView.getUint8(offset);
                            if (!isInvalid8(val)) extracted.avg_cadence = val;
                        }
                        if (f.num === 20 && f.size === 2) {
                            const val = dataView.getUint16(offset, isLE);
                            if (!isInvalid16(val)) extracted.avg_power = val;
                        }
                        if (f.num === 22 && f.size === 2) {
                            const val = dataView.getUint16(offset, isLE);
                            if (!isInvalid16(val)) extracted.total_ascent = val;
                        }
                        if (f.num === 24 && f.size === 1) {
                            const val = dataView.getUint8(offset);
                            if (!isInvalid8(val)) extracted.total_training_effect = val / 10;
                        }
                        if (f.num === 25 && f.size === 1) {
                            const val = dataView.getUint8(offset);
                            if (!isInvalid8(val)) extracted.total_anaerobic_effect = val / 10;
                        }
                        if ((f.num === 140 || f.num === 141) && f.size === 2) {
                            const val = dataView.getUint16(offset, isLE);
                            if (!isInvalid16(val) && val > 0 && val < 8000) extracted.total_sweat_loss = val;
                        }
                        offset += f.size;
                    }
                } else {
                    for (const f of def.fields) offset += f.size;
                }
            }
        } else {
            offset++;
        }
    }
    return extracted;
}

window.handleFitFileUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const loading = document.getElementById('fit-loading-banner');
    const status = document.getElementById('fit-parse-status');
    if (loading) loading.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = parseGarminFitBinary(e.target.result);
            if (loading) loading.classList.add('hidden');
            if (status) status.classList.remove('hidden');

            const nameInput = document.getElementById('workout-log-name');
            if (!nameInput.value.trim() || nameInput.value.includes('.fit')) {
                nameInput.value = `Garmin Edzés (${file.name.replace('.fit', '')})`;
            }
            if (data.total_sweat_loss) {
                document.getElementById('workout-log-sweat').value = data.total_sweat_loss;
            }
            if (data.total_distance) window.addCustomMetricField('distance', Number(data.total_distance).toFixed(2));
            if (data.total_timer_time) window.addCustomMetricField('duration', `${Math.round(data.total_timer_time / 60)} perc`);
            if (data.total_calories) window.addCustomMetricField('calories', Math.round(data.total_calories));
            if (data.avg_heart_rate) window.addCustomMetricField('avg_hr', Math.round(data.avg_heart_rate));
            if (data.avg_power) window.addCustomMetricField('avg_power', Math.round(data.avg_power));
            if (data.total_training_effect) {
                const te = Number(data.total_training_effect);
                document.getElementById('workout-log-rpe').value = Math.min(10, Math.max(3, Math.round(te * 2)));
                window.updateRpeDisplay(document.getElementById('workout-log-rpe').value);
            }
            window.showToast("Garmin adatok sikeresen beolvasva!", "fa-satellite-dish", "bluebrand");
        } catch (err) {
            if (loading) loading.classList.add('hidden');
            window.showToast(err.message || "Hiba a FIT fájl olvasásakor!", "fa-circle-exclamation", "red");
        }
    };
    reader.readAsArrayBuffer(file);
};

window.METRIC_CONFIG = {
    distance: { key: 'mDistance', unit: 'km', type: 'number', step: '0.01' },
    duration: { key: 'mDuration', unit: 'min', type: 'text', step: '' },
    calories: { key: 'mCalories', unit: 'kcal', type: 'number', step: '1' },
    avg_hr: { key: 'mAvgHr', unit: 'bpm', type: 'number', step: '1' },
    max_hr: { key: 'mMaxHr', unit: 'bpm', type: 'number', step: '1' },
    avg_pace: { key: 'mAvgPace', unit: 'min/km', type: 'text', step: '' },
    avg_speed: { key: 'mAvgSpeed', unit: 'km/h', type: 'number', step: '0.1' },
    cadence: { key: 'mCadence', unit: 'spm', type: 'number', step: '1' },
    elevation_gain: { key: 'mElevation', unit: 'm', type: 'number', step: '1' },
    avg_power: { key: 'mPower', unit: 'W', type: 'number', step: '1' },
    aerobic_te: { key: 'mAerobicTe', unit: '/5.0', type: 'number', step: '0.1' }
};

window.currentWorkoutMetrics = {};

window.toggleMetricDropdown = function() {
    const dd = document.getElementById('metric-select-dropdown');
    if (dd) dd.classList.toggle('hidden');
};

window.addCustomMetricField = function(key, val = '') {
    const dd = document.getElementById('metric-select-dropdown');
    if (dd) dd.classList.add('hidden');
    if (window.currentWorkoutMetrics[key] === undefined || val !== '') {
        window.currentWorkoutMetrics[key] = val;
    }
    window.renderCustomMetricFields();
};

window.removeCustomMetricField = function(key) {
    delete window.currentWorkoutMetrics[key];
    window.renderCustomMetricFields();
};

window.renderCustomMetricFields = function() {
    const container = document.getElementById('workout-custom-metrics-container');
    if (!container) return;
    container.innerHTML = '';
    const keys = Object.keys(window.currentWorkoutMetrics);
    if (keys.length === 0) { container.classList.add('hidden'); return; }
    container.classList.remove('hidden');

    keys.forEach(k => {
        const conf = window.METRIC_CONFIG[k] || { unit: '', type: 'text' };
        const val = window.currentWorkoutMetrics[k] || '';
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-900 p-2 rounded-xl border border-bluebrand-200 dark:border-bluebrand-900/40 flex flex-col justify-between text-[11px] shadow-sm";
        card.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <span class="text-slate-700 dark:text-slate-300 font-semibold truncate">${k}</span>
                <button type="button" onclick="removeCustomMetricField('${k}')" class="text-slate-400 hover:text-red-500 cursor-pointer"><i class="fa-solid fa-xmark text-[10px]"></i></button>
            </div>
            <div class="flex items-center gap-1">
                <input type="${conf.type}" value="${val}" oninput="window.currentWorkoutMetrics['${k}'] = this.value" class="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-900 dark:text-white font-bold text-xs">
                <span class="text-slate-400 text-[10px]">${conf.unit}</span>
            </div>
        `;
        container.appendChild(card);
    });
};

// ==============================================================
// 2. SÚLYVÁLASZTÓ SEGÉD-CSÚSZKA (Z-[100] RÉTEG)
// ==============================================================
window.openWeightPickerForProgramItem = function(idx) {
    const item = window.currentProgramBuilderItems[idx];
    if (!item) return;
    window.weightPickerTarget = { type: 'programItem', index: idx };
    window.weightPickerCurrentVal = (item.weight === -1 || item.weightType === 'bw') ? -1 : item.weight;
    window.initWeightPickerModal();
};

window.openWeightPickerForLogAdd = function() {
    window.weightPickerTarget = { type: 'logAdd' };
    const btn = document.getElementById('wlog-add-ex-weight-btn');
    const current = Number(btn.getAttribute('data-val')) || -1;
    window.weightPickerCurrentVal = current;
    window.initWeightPickerModal();
};

window.openWeightPickerForLogQuick = function() {
    window.weightPickerTarget = { type: 'logQuick' };
    const btn = document.getElementById('wlog-quick-weight-btn');
    const current = Number(btn.getAttribute('data-val')) || -1;
    window.weightPickerCurrentVal = current;
    window.initWeightPickerModal();
};

window.initWeightPickerModal = function() {
    const slider = document.getElementById('weight-picker-slider');
    slider.value = window.weightPickerCurrentVal;
    window.updateWeightPickerDisplay(window.weightPickerCurrentVal);
    document.getElementById('weight-picker-modal').classList.remove('hidden');
};

window.updateWeightPickerDisplay = function(val) {
    window.weightPickerCurrentVal = Number(val);
    const display = document.getElementById('weight-picker-display');
    if (window.weightPickerCurrentVal === -1) {
        display.textContent = window.t('weightBW') || 'Testsúly (BW)';
        display.className = "text-2xl font-black text-bluebrand-600 dark:text-bluebrand-400 bg-slate-100 dark:bg-slate-950 py-3 rounded-2xl border border-bluebrand-300 dark:border-bluebrand-800";
    } else {
        display.textContent = `${window.weightPickerCurrentVal} kg`;
        display.className = "text-2xl font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-950 py-3 rounded-2xl border border-slate-300 dark:border-slate-800";
    }
};

window.setWeightPickerValue = function(val) {
    const slider = document.getElementById('weight-picker-slider');
    slider.value = val;
    window.updateWeightPickerDisplay(val);
};

window.confirmWeightPickerSelection = function() {
    const val = window.weightPickerCurrentVal;
    const isBw = (val === -1);

    if (window.weightPickerTarget) {
        if (window.weightPickerTarget.type === 'programItem') {
            const item = window.currentProgramBuilderItems[window.weightPickerTarget.index];
            if (item) {
                item.weight = val;
                item.weightType = isBw ? 'bw' : 'kg';
                window.renderProgramBuilderItems();
            }
        } else if (window.weightPickerTarget.type === 'logAdd') {
            const btn = document.getElementById('wlog-add-ex-weight-btn');
            btn.setAttribute('data-val', val);
            btn.textContent = isBw ? 'BW' : `${val}kg`;
        } else if (window.weightPickerTarget.type === 'logQuick') {
            const btn = document.getElementById('wlog-quick-weight-btn');
            btn.setAttribute('data-val', val);
            btn.textContent = isBw ? 'BW' : `${val}kg`;
        }
    }

    window.closeModal('weight-picker-modal');
};

// ==============================================================
// 3. GYAKORLATOK KÖNYVTÁRA & KATEGÓRIÁK
// ==============================================================
window.renderWorkoutExercisesLibrary = function() {
    window.renderExerciseCategoryPills();

    const grid = document.getElementById('workout-exercises-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let list = window.workoutExercises || [];
    if (window.activeExerciseCategory !== 'all') {
        list = list.filter(e => e.categoryId === window.activeExerciseCategory);
    }

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-400 text-sm">
                <i class="fa-solid fa-dumbbell text-4xl mb-3 text-slate-300 dark:text-slate-700 block"></i>
                Ebben a kategóriában még nincsenek rögzített gyakorlatok.
            </div>
        `;
        return;
    }

    list.forEach(ex => {
        const cat = (window.exerciseCategories || []).find(c => c.id === ex.categoryId);
        const catName = cat ? cat.name : 'Általános';

        let musclesHtml = '';
        if (ex.muscles && Array.isArray(ex.muscles) && ex.muscles.length > 0) {
            musclesHtml = '<div class="flex flex-wrap gap-1 mt-2">';
            ex.muscles.forEach(mKey => {
                const mDef = window.MUSCLE_DEFINITIONS.find(d => d.key === mKey);
                const mName = mDef ? (window.t(mDef.labelKey) || mKey) : mKey;
                musclesHtml += `<span class="px-2 py-0.5 rounded-md bg-bluebrand-50 dark:bg-bluebrand-950 border border-bluebrand-200 dark:border-bluebrand-900/50 text-[10px] font-bold text-bluebrand-700 dark:text-bluebrand-300">${mName}</span>`;
            });
            musclesHtml += '</div>';
        }

        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-bluebrand-500/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition group";
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">${catName}</span>
                    <div class="flex items-center gap-1.5">
                        <button onclick="openWorkoutExerciseModal('${ex.id}')" class="text-slate-400 hover:text-bluebrand-500 p-1 cursor-pointer"><i class="fa-solid fa-pen text-xs"></i></button>
                        <button onclick="deleteWorkoutExerciseDirect('${ex.id}')" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer"><i class="fa-solid fa-trash text-xs"></i></button>
                    </div>
                </div>
                <h4 class="font-bold text-sm text-slate-900 dark:text-white mb-1">${ex.name}</h4>
                ${ex.desc ? `<p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">${ex.desc}</p>` : ''}
                ${musclesHtml}
            </div>

            <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button onclick="addExerciseDirectToTodayWorkout('${ex.id}')" class="w-full py-1.5 bg-bluebrand-50 dark:bg-bluebrand-950/50 hover:bg-bluebrand-100 dark:hover:bg-bluebrand-900/50 text-bluebrand-700 dark:text-bluebrand-300 border border-bluebrand-200 dark:border-bluebrand-800/60 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
                    <i class="fa-solid fa-plus text-[10px]"></i> Hozzáadás mai edzéshez
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
};

window.renderExerciseCategoryPills = function() {
    const container = document.getElementById('exercise-category-pills');
    if (!container) return;
    container.innerHTML = '';

    const isAll = (window.activeExerciseCategory === 'all');
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.onclick = () => window.filterExerciseCategory('all');
    allBtn.className = isAll
        ? "px-3 py-1.5 rounded-xl text-xs font-bold transition bg-bluebrand-600 text-white shadow cursor-pointer"
        : "px-3 py-1.5 rounded-xl text-xs font-bold transition bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer";
    allBtn.textContent = window.t('filterAll');
    container.appendChild(allBtn);

    (window.exerciseCategories || []).forEach(cat => {
        const isActive = (window.activeExerciseCategory === cat.id);
        const pill = document.createElement('div');
        pill.className = `flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${isActive ? 'bg-bluebrand-600 text-white border-bluebrand-600 shadow' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'}`;
        pill.innerHTML = `
            <span onclick="filterExerciseCategory('${cat.id}')" class="cursor-pointer">${cat.name}</span>
            <button type="button" onclick="deleteExerciseCategory('${cat.id}')" class="text-xs hover:text-red-400 ml-1 p-0.5 cursor-pointer" title="Kategória törlése"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(pill);
    });
};

window.filterExerciseCategory = function(catId) {
    window.activeExerciseCategory = catId;
    window.renderWorkoutExercisesLibrary();
};

window.openExerciseCategoryModal = function() {
    document.getElementById('ex-cat-name').value = '';
    document.getElementById('exercise-category-modal').classList.remove('hidden');
};

window.saveExerciseCategoryForm = function(e) {
    e.preventDefault();
    const name = document.getElementById('ex-cat-name').value.trim();
    if (!name) return;

    if (!window.exerciseCategories) window.exerciseCategories = [];
    window.exerciseCategories.push({
        id: 'excat-' + Date.now(),
        name: name
    });
    window.saveData();
    window.closeModal('exercise-category-modal');
    window.renderWorkoutExercisesLibrary();
    window.showToast("Új gyakorlat kategória létrehozva!", "fa-folder-plus", "bluebrand");
};

window.deleteExerciseCategory = function(catId) {
    window.customConfirm(window.t('confirmTitle'), "Biztosan törlöd ezt a kategóriát? A gyakorlatok megmaradnak.", () => {
        window.exerciseCategories = (window.exerciseCategories || []).filter(c => c.id !== catId);
        if (window.activeExerciseCategory === catId) window.activeExerciseCategory = 'all';
        window.saveData();
        window.renderWorkoutExercisesLibrary();
        window.showToast("Kategória törölve", "fa-trash", "red");
    });
};

window.openWorkoutExerciseModal = function(exId = null) {
    const selectEl = document.getElementById('ex-form-category');
    selectEl.innerHTML = '';
    (window.exerciseCategories || []).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        selectEl.appendChild(opt);
    });

    document.getElementById('ex-form-id').value = exId || '';
    const deleteBtn = document.getElementById('ex-delete-btn');

    if (exId) {
        const ex = (window.workoutExercises || []).find(e => e.id === exId);
        if (ex) {
            document.getElementById('workout-exercise-modal-title').textContent = `${ex.name} szerkesztése`;
            document.getElementById('ex-form-name').value = ex.name;
            document.getElementById('ex-form-category').value = ex.categoryId || '';
            document.getElementById('ex-form-desc').value = ex.desc || '';
            window.currentExerciseMuscles = Array.isArray(ex.muscles) ? [...ex.muscles] : [];
            deleteBtn.classList.remove('hidden');
        }
    } else {
        document.getElementById('workout-exercise-modal-title').textContent = window.t('newExerciseBtn');
        document.getElementById('ex-form-name').value = '';
        document.getElementById('ex-form-desc').value = '';
        window.currentExerciseMuscles = [];
        deleteBtn.classList.add('hidden');
    }

    window.updateExerciseMuscleBadges();
    document.getElementById('workout-exercise-modal').classList.remove('hidden');
};

window.toggleExerciseMuscle = function(mKey) {
    const idx = window.currentExerciseMuscles.indexOf(mKey);
    if (idx === -1) window.currentExerciseMuscles.push(mKey);
    else window.currentExerciseMuscles.splice(idx, 1);
    window.updateExerciseMuscleBadges();
};

window.clearExerciseMuscles = function() {
    window.currentExerciseMuscles = [];
    window.updateExerciseMuscleBadges();
};

window.updateExerciseMuscleBadges = function() {
    const container = document.getElementById('ex-muscle-badges');
    if (!container) return;
    container.innerHTML = '';

    window.MUSCLE_DEFINITIONS.forEach(def => {
        const isSelected = window.currentExerciseMuscles.includes(def.key);
        const label = window.t(def.labelKey) || def.key;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => window.toggleExerciseMuscle(def.key);
        btn.className = isSelected
            ? "px-2.5 py-1 rounded-lg text-[10px] font-bold bg-bluebrand-600 text-white shadow transition flex items-center gap-1.5 cursor-pointer"
            : "px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:border-bluebrand-400 transition flex items-center gap-1.5 cursor-pointer";
        btn.innerHTML = `<i class="fa-solid ${def.icon} text-[9px] ${isSelected ? 'text-white' : 'text-slate-400'}"></i> ${label}`;
        container.appendChild(btn);
    });
};

window.saveWorkoutExerciseForm = function(e) {
    e.preventDefault();
    const id = document.getElementById('ex-form-id').value;
    const name = document.getElementById('ex-form-name').value.trim();
    const categoryId = document.getElementById('ex-form-category').value;
    const desc = document.getElementById('ex-form-desc').value.trim();

    const exData = {
        id: id || 'ex-' + Date.now(),
        categoryId: categoryId,
        name: name,
        desc: desc,
        muscles: [...window.currentExerciseMuscles]
    };

    if (!window.workoutExercises) window.workoutExercises = [];

    if (id) {
        const idx = window.workoutExercises.findIndex(e => e.id === id);
        if (idx !== -1) window.workoutExercises[idx] = exData;
    } else {
        window.workoutExercises.push(exData);
    }

    window.saveData();
    window.closeModal('workout-exercise-modal');
    window.renderWorkoutExercisesLibrary();
    window.showToast("Gyakorlat sikeresen elmentve!", "fa-dumbbell", "bluebrand");
};

window.deleteCurrentWorkoutExercise = function() {
    const id = document.getElementById('ex-form-id').value;
    window.deleteWorkoutExerciseDirect(id);
    window.closeModal('workout-exercise-modal');
};

window.deleteWorkoutExerciseDirect = function(exId) {
    window.customConfirm(window.t('confirmTitle'), "Biztosan törlöd ezt a gyakorlatot a könyvtárból?", () => {
        window.workoutExercises = (window.workoutExercises || []).filter(e => e.id !== exId);
        window.saveData();
        window.renderWorkoutExercisesLibrary();
        window.showToast("Gyakorlat törölve", "fa-trash", "red");
    });
};

// ==============================================================
// 4. EDZÉSPROGRAMOK ÉPÍTŐJE (GYAKORLATOKBÓL, SÚLYCSÚSZKÁVAL)
// ==============================================================
window.renderWorkoutProgramsLibrary = function() {
    window.renderProgramCategoryPills();

    const grid = document.getElementById('workout-programs-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let progs = window.workoutPrograms || [];
    if (window.activeProgramCategory !== 'all') {
        progs = progs.filter(p => p.categoryId === window.activeProgramCategory);
    }

    if (progs.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-400 text-sm">
                <i class="fa-solid fa-layer-group text-4xl mb-3 text-slate-300 dark:text-slate-700 block"></i>
                Ebben a kategóriában még nincsenek mentett edzésprogramok.
            </div>
        `;
        return;
    }

    progs.forEach(prog => {
        const cat = (window.programCategories || []).find(c => c.id === prog.categoryId);
        const catName = cat ? cat.name : 'Általános';

        let musclePillsHtml = '';
        if (prog.muscles && Array.isArray(prog.muscles) && prog.muscles.length > 0) {
            musclePillsHtml = '<div class="flex flex-wrap gap-1 mt-2">';
            prog.muscles.forEach(mKey => {
                const mDef = window.MUSCLE_DEFINITIONS.find(d => d.key === mKey);
                const mName = mDef ? (window.t(mDef.labelKey) || mKey) : mKey;
                musclePillsHtml += `<span class="px-2 py-0.5 rounded-md bg-bluebrand-50 dark:bg-bluebrand-950 border border-bluebrand-200 dark:border-bluebrand-900/50 text-[10px] font-bold text-bluebrand-700 dark:text-bluebrand-300">${mName}</span>`;
            });
            musclePillsHtml += '</div>';
        }

        let itemsListHtml = '';
        if (prog.items && Array.isArray(prog.items) && prog.items.length > 0) {
            itemsListHtml = '<div class="mt-3 space-y-1 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">';
            prog.items.forEach((item, idx) => {
                const weightStr = (item.weight === -1 || item.weightType === 'bw') ? 'BW' : `${item.weight} kg`;
                itemsListHtml += `
                    <div class="flex items-center justify-between py-0.5 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                        <span class="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">${idx+1}. ${item.name}</span>
                        <span class="text-bluebrand-600 dark:text-bluebrand-400 font-bold whitespace-nowrap">${item.reps} × ${weightStr}</span>
                    </div>
                `;
            });
            itemsListHtml += '</div>';
        } else if (prog.routine) {
            itemsListHtml = `
                <div class="mt-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto custom-scrollbar">
                    ${prog.routine}
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-bluebrand-500/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition group";
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">${catName}</span>
                    <div class="flex items-center gap-1.5">
                        <button onclick="openWorkoutProgramModal('${prog.id}')" class="text-slate-400 hover:text-bluebrand-500 p-1 cursor-pointer"><i class="fa-solid fa-pen text-xs"></i></button>
                        <button onclick="deleteWorkoutProgramDirect('${prog.id}')" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer"><i class="fa-solid fa-trash text-xs"></i></button>
                    </div>
                </div>
                <h4 class="font-bold text-sm text-slate-900 dark:text-white mb-1.5">${prog.name}</h4>
                ${musclePillsHtml}
                ${itemsListHtml}
            </div>

            <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button onclick="applyProgramToTodayWorkout('${prog.id}')" class="w-full py-2 bg-bluebrand-600 hover:bg-bluebrand-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow shadow-bluebrand-600/20 cursor-pointer">
                    <i class="fa-solid fa-play"></i> Edzés Indítása ezzel a programmal
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
};

window.renderProgramCategoryPills = function() {
    const container = document.getElementById('program-category-pills');
    if (!container) return;
    container.innerHTML = '';

    const isAll = (window.activeProgramCategory === 'all');
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.onclick = () => window.filterProgramCategory('all');
    allBtn.className = isAll
        ? "px-3 py-1.5 rounded-xl text-xs font-bold transition bg-bluebrand-600 text-white shadow cursor-pointer"
        : "px-3 py-1.5 rounded-xl text-xs font-bold transition bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer";
    allBtn.textContent = window.t('filterAll');
    container.appendChild(allBtn);

    (window.programCategories || []).forEach(cat => {
        const isActive = (window.activeProgramCategory === cat.id);
        const pill = document.createElement('div');
        pill.className = `flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${isActive ? 'bg-bluebrand-600 text-white border-bluebrand-600 shadow' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'}`;
        pill.innerHTML = `
            <span onclick="filterProgramCategory('${cat.id}')" class="cursor-pointer">${cat.name}</span>
            <button type="button" onclick="deleteProgramCategory('${cat.id}')" class="text-xs hover:text-red-400 ml-1 p-0.5 cursor-pointer" title="Kategória törlése"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(pill);
    });
};

window.filterProgramCategory = function(catId) {
    window.activeProgramCategory = catId;
    window.renderWorkoutProgramsLibrary();
};

window.openProgramCategoryModal = function() {
    document.getElementById('prog-cat-name').value = '';
    document.getElementById('program-category-modal').classList.remove('hidden');
};

window.saveProgramCategoryForm = function(e) {
    e.preventDefault();
    const name = document.getElementById('prog-cat-name').value.trim();
    if (!name) return;

    if (!window.programCategories) window.programCategories = [];
    window.programCategories.push({
        id: 'cat-' + Date.now(),
        name: name
    });
    window.saveData();
    window.closeModal('program-category-modal');
    window.renderWorkoutProgramsLibrary();
    window.showToast("Új kategória létrehozva!", "fa-folder-plus", "bluebrand");
};

window.deleteProgramCategory = function(catId) {
    window.customConfirm(window.t('confirmTitle'), "Biztosan törlöd ezt a kategóriát?", () => {
        window.programCategories = (window.programCategories || []).filter(c => c.id !== catId);
        if (window.activeProgramCategory === catId) window.activeProgramCategory = 'all';
        window.saveData();
        window.renderWorkoutProgramsLibrary();
        window.showToast("Kategória törölve", "fa-trash", "red");
    });
};

window.openWorkoutProgramModal = function(progId = null) {
    const selectEl = document.getElementById('prog-form-category');
    selectEl.innerHTML = '';
    (window.programCategories || []).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        selectEl.appendChild(opt);
    });

    const exPicker = document.getElementById('prog-exercise-picker');
    exPicker.innerHTML = '<option value="">-- Válassz gyakorlatot a könyvtárból --</option>';
    (window.workoutExercises || []).forEach(ex => {
        const opt = document.createElement('option');
        opt.value = ex.id;
        opt.textContent = ex.name;
        exPicker.appendChild(opt);
    });

    document.getElementById('prog-form-id').value = progId || '';
    const deleteBtn = document.getElementById('prog-delete-btn');

    if (progId) {
        const prog = (window.workoutPrograms || []).find(p => p.id === progId);
        if (prog) {
            document.getElementById('workout-program-modal-title').textContent = `${prog.name} szerkesztése`;
            document.getElementById('prog-form-name').value = prog.name;
            document.getElementById('prog-form-category').value = prog.categoryId || '';
            window.currentProgramBuilderItems = (prog.items && Array.isArray(prog.items)) 
                ? JSON.parse(JSON.stringify(prog.items)) 
                : [];
            window.currentProgramMuscles = Array.isArray(prog.muscles) ? [...prog.muscles] : [];
            deleteBtn.classList.remove('hidden');
        }
    } else {
        document.getElementById('workout-program-modal-title').textContent = window.t('newProgramBtn');
        document.getElementById('prog-form-name').value = '';
        window.currentProgramBuilderItems = [];
        window.currentProgramMuscles = [];
        deleteBtn.classList.add('hidden');
    }

    window.renderProgramBuilderItems();
    document.getElementById('workout-program-modal').classList.remove('hidden');
};

window.addExerciseToProgramBuilder = function() {
    const picker = document.getElementById('prog-exercise-picker');
    const exId = picker.value;
    if (!exId) return;

    const ex = (window.workoutExercises || []).find(e => e.id === exId);
    if (!ex) return;

    window.currentProgramBuilderItems.push({
        exerciseId: ex.id,
        name: ex.name,
        reps: 10,
        weight: -1,
        weightType: 'bw',
        muscles: Array.isArray(ex.muscles) ? [...ex.muscles] : []
    });

    window.renderProgramBuilderItems();
    window.showToast(`${ex.name} hozzáadva a programhoz!`, 'fa-plus', 'bluebrand');
};

window.removeProgramBuilderItem = function(idx) {
    window.currentProgramBuilderItems.splice(idx, 1);
    window.renderProgramBuilderItems();
};

window.renderProgramBuilderItems = function() {
    const container = document.getElementById('prog-items-container');
    if (!container) return;
    container.innerHTML = '';

    if (window.currentProgramBuilderItems.length === 0) {
        container.innerHTML = `<div id="prog-items-empty" class="text-center py-4 text-slate-400 italic text-[11px]">Még nincsenek hozzáadott gyakorlatok a programban.</div>`;
        window.recalcProgramBuilderMuscles();
        return;
    }

    window.currentProgramBuilderItems.forEach((item, idx) => {
        const weightLabel = (item.weight === -1 || item.weightType === 'bw') ? 'Testsúly (BW)' : `${item.weight} kg`;
        
        const row = document.createElement('div');
        row.className = "flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-2 text-xs shadow-xs";
        row.innerHTML = `
            <div class="flex items-center gap-2 flex-1 truncate">
                <span class="w-5 h-5 rounded-full bg-bluebrand-100 dark:bg-bluebrand-900/50 text-bluebrand-700 dark:text-bluebrand-300 flex items-center justify-center text-[10px] font-black">${idx+1}</span>
                <strong class="text-slate-900 dark:text-white truncate">${item.name}</strong>
            </div>

            <div class="flex items-center gap-2">
                <div class="flex items-center gap-1">
                    <label class="text-[10px] text-slate-400 font-semibold">Ismétlés:</label>
                    <input type="number" min="1" max="500" value="${item.reps}" 
                        onchange="window.currentProgramBuilderItems[${idx}].reps = Number(this.value)"
                        class="w-14 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1 text-center font-bold text-xs">
                </div>

                <button type="button" onclick="openWeightPickerForProgramItem(${idx})" 
                    class="px-2.5 py-1 bg-slate-100 dark:bg-slate-950 hover:bg-bluebrand-50 dark:hover:bg-bluebrand-950/60 border border-slate-300 dark:border-slate-800 hover:border-bluebrand-400 rounded-lg font-bold text-[11px] text-bluebrand-600 dark:text-bluebrand-400 transition cursor-pointer flex items-center gap-1">
                    <i class="fa-solid fa-weight-hanging text-[10px]"></i>
                    <span>${weightLabel}</span>
                </button>

                <button type="button" onclick="removeProgramBuilderItem(${idx})" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </div>
        `;
        container.appendChild(row);
    });

    window.recalcProgramBuilderMuscles();
};

window.recalcProgramBuilderMuscles = function() {
    const set = new Set();
    window.currentProgramBuilderItems.forEach(item => {
        if (item.muscles && Array.isArray(item.muscles)) {
            item.muscles.forEach(m => set.add(m));
        }
    });
    window.currentProgramMuscles = Array.from(set);

    const container = document.getElementById('prog-muscle-badges');
    if (!container) return;
    container.innerHTML = '';

    if (window.currentProgramMuscles.length === 0) {
        container.innerHTML = '<span class="text-[10px] text-slate-400 italic">Nincsenek érintett izomcsoportok.</span>';
        return;
    }

    window.currentProgramMuscles.forEach(mKey => {
        const def = window.MUSCLE_DEFINITIONS.find(d => d.key === mKey);
        const label = def ? (window.t(def.labelKey) || def.key) : mKey;
        const badge = document.createElement('span');
        badge.className = "px-2.5 py-1 rounded-lg text-[10px] font-bold bg-bluebrand-600 text-white shadow-xs flex items-center gap-1";
        badge.innerHTML = `<i class="fa-solid ${def ? def.icon : 'fa-dumbbell'} text-[9px]"></i> ${label}`;
        container.appendChild(badge);
    });
};

window.saveWorkoutProgramForm = function(e) {
    e.preventDefault();
    const id = document.getElementById('prog-form-id').value;
    const name = document.getElementById('prog-form-name').value.trim();
    const categoryId = document.getElementById('prog-form-category').value;

    let routineSummary = '';
    window.currentProgramBuilderItems.forEach((item, idx) => {
        const w = (item.weight === -1 || item.weightType === 'bw') ? 'BW' : `${item.weight}kg`;
        routineSummary += `${idx+1}. ${item.name} (${item.reps} × ${w})\n`;
    });

    const progData = {
        id: id || 'prog-' + Date.now(),
        categoryId: categoryId,
        name: name,
        items: JSON.parse(JSON.stringify(window.currentProgramBuilderItems)),
        routine: routineSummary.trim(),
        muscles: [...window.currentProgramMuscles]
    };

    if (!window.workoutPrograms) window.workoutPrograms = [];

    if (id) {
        const idx = window.workoutPrograms.findIndex(p => p.id === id);
        if (idx !== -1) window.workoutPrograms[idx] = progData;
    } else {
        window.workoutPrograms.push(progData);
    }

    window.saveData();
    window.closeModal('workout-program-modal');
    window.renderWorkoutProgramsLibrary();
    window.showToast("Edzésprogram elmentve!", 'fa-layer-group', 'bluebrand');
};

window.deleteCurrentWorkoutProgram = function() {
    const id = document.getElementById('prog-form-id').value;
    window.deleteWorkoutProgramDirect(id);
    window.closeModal('workout-program-modal');
};

window.deleteWorkoutProgramDirect = function(progId) {
    window.customConfirm(window.t('confirmTitle'), "Biztosan törlöd ezt az edzésprogramot?", () => {
        window.workoutPrograms = (window.workoutPrograms || []).filter(p => p.id !== progId);
        window.saveData();
        window.renderWorkoutProgramsLibrary();
        window.showToast("Edzésprogram törölve", "fa-trash", "red");
    });
};

// ==============================================================
// 5. EDZÉSNAPLÓ 3-UTAS GYAKORLAT & PROGRAM KEZELŐJE
// ==============================================================
window.currentWorkoutLogItems = [];

window.toggleWorkoutLogProgramSelect = function() {
    const p = document.getElementById('wlog-panel-program');
    const isOpen = !p.classList.contains('hidden');
    document.getElementById('wlog-panel-exercise').classList.add('hidden');
    document.getElementById('wlog-panel-quick-create').classList.add('hidden');
    
    if (isOpen) {
        p.classList.add('hidden');
    } else {
        window.populateWlogProgramPicker();
        p.classList.remove('hidden');
    }
};

window.toggleWorkoutLogExerciseSelect = function() {
    const p = document.getElementById('wlog-panel-exercise');
    const isOpen = !p.classList.contains('hidden');
    document.getElementById('wlog-panel-program').classList.add('hidden');
    document.getElementById('wlog-panel-quick-create').classList.add('hidden');
    
    if (isOpen) {
        p.classList.add('hidden');
    } else {
        window.populateWlogExercisePicker();
        p.classList.remove('hidden');
    }
};

window.toggleWorkoutLogQuickCreate = function() {
    const p = document.getElementById('wlog-panel-quick-create');
    const isOpen = !p.classList.contains('hidden');
    document.getElementById('wlog-panel-program').classList.add('hidden');
    document.getElementById('wlog-panel-exercise').classList.add('hidden');
    
    if (isOpen) {
        p.classList.add('hidden');
    } else {
        window.populateWlogQuickCategoryPicker();
        window.currentQuickExerciseMuscles = [];
        window.updateWlogQuickMuscleBadges();
        p.classList.remove('hidden');
    }
};

window.populateWlogProgramPicker = function() {
    const sel = document.getElementById('wlog-program-picker-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Válassz edzésprogramot --</option>';

    (window.programCategories || []).forEach(cat => {
        const progs = (window.workoutPrograms || []).filter(p => p.categoryId === cat.id);
        if (progs.length > 0) {
            const grp = document.createElement('optgroup');
            grp.label = cat.name;
            progs.forEach(prog => {
                const opt = document.createElement('option');
                opt.value = prog.id;
                opt.textContent = prog.name;
                grp.appendChild(opt);
            });
            sel.appendChild(grp);
        }
    });
};

window.populateWlogExercisePicker = function() {
    const sel = document.getElementById('wlog-exercise-picker-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Válassz gyakorlatot --</option>';

    (window.exerciseCategories || []).forEach(cat => {
        const exs = (window.workoutExercises || []).filter(e => e.categoryId === cat.id);
        if (exs.length > 0) {
            const grp = document.createElement('optgroup');
            grp.label = cat.name;
            exs.forEach(ex => {
                const opt = document.createElement('option');
                opt.value = ex.id;
                opt.textContent = ex.name;
                grp.appendChild(opt);
            });
            sel.appendChild(grp);
        }
    });
};

window.populateWlogQuickCategoryPicker = function() {
    const sel = document.getElementById('wlog-quick-category');
    if (!sel) return;
    sel.innerHTML = '';
    (window.exerciseCategories || []).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        sel.appendChild(opt);
    });
};

window.applyFullProgramToLog = function() {
    const progId = document.getElementById('wlog-program-picker-select').value;
    if (!progId) return;

    const prog = (window.workoutPrograms || []).find(p => p.id === progId);
    if (!prog) return;

    const nameInput = document.getElementById('workout-log-name');
    if (!nameInput.value.trim() || nameInput.value.includes('Garmin')) {
        nameInput.value = prog.name;
    }

    if (prog.items && Array.isArray(prog.items) && prog.items.length > 0) {
        prog.items.forEach(it => {
            window.currentWorkoutLogItems.push({
                exerciseId: it.exerciseId,
                name: it.name,
                reps: it.reps,
                weight: it.weight,
                weightType: it.weightType || ((it.weight === -1) ? 'bw' : 'kg'),
                muscles: Array.isArray(it.muscles) ? [...it.muscles] : []
            });
        });
    } else if (prog.routine) {
        window.currentWorkoutLogItems.push({
            exerciseId: null,
            name: prog.name,
            reps: 1,
            weight: -1,
            weightType: 'bw',
            muscles: Array.isArray(prog.muscles) ? [...prog.muscles] : []
        });
    }

    document.getElementById('wlog-panel-program').classList.add('hidden');
    window.renderWorkoutLogItems();
    window.showToast(`${prog.name} gyakorlatai beemelve!`, 'fa-check', 'bluebrand');
};

window.addSingleExerciseToLog = function() {
    const exId = document.getElementById('wlog-exercise-picker-select').value;
    if (!exId) return;

    const ex = (window.workoutExercises || []).find(e => e.id === exId);
    if (!ex) return;

    const reps = Number(document.getElementById('wlog-add-ex-reps').value) || 10;
    const weightVal = Number(document.getElementById('wlog-add-ex-weight-btn').getAttribute('data-val')) || -1;

    window.currentWorkoutLogItems.push({
        exerciseId: ex.id,
        name: ex.name,
        reps: reps,
        weight: weightVal,
        weightType: (weightVal === -1) ? 'bw' : 'kg',
        muscles: Array.isArray(ex.muscles) ? [...ex.muscles] : []
    });

    document.getElementById('wlog-panel-exercise').classList.add('hidden');
    window.renderWorkoutLogItems();
    window.showToast(`${ex.name} hozzáadva az edzéshez!`, 'fa-plus', 'bluebrand');
};

window.updateWlogQuickMuscleBadges = function() {
    const container = document.getElementById('wlog-quick-muscle-badges');
    if (!container) return;
    container.innerHTML = '';

    window.MUSCLE_DEFINITIONS.forEach(def => {
        const isSelected = window.currentQuickExerciseMuscles.includes(def.key);
        const label = window.t(def.labelKey) || def.key;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => {
            const idx = window.currentQuickExerciseMuscles.indexOf(def.key);
            if (idx === -1) window.currentQuickExerciseMuscles.push(def.key);
            else window.currentQuickExerciseMuscles.splice(idx, 1);
            window.updateWlogQuickMuscleBadges();
        };
        btn.className = isSelected
            ? "px-2 py-0.5 rounded text-[9px] font-bold bg-purplebrand-600 text-white cursor-pointer"
            : "px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 cursor-pointer";
        btn.textContent = label;
        container.appendChild(btn);
    });
};

window.saveQuickExerciseAndAddToLog = function() {
    const name = document.getElementById('wlog-quick-name').value.trim();
    if (!name) return window.showToast("Add meg az új gyakorlat nevét!", "fa-circle-exclamation", "amber");

    const categoryId = document.getElementById('wlog-quick-category').value;
    const reps = Number(document.getElementById('wlog-quick-reps').value) || 12;
    const weightVal = Number(document.getElementById('wlog-quick-weight-btn').getAttribute('data-val')) || -1;

    const newEx = {
        id: 'ex-' + Date.now(),
        categoryId: categoryId,
        name: name,
        desc: 'Helyben rögzített gyakorlat',
        muscles: [...window.currentQuickExerciseMuscles]
    };

    if (!window.workoutExercises) window.workoutExercises = [];
    window.workoutExercises.push(newEx);
    window.saveData();

    window.currentWorkoutLogItems.push({
        exerciseId: newEx.id,
        name: newEx.name,
        reps: reps,
        weight: weightVal,
        weightType: (weightVal === -1) ? 'bw' : 'kg',
        muscles: [...newEx.muscles]
    });

    document.getElementById('wlog-panel-quick-create').classList.add('hidden');
    document.getElementById('wlog-quick-name').value = '';
    window.renderWorkoutLogItems();
    window.showToast(`${newEx.name} létrehozva a könyvtárban és hozzáadva az edzéshez!`, 'fa-check', 'purplebrand');
};

window.removeWorkoutLogItem = function(idx) {
    window.currentWorkoutLogItems.splice(idx, 1);
    window.renderWorkoutLogItems();
};

window.renderWorkoutLogItems = function() {
    const container = document.getElementById('workout-log-items-container');
    if (!container) return;
    container.innerHTML = '';

    if (window.currentWorkoutLogItems.length === 0) {
        container.innerHTML = `<div id="wlog-items-empty" class="text-center py-3 text-slate-400 italic text-[11px]">Még nincsenek hozzáadott gyakorlatok. Válassz a fenti gombokkal!</div>`;
        window.recalcWorkoutLogMuscles();
        return;
    }

    window.currentWorkoutLogItems.forEach((item, idx) => {
        const weightLabel = (item.weight === -1 || item.weightType === 'bw') ? 'BW' : `${item.weight} kg`;
        const row = document.createElement('div');
        row.className = "flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs";
        row.innerHTML = `
            <div class="flex items-center gap-2 truncate pr-2">
                <span class="w-5 h-5 rounded-full bg-bluebrand-600 text-white flex items-center justify-center text-[10px] font-black">${idx+1}</span>
                <strong class="text-slate-900 dark:text-white truncate">${item.name}</strong>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <span class="text-bluebrand-600 dark:text-bluebrand-400 font-bold">${item.reps} × ${weightLabel}</span>
                <button type="button" onclick="removeWorkoutLogItem(${idx})" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </div>
        `;
        container.appendChild(row);
    });

    window.recalcWorkoutLogMuscles();
};

window.recalcWorkoutLogMuscles = function() {
    const set = new Set();
    window.currentWorkoutLogItems.forEach(it => {
        if (it.muscles && Array.isArray(it.muscles)) {
            it.muscles.forEach(m => set.add(m));
        }
    });
    window.currentSelectedMuscles = Array.from(set);
    window.updateMuscleSvgHighlight();
    window.renderMuscleBadges();
};

window.applyProgramToTodayWorkout = function(progId) {
    const prog = (window.workoutPrograms || []).find(p => p.id === progId);
    if (!prog) return;

    window.switchAppMode('workout');
    window.switchWorkoutTab('planner');
    window.openWorkoutLogModal(window.getTodayKey());

    document.getElementById('workout-log-name').value = prog.name;
    window.currentWorkoutLogItems = [];
    if (prog.items && Array.isArray(prog.items)) {
        prog.items.forEach(it => {
            window.currentWorkoutLogItems.push({
                exerciseId: it.exerciseId,
                name: it.name,
                reps: it.reps,
                weight: it.weight,
                weightType: it.weightType || ((it.weight === -1) ? 'bw' : 'kg'),
                muscles: Array.isArray(it.muscles) ? [...it.muscles] : []
            });
        });
    }
    window.renderWorkoutLogItems();
};

window.addExerciseDirectToTodayWorkout = function(exId) {
    const ex = (window.workoutExercises || []).find(e => e.id === exId);
    if (!ex) return;

    window.switchAppMode('workout');
    window.switchWorkoutTab('planner');
    window.openWorkoutLogModal(window.getTodayKey());

    window.currentWorkoutLogItems.push({
        exerciseId: ex.id,
        name: ex.name,
        reps: 10,
        weight: -1,
        weightType: 'bw',
        muscles: Array.isArray(ex.muscles) ? [...ex.muscles] : []
    });
    window.renderWorkoutLogItems();
};

// ==============================================================
// 6. ANATÓMIAI IZOMTÉRKÉP & HŐTÉRKÉP SZINKRONIZÁLÁS
// ==============================================================
window.getSportBadgeConfig = function(sportKey) {
    const configs = {
        running: { icon: 'fa-person-running', color: 'bg-blue-600 text-white', name: 'Futás' },
        trail_running: { icon: 'fa-tree', color: 'bg-emerald-600 text-white', name: 'Terepfutás' },
        treadmill: { icon: 'fa-person-walking', color: 'bg-cyan-600 text-white', name: 'Futópad' },
        cycling: { icon: 'fa-bicycle', color: 'bg-sky-600 text-white', name: 'Kerékpár' },
        strength_training: { icon: 'fa-dumbbell', color: 'bg-purple-600 text-white', name: 'Súlyzós' },
        cardio_training: { icon: 'fa-heart-pulse', color: 'bg-rose-600 text-white', name: 'Kardió' },
        hiit: { icon: 'fa-fire', color: 'bg-red-600 text-white', name: 'HIIT' },
        functional_training: { icon: 'fa-bolt', color: 'bg-violet-600 text-white', name: 'Funkcionális' },
        yoga: { icon: 'fa-spa', color: 'bg-fuchsia-600 text-white', name: 'Jóga' },
        mobility_stretching: { icon: 'fa-arrows-spin', color: 'bg-emerald-700 text-white', name: 'Mobilitás' },
        pool_swimming: { icon: 'fa-person-swimming', color: 'bg-cyan-700 text-white', name: 'Úszás' },
        rowing: { icon: 'fa-water', color: 'bg-indigo-600 text-white', name: 'Evezés' },
        other: { icon: 'fa-dumbbell', color: 'bg-slate-700 text-white', name: 'Edzés' }
    };
    return configs[sportKey] || configs['other'];
};

window.handleSportTypeChange = function() {
    window.renderMuscleBadges();
    window.updateMuscleSvgHighlight();
};

window.toggleMuscle = function(mKey) {
    const idx = window.currentSelectedMuscles.indexOf(mKey);
    if (idx === -1) window.currentSelectedMuscles.push(mKey);
    else window.currentSelectedMuscles.splice(idx, 1);
    window.updateMuscleSvgHighlight();
    window.renderMuscleBadges();
};

window.clearSelectedMuscles = function() {
    window.currentSelectedMuscles = [];
    window.updateMuscleSvgHighlight();
    window.renderMuscleBadges();
};

window.updateMuscleSvgHighlight = function() {
    document.querySelectorAll('#workout-muscle-map-section .muscle-part').forEach(el => {
        const m = el.getAttribute('data-muscle');
        el.classList.toggle('active', window.currentSelectedMuscles.includes(m));
    });
};

window.renderMuscleBadges = function() {
    const container = document.getElementById('workout-muscle-badges');
    if (!container) return;
    container.innerHTML = '';

    window.MUSCLE_DEFINITIONS.forEach(def => {
        const isSelected = window.currentSelectedMuscles.includes(def.key);
        const label = window.t(def.labelKey) || def.key;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => window.toggleMuscle(def.key);
        btn.className = isSelected
            ? "px-2.5 py-1 rounded-lg text-[10px] font-bold bg-bluebrand-600 text-white shadow cursor-pointer"
            : "px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 cursor-pointer";
        btn.textContent = label;
        container.appendChild(btn);
    });
};

window.renderWeeklyMuscleDashboard = function() {
    const container = document.getElementById('weekly-muscle-pills-container');
    const totalBadge = document.getElementById('weekly-muscle-total-badge');
    if (!container) return;
    container.innerHTML = '';

    const weekDates = window.getWeekDates(window.currentWeekOffset);
    const muscleCounts = {};
    let totalGym = 0;

    weekDates.forEach(dObj => {
        const day = window.getDayData(window.formatDateKey(dObj));
        (day.workouts || []).forEach(w => {
            if (w.muscles && w.muscles.length > 0) {
                totalGym++;
                w.muscles.forEach(m => { muscleCounts[m] = (muscleCounts[m] || 0) + 1; });
            }
        });
    });

    if (totalBadge) totalBadge.textContent = `${totalGym} edzés a héten`;

    document.querySelectorAll('#weekly-muscle-dashboard [data-heat-muscle]').forEach(el => {
        const m = el.getAttribute('data-heat-muscle');
        const count = muscleCounts[m] || 0;
        el.classList.remove('heat-0', 'heat-1', 'heat-2', 'heat-3');
        if (count === 0) el.classList.add('heat-0');
        else if (count === 1) el.classList.add('heat-1');
        else if (count === 2) el.classList.add('heat-2');
        else el.classList.add('heat-3');
    });

    const entries = Object.entries(muscleCounts);
    if (entries.length === 0) {
        container.innerHTML = `<span class="text-[11px] text-slate-400 italic">${window.t('noMusclesThisWeek')}</span>`;
        return;
    }
    entries.sort((a, b) => b[1] - a[1]);
    entries.forEach(([mKey, count]) => {
        const def = window.MUSCLE_DEFINITIONS.find(d => d.key === mKey);
        const pill = document.createElement('div');
        pill.className = "px-2.5 py-1 rounded-xl border border-bluebrand-200 dark:border-bluebrand-800 text-xs font-bold bg-bluebrand-50 dark:bg-bluebrand-950 text-bluebrand-700 dark:text-bluebrand-300 flex items-center gap-1.5 shadow-xs";
        pill.innerHTML = `<span>${def ? window.t(def.labelKey) : mKey}</span><span class="w-4 h-4 rounded-full bg-bluebrand-600 text-white text-[9px] flex items-center justify-center font-black">${count}×</span>`;
        container.appendChild(pill);
    });
};

// ==============================================================
// 7. EDZÉSNAPLÓ FORM & HETI TERVEZŐ
// ==============================================================
window.openWorkoutLogModal = function(dateKey = null, logId = null) {
    if (!dateKey) dateKey = window.getTodayKey();
    document.getElementById('workout-log-date-key').value = dateKey;
    document.getElementById('workout-log-id').value = logId || '';
    const day = window.getDayData(dateKey);
    const deleteBtn = document.getElementById('workout-log-delete-btn');

    document.getElementById('wlog-panel-program').classList.add('hidden');
    document.getElementById('wlog-panel-exercise').classList.add('hidden');
    document.getElementById('wlog-panel-quick-create').classList.add('hidden');

    if (logId) {
        const log = (day.workouts || []).find(l => l.id === logId);
        if (log) {
            document.getElementById('workout-log-modal-title').textContent = `${log.name} szerkesztése`;
            document.getElementById('workout-log-sport').value = log.sport || 'strength_training';
            document.getElementById('workout-log-name').value = log.name || '';
            document.getElementById('workout-log-notes').value = log.notes || '';
            document.getElementById('workout-log-rpe').value = log.rpe || 5;
            document.getElementById('workout-log-sweat').value = log.sweatLoss || '';
            document.getElementById('workout-log-warmup').checked = !!log.warmup;
            document.getElementById('workout-log-cooldown').checked = !!log.cooldown;
            window.currentWorkoutLogItems = log.items ? JSON.parse(JSON.stringify(log.items)) : [];
            window.currentWorkoutMetrics = log.metrics ? { ...log.metrics } : {};
            deleteBtn.classList.remove('hidden');
        }
    } else {
        document.getElementById('workout-log-modal-title').textContent = window.t('workoutLogModalTitle');
        document.getElementById('workout-log-sport').value = 'strength_training';
        document.getElementById('workout-log-name').value = '';
        document.getElementById('workout-log-notes').value = '';
        document.getElementById('workout-log-rpe').value = 5;
        document.getElementById('workout-log-sweat').value = '';
        document.getElementById('workout-log-warmup').checked = false;
        document.getElementById('workout-log-cooldown').checked = false;
        window.currentWorkoutLogItems = [];
        window.currentWorkoutMetrics = {};
        deleteBtn.classList.add('hidden');
    }

    window.updateRpeDisplay(document.getElementById('workout-log-rpe').value);
    window.renderWorkoutLogItems();
    window.renderCustomMetricFields();
    document.getElementById('workout-log-modal').classList.remove('hidden');
};

window.saveWorkoutLogForm = function(e) {
    e.preventDefault();
    const dateKey = document.getElementById('workout-log-date-key').value;
    const logId = document.getElementById('workout-log-id').value;
    const sportKey = document.getElementById('workout-log-sport').value || 'strength_training';
    const sweatVal = Number(document.getElementById('workout-log-sweat').value) || 0;

    const logData = {
        id: logId || 'wlog-' + Date.now(),
        sport: sportKey,
        name: document.getElementById('workout-log-name').value.trim() || 'Edzés',
        notes: document.getElementById('workout-log-notes').value.trim(),
        rpe: Number(document.getElementById('workout-log-rpe').value),
        rating: Number(document.getElementById('workout-log-rating').value) || 3,
        sweatLoss: sweatVal,
        warmup: document.getElementById('workout-log-warmup').checked,
        cooldown: document.getElementById('workout-log-cooldown').checked,
        items: JSON.parse(JSON.stringify(window.currentWorkoutLogItems)),
        muscles: [...window.currentSelectedMuscles],
        metrics: { ...window.currentWorkoutMetrics }
    };

    const day = window.getDayData(dateKey);
    if (logId) {
        const idx = day.workouts.findIndex(l => l.id === logId);
        if (idx !== -1) day.workouts[idx] = logData;
    } else {
        day.workouts.push(logData);
    }

    window.saveData();
    window.renderWorkoutPlanner();
    if (typeof window.renderPlanner === 'function') window.renderPlanner();
    if (typeof window.renderTodayShieldBanner === 'function') window.renderTodayShieldBanner();
    if (typeof window.renderRecoveryFatigueDashboard === 'function') window.renderRecoveryFatigueDashboard();
    window.closeModal('workout-log-modal');
    window.showToast('Edzés rögzítve!', 'fa-dumbbell', 'bluebrand');
};

window.deleteCurrentWorkoutLog = function() {
    const dateKey = document.getElementById('workout-log-date-key').value;
    const logId = document.getElementById('workout-log-id').value;
    const day = window.getDayData(dateKey);
    day.workouts = day.workouts.filter(l => l.id !== logId);

    window.saveData();
    window.renderWorkoutPlanner();
    if (typeof window.renderPlanner === 'function') window.renderPlanner();
    if (typeof window.renderTodayShieldBanner === 'function') window.renderTodayShieldBanner();
    if (typeof window.renderRecoveryFatigueDashboard === 'function') window.renderRecoveryFatigueDashboard();
    window.closeModal('workout-log-modal');
    window.showToast('Edzés törölve!', 'fa-trash-can', 'red');
};

window.updateRpeDisplay = function(val) {
    const display = document.getElementById('rpe-display');
    if (display) display.textContent = `${val} / 10`;
};

window.setRating = function(val) {
    document.getElementById('workout-log-rating').value = val;
    document.querySelectorAll('.rating-btn').forEach((btn, idx) => {
        btn.style.filter = (idx + 1 === val) ? 'grayscale(0)' : 'grayscale(1)';
    });
};

window.renderWorkoutPlanner = function() {
    window.renderWeeklyMuscleDashboard();
    const grid = document.getElementById('workout-log-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const weekDates = window.getWeekDates(window.currentWeekOffset);
    const todayKey = window.getTodayKey();
    const currentDays = window.getDaysArray();

    const rangeLabel = document.getElementById('workout-week-range-label');
    if (rangeLabel) {
        rangeLabel.textContent = `${weekDates[0].getFullYear()}. ${weekDates[0].getMonth()+1}.${weekDates[0].getDate()}. – ${weekDates[6].getMonth()+1}.${weekDates[6].getDate()}.`;
    }

    weekDates.forEach((dObj, dIdx) => {
        const dateKey = window.formatDateKey(dObj);
        const dayData = window.getDayData(dateKey);
        const logs = dayData.workouts || [];
        const isToday = (dateKey === todayKey);

        const card = document.createElement('div');
        card.className = `bg-white dark:bg-slate-900 border rounded-2xl flex flex-col p-3 shadow-sm ${isToday ? 'border-2 border-bluebrand-500 shadow-md' : 'border-slate-200 dark:border-slate-800'}`;

        let logsHtml = '';
        logs.forEach(log => {
            const badge = window.getSportBadgeConfig(log.sport);
            logsHtml += `
                <div onclick="openWorkoutLogModal('${dateKey}', '${log.id}')" class="p-2.5 my-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-bluebrand-500/60 transition cursor-pointer">
                    <div class="flex items-center justify-between mb-1">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badge.color}">${badge.name}</span>
                        <span class="text-[10px] font-bold text-slate-400">RPE ${log.rpe}/10</span>
                    </div>
                    <h4 class="font-bold text-xs truncate text-slate-900 dark:text-white">${log.name}</h4>
                    <div class="text-[10px] text-bluebrand-600 dark:text-bluebrand-400 mt-1">${(log.items || []).length} gyakorlat rögzítve</div>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                <span class="font-bold text-xs ${isToday ? 'text-bluebrand-600' : ''}">${currentDays[dIdx]} (${dObj.getDate()})</span>
                <span class="text-[10px] font-bold text-slate-400">${logs.length} edzés</span>
            </div>
            <div class="flex-1">${logsHtml || '<div class="text-center py-6 text-slate-400 text-xs italic">-</div>'}</div>
            <button onclick="openWorkoutLogModal('${dateKey}')" class="w-full mt-2 py-1.5 bg-bluebrand-50 dark:bg-bluebrand-950 text-bluebrand-600 dark:text-bluebrand-400 rounded-xl text-xs font-bold hover:bg-bluebrand-100 transition cursor-pointer">
                <i class="fa-solid fa-plus text-[10px]"></i> Edzés
            </button>
        `;
        grid.appendChild(card);
    });
};

// ==============================================================
// 8. HAVI NAPTÁR MOTOR (EDZÉSCÍMKÉKKEL A PONTOK HELYETT)
// ==============================================================
window.renderMonthCalendar = function(ctx) {
    const containerId = ctx === 'diet' ? 'diet-month-calendar-grid' : 
        (ctx === 'workout' ? 'workout-month-calendar-grid' : 'recovery-month-calendar-grid');
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const y = window.calCurrentYear, m = window.calCurrentMonth;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    const offset = (firstDay + 6) % 7;

    const titleId = ctx === 'diet' ? 'diet-cal-month-title' : 
        (ctx === 'workout' ? 'workout-cal-month-title' : 'recovery-cal-month-title');
    const titleEl = document.getElementById(titleId);
    if (titleEl) {
        const monthNames = window.i18nData[window.currentLang]?.months || window.i18nData['hu'].months;
        titleEl.textContent = `${y}. ${monthNames[m]}`;
    }

    let html = '<div class="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 uppercase mb-1">';
    window.getDaysArray().forEach(d => html += `<div>${d.slice(0, 2)}</div>`);
    html += '</div><div class="grid grid-cols-7 gap-1.5">';

    for (let i = 0; i < offset; i++) html += '<div></div>';

    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const day = window.getDayData(dateKey);
        const isToday = (dateKey === window.getTodayKey());

        let dayContentHtml = '';

        if (ctx === 'workout') {
            // Edzés havi nézet: pont helyett kis színes címkék
            const workouts = day.workouts || [];
            if (workouts.length > 0) {
                dayContentHtml = '<div class="space-y-1 mt-1 overflow-hidden">';
                workouts.forEach(w => {
                    const badge = window.getSportBadgeConfig(w.sport);
                    dayContentHtml += `
                        <span class="px-1 py-0.5 rounded text-[8px] font-bold ${badge.color} truncate block text-left" title="${w.name}">
                            <i class="fa-solid ${badge.icon} text-[7px] mr-0.5"></i> ${badge.name}
                        </span>
                    `;
                });
                dayContentHtml += '</div>';
            }
        } else if (ctx === 'diet') {
            const mealsCount = (day.meals || []).filter(Boolean).length;
            if (mealsCount > 0) {
                dayContentHtml = `<span class="mt-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-brand-500/15 text-brand-600 dark:text-brand-400 block truncate">${mealsCount} étel</span>`;
            }
        } else if (ctx === 'recovery') {
            if (typeof window.calculateRecoveryShield === 'function') {
                const shield = window.calculateRecoveryShield(dateKey);
                dayContentHtml = `<span class="mt-1 px-1 py-0.5 rounded text-[8px] font-black ${shield.statusTextColor} block">${shield.total}%</span>`;
            }
        }

        html += `
            <div onclick="openCalDayDetail('${dateKey}')" class="min-h-[58px] p-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border ${isToday ? 'border-2 border-brand-500 shadow-sm' : 'border-slate-200 dark:border-slate-800'} text-center cursor-pointer hover:border-bluebrand-500 transition flex flex-col justify-between">
                <span class="text-xs font-bold block ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-slate-200'}">${d}</span>
                ${dayContentHtml}
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
};

window.changeCalMonth = function(dir) {
    window.calCurrentMonth += dir;
    if (window.calCurrentMonth < 0) { window.calCurrentMonth = 11; window.calCurrentYear--; }
    if (window.calCurrentMonth > 11) { window.calCurrentMonth = 0; window.calCurrentYear++; }
    window.renderMonthCalendar(window.currentAppMode);
};

window.openCalDayDetail = function(dateKey) {
    const day = window.getDayData(dateKey);
    document.getElementById('cal-day-modal-title').textContent = `${dateKey} Részletei`;
    
    let wDetails = (day.workouts || []).map(w => {
        const b = window.getSportBadgeConfig(w.sport);
        return `<span class="px-2 py-0.5 rounded text-xs font-bold ${b.color} mr-1">${b.name}: ${w.name}</span>`;
    }).join(' ') || '<span class="text-slate-400 italic">Nincs edzés</span>';

    const hydroEff = typeof window.getDayEffectiveHydration === 'function' ? window.getDayEffectiveHydration(dateKey) : 0;
    const hydroRec = typeof window.getRecommendedWaterIntake === 'function' ? window.getRecommendedWaterIntake(dateKey) : 2500;

    document.getElementById('cal-day-modal-content').innerHTML = `
        <div class="space-y-3 text-xs">
            <div>
                <strong class="block text-slate-400 uppercase text-[10px] mb-1">Rögzített Edzések:</strong>
                <div>${wDetails}</div>
            </div>
            <div>
                <strong class="block text-slate-400 uppercase text-[10px] mb-1">Folyadékbevitel:</strong>
                <div class="text-cyan-600 dark:text-cyan-400 font-bold">${hydroEff} ml (Cél: ${hydroRec} ml)</div>
            </div>
            <div>
                <strong class="block text-slate-400 uppercase text-[10px] mb-1">Recovery Pontszámok:</strong>
                <div>Alvás: ${day.recovery?.sleepScore || '-'} pont | Recovery: ${day.recovery?.recoveryScore || '-'}%</div>
            </div>
        </div>
    `;
    document.getElementById('cal-day-jump-btn').onclick = () => window.jumpToWeekOfDate(dateKey);
    document.getElementById('calendar-day-modal').classList.remove('hidden');
};
