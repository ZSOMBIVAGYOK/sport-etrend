// ==============================================================
// FitPlan Pro - Recovery, Gyűrűk, Fáradtság & Alvás (js/recovery.js)
// ==============================================================

// ==============================================================
// 1. KÖRGYŰRŰ GENERÁTOR & SÚLYOZOTT RECOVERY INDEX MOTOR
// ==============================================================
function createProgressRingSvg(radius, strokeWidth, percent, strokeColor, trackColor = 'rgba(148, 163, 184, 0.2)') {
    const circumference = 2 * Math.PI * radius;
    const validPercent = Math.max(0, Math.min(100, Math.round(percent)));
    const strokeDashoffset = circumference - (validPercent / 100) * circumference;
    const size = (radius + strokeWidth) * 2;
    const center = size / 2;

    return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="overflow-visible flex-shrink-0">
            <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${trackColor}" stroke-width="${strokeWidth}"/>
            <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" class="progress-ring-circle"/>
        </svg>
    `;
}

window.calculateRecoveryShield = function(dateKey) {
    const day = window.getDayData(dateKey);
    const workouts = day.workouts || [];
    const rec = day.recovery || {};
    const waterGoal = typeof window.getRecommendedWaterIntake === 'function' ? window.getRecommendedWaterIntake(dateKey) : 2500;
    const hydroEffective = typeof window.getDayEffectiveHydration === 'function' ? window.getDayEffectiveHydration(dateKey) : 0;

    const hasWorkout = workouts.length > 0;

    // 1. Kis gyűrű: Alvás (0-100%)
    const sleepScore = (rec.sleepScore !== null && rec.sleepScore !== undefined) ? Number(rec.sleepScore) : 80;
    const ringSleepPercent = Math.max(0, Math.min(100, sleepScore));

    // 2. Kis gyűrű: Hidratáció (0-100%)
    const ringHydroPercent = Math.max(0, Math.min(100, Math.round((hydroEffective / (waterGoal || 2500)) * 100)));

    // 3. Kis gyűrű: Bemelegítés
    let ringWarmupPercent = 100;
    if (hasWorkout) {
        ringWarmupPercent = workouts.some(w => w.warmup) ? 100 : 0;
    }

    // 4. Kis gyűrű: Nyújtás / Levezetés
    let ringCooldownPercent = 0;
    const hasCooldownWorkout = workouts.some(w => w.cooldown);
    const hasStretchActivity = (rec.activities || []).some(a => (a.type || '').includes('Nyújtás') || (a.type || '').includes('Mobilizálás'));
    if (hasCooldownWorkout || hasStretchActivity) {
        ringCooldownPercent = 100;
    } else if (!hasWorkout) {
        ringCooldownPercent = (rec.activities && rec.activities.length > 0) ? 100 : 70;
    }

    // 5. Kis gyűrű: Recovery Gyakorlatok / Aktivitások
    const actCount = (rec.activities || []).length;
    const ringExPercent = Math.max(0, Math.min(100, actCount * 50));

    // 1 FŐ NAGY RECOVERY INDEX SÚLYOZVA (0-100%)
    let total = 0;
    if (hasWorkout) {
        total = Math.round(
            (ringSleepPercent * 0.35) + 
            (ringHydroPercent * 0.25) + 
            (ringWarmupPercent * 0.15) + 
            (ringCooldownPercent * 0.15) + 
            (ringExPercent * 0.10)
        );
    } else {
        total = Math.round(
            (ringSleepPercent * 0.45) + 
            (ringHydroPercent * 0.35) + 
            (ringExPercent * 0.20)
        );
    }

    total = Math.max(10, Math.min(100, total));

    let statusColor = '#10b981';
    let statusTextColor = 'text-emerald-500';
    let statusText = window.t('recStatusOptimal');

    if (total < 50) {
        statusColor = '#ef4444';
        statusTextColor = 'text-red-500';
        statusText = window.t('recStatusCritical');
    } else if (total < 75) {
        statusColor = '#f59e0b';
        statusTextColor = 'text-amber-500';
        statusText = window.t('recStatusWarning');
    } else if (total < 90) {
        statusColor = '#3b82f6';
        statusTextColor = 'text-bluebrand-500';
        statusText = window.t('recStatusGood');
    }

    return {
        total,
        hasWorkout,
        statusColor,
        statusTextColor,
        statusText,
        rings: {
            sleep: ringSleepPercent,
            hydro: ringHydroPercent,
            warmup: ringWarmupPercent,
            cooldown: ringCooldownPercent,
            exercises: ringExPercent
        }
    };
};

window.renderTodayShieldBanner = function() {
    const container = document.getElementById('today-shield-content');
    if (!container) return;

    const todayKey = window.getTodayKey();
    const s = window.calculateRecoveryShield(todayKey);

    // 1 FŐ NAGY KÖRGYŰRŰ SVG
    const majorRingSvg = createProgressRingSvg(46, 8, s.total, s.statusColor);

    // 5 KIS KÖRGYŰRŰ SVG
    const sleepRingSvg = createProgressRingSvg(20, 3.5, s.rings.sleep, '#a855f7');
    const hydroRingSvg = createProgressRingSvg(20, 3.5, s.rings.hydro, '#06b6d4');
    const warmupRingSvg = createProgressRingSvg(20, 3.5, s.rings.warmup, '#f97316');
    const cooldownRingSvg = createProgressRingSvg(20, 3.5, s.rings.cooldown, '#10b981');
    const exercisesRingSvg = createProgressRingSvg(20, 3.5, s.rings.exercises, '#ec4899');

    container.innerHTML = `
        <div class="flex flex-col lg:flex-row items-center justify-between gap-6">
            
            <!-- BAL OLDAL: 1 NAGY FŐ INDEX KÖRGYŰRŰ -->
            <div class="flex items-center gap-5">
                <div class="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                    ${majorRingSvg}
                    <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span class="text-2xl font-black ${s.statusTextColor}">${s.total}%</span>
                        <span class="text-[9px] uppercase tracking-wider font-bold text-slate-400">Index</span>
                    </div>
                </div>

                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${s.total >= 75 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}">
                            ${s.statusText}
                        </span>
                        <span class="text-[11px] text-slate-400 font-semibold">${todayKey}</span>
                    </div>
                    <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white" data-i18n="recoveryRingsTitle">Napi Regenerációs Index</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-0.5">
                        ${s.hasWorkout ? window.t('recWorkoutDayDesc') : window.t('recRestDayDesc')}
                    </p>
                </div>
            </div>

            <!-- JOBB OLDAL: 5 KIS KÖRGYŰRŰ ELEM -->
            <div class="grid grid-cols-5 gap-2 sm:gap-3 w-full lg:w-auto">
                
                <!-- 1. Kis gyűrű: Alvás -->
                <div onclick="openRecoveryScoresModal('${todayKey}')" class="flex flex-col items-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-purplebrand-400 transition cursor-pointer text-center group">
                    <div class="relative w-12 h-12 flex items-center justify-center">
                        ${sleepRingSvg}
                        <div class="absolute inset-0 flex items-center justify-center text-purplebrand-600 dark:text-purplebrand-400 text-xs">
                            <i class="fa-solid fa-bed"></i>
                        </div>
                    </div>
                    <span class="text-[10px] font-black text-slate-900 dark:text-white mt-1">${s.rings.sleep}%</span>
                    <span class="text-[9px] font-bold text-slate-400 truncate w-full" data-i18n="recRingSleep">Alvás</span>
                </div>

                <!-- 2. Kis gyűrű: Hidratáció -->
                <div onclick="openHydrationModal('${todayKey}')" class="flex flex-col items-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-cyan-400 transition cursor-pointer text-center group">
                    <div class="relative w-12 h-12 flex items-center justify-center">
                        ${hydroRingSvg}
                        <div class="absolute inset-0 flex items-center justify-center text-cyan-600 dark:text-cyan-400 text-xs">
                            <i class="fa-solid fa-droplet"></i>
                        </div>
                    </div>
                    <span class="text-[10px] font-black text-slate-900 dark:text-white mt-1">${s.rings.hydro}%</span>
                    <span class="text-[9px] font-bold text-slate-400 truncate w-full" data-i18n="recRingHydro">Hidratáció</span>
                </div>

                <!-- 3. Kis gyűrű: Bemelegítés -->
                <div class="flex flex-col items-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-center">
                    <div class="relative w-12 h-12 flex items-center justify-center">
                        ${warmupRingSvg}
                        <div class="absolute inset-0 flex items-center justify-center text-orangebrand-500 text-xs">
                            <i class="fa-solid fa-fire"></i>
                        </div>
                    </div>
                    <span class="text-[10px] font-black text-slate-900 dark:text-white mt-1">${s.rings.warmup}%</span>
                    <span class="text-[9px] font-bold text-slate-400 truncate w-full" data-i18n="recRingWarmup">Bemeleg.</span>
                </div>

                <!-- 4. Kis gyűrű: Nyújtás / Levezetés -->
                <div class="flex flex-col items-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-center">
                    <div class="relative w-12 h-12 flex items-center justify-center">
                        ${cooldownRingSvg}
                        <div class="absolute inset-0 flex items-center justify-center text-emerald-500 text-xs">
                            <i class="fa-solid fa-person-walking"></i>
                        </div>
                    </div>
                    <span class="text-[10px] font-black text-slate-900 dark:text-white mt-1">${s.rings.cooldown}%</span>
                    <span class="text-[9px] font-bold text-slate-400 truncate w-full" data-i18n="recRingCooldown">Nyújtás</span>
                </div>

                <!-- 5. Kis gyűrű: Recovery Gyakorlatok -->
                <div onclick="openRecoveryActivityModal('${todayKey}')" class="flex flex-col items-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-pink-400 transition cursor-pointer text-center group">
                    <div class="relative w-12 h-12 flex items-center justify-center">
                        ${exercisesRingSvg}
                        <div class="absolute inset-0 flex items-center justify-center text-pink-500 text-xs">
                            <i class="fa-solid fa-spa"></i>
                        </div>
                    </div>
                    <span class="text-[10px] font-black text-slate-900 dark:text-white mt-1">${s.rings.exercises}%</span>
                    <span class="text-[9px] font-bold text-slate-400 truncate w-full" data-i18n="recRingExercises">Recovery</span>
                </div>

            </div>
        </div>
    `;
};

// ==============================================================
// 2. DINAMIKUS IZOMFÁRADTSÁG & NYÚJTÁS MOTOR
// ==============================================================
window.calculateMuscleFatigueState = function() {
    const fatigueScores = {};
    window.MUSCLE_DEFINITIONS.forEach(def => {
        fatigueScores[def.key] = 0;
    });

    const weekDates = window.getWeekDates(window.currentWeekOffset);

    weekDates.forEach(dObj => {
        const dateKey = window.formatDateKey(dObj);
        const day = window.getDayData(dateKey);

        // 1. Edzések: Növelik a terhelést és pirosítanak (RPE szorzóval)
        (day.workouts || []).forEach(w => {
            const rpe = Number(w.rpe) || 5;
            const multiplier = (rpe >= 8) ? 1.5 : 1.0;

            const trainedMuscles = new Set();
            if (w.muscles && Array.isArray(w.muscles)) {
                w.muscles.forEach(m => trainedMuscles.add(m));
            }
            if (w.items && Array.isArray(w.items)) {
                w.items.forEach(it => {
                    if (it.muscles && Array.isArray(it.muscles)) {
                        it.muscles.forEach(m => trainedMuscles.add(m));
                    }
                });
            }

            trainedMuscles.forEach(mKey => {
                if (fatigueScores[mKey] !== undefined) {
                    fatigueScores[mKey] += (1 * multiplier);
                }
            });
        });

        // 2. Recovery & Nyújtások: Csökkentik a terhelést és zöldítenek
        const rec = day.recovery || {};
        (rec.activities || []).forEach(act => {
            if (act.muscles && Array.isArray(act.muscles)) {
                act.muscles.forEach(mKey => {
                    if (fatigueScores[mKey] !== undefined) {
                        fatigueScores[mKey] = Math.max(0, fatigueScores[mKey] - 1.2);
                    }
                });
            }
        });
    });

    return fatigueScores;
};

window.renderRecoveryFatigueDashboard = function() {
    const container = document.getElementById('recovery-fatigue-pills-container');
    if (!container) return;
    container.innerHTML = '';

    const fatigueMap = window.calculateMuscleFatigueState();

    document.querySelectorAll('#recovery-fatigue-dashboard [data-fatigue-muscle]').forEach(el => {
        const mKey = el.getAttribute('data-fatigue-muscle');
        const score = fatigueMap[mKey] || 0;

        el.classList.remove('fatigue-0', 'fatigue-1', 'fatigue-2', 'fatigue-3');

        if (score <= 0.3) {
            el.classList.add('fatigue-0');
        } else if (score <= 1.2) {
            el.classList.add('fatigue-1');
        } else if (score <= 2.2) {
            el.classList.add('fatigue-2');
        } else {
            el.classList.add('fatigue-3');
        }
    });

    const entries = Object.entries(fatigueMap);
    entries.sort((a, b) => b[1] - a[1]);

    let hasFatigue = false;

    entries.forEach(([mKey, score]) => {
        const def = window.MUSCLE_DEFINITIONS.find(d => d.key === mKey);
        const label = def ? (window.t(def.labelKey) || mKey) : mKey;
        const icon = def ? def.icon : 'fa-dumbbell';

        let badgeClass = '';
        let statusText = '';

        if (score <= 0.3) {
            badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
            statusText = 'Kipihent';
        } else if (score <= 1.2) {
            badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
            statusText = 'Enyhe terhelés';
            hasFatigue = true;
        } else if (score <= 2.2) {
            badgeClass = 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-300 dark:border-orange-800';
            statusText = 'Fáradt';
            hasFatigue = true;
        } else {
            badgeClass = 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-300 dark:border-red-800';
            statusText = 'Izomláz / Nyújtást igényel!';
            hasFatigue = true;
        }

        const pill = document.createElement('div');
        pill.className = `px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-xs ${badgeClass}`;
        pill.innerHTML = `
            <i class="fa-solid ${icon} text-[10px]"></i>
            <span>${label}:</span>
            <span class="font-normal opacity-90">${statusText}</span>
        `;
        container.appendChild(pill);
    });

    if (!hasFatigue) {
        container.innerHTML = `
            <div class="p-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-sm"></i>
                <span>Minden izomcsoport regenerált és kipihent állapotban van!</span>
            </div>
        `;
    }
};

// ==============================================================
// 3. HETI RECOVERY RÁCS (ALVÁS, RECOVERY PONTSZÁMOK & AKTIVITÁS)
// ==============================================================
window.renderRecoveryPlanner = function() {
    window.renderTodayShieldBanner();
    window.renderRecoveryFatigueDashboard();

    const grid = document.getElementById('recovery-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const weekDates = window.getWeekDates(window.currentWeekOffset);
    const todayKey = window.getTodayKey();
    const currentDays = window.getDaysArray();

    const rangeLabel = document.getElementById('recovery-week-range-label');
    if (rangeLabel) {
        rangeLabel.textContent = `${weekDates[0].getFullYear()}. ${weekDates[0].getMonth()+1}.${weekDates[0].getDate()}. – ${weekDates[6].getMonth()+1}.${weekDates[6].getDate()}.`;
    }

    weekDates.forEach((dObj, dIdx) => {
        const dateKey = window.formatDateKey(dObj);
        const day = window.getDayData(dateKey);
        const rec = day.recovery || { activities: [] };
        const isToday = (dateKey === todayKey);
        const shield = window.calculateRecoveryShield(dateKey);

        const sleepScore = (rec.sleepScore !== null && rec.sleepScore !== undefined) ? `${rec.sleepScore} pont` : '-';
        const recoveryScore = (rec.recoveryScore !== null && rec.recoveryScore !== undefined) ? `${rec.recoveryScore}%` : '-';

        let actsHtml = '';
        (rec.activities || []).forEach((act) => {
            actsHtml += `
                <div class="flex items-center justify-between p-2 mb-1.5 rounded-xl bg-purplebrand-50/80 dark:bg-purplebrand-950/60 border border-purplebrand-200 dark:border-purplebrand-800/50 text-[11px]">
                    <div class="truncate pr-1 cursor-pointer" onclick="openRecoveryActivityModal('${dateKey}', '${act.id}')">
                        <strong class="text-slate-900 dark:text-white truncate block">${act.customName || act.type}</strong>
                        <span class="text-[10px] text-purplebrand-600 dark:text-purplebrand-400 font-semibold">${act.duration || 'Recovery'}</span>
                    </div>
                    <button type="button" onclick="deleteRecoveryActivityDirect('${dateKey}', '${act.id}', event)" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer" title="Törlés">
                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                    </button>
                </div>
            `;
        });

        const card = document.createElement('div');
        card.className = `bg-white dark:bg-slate-900 border rounded-2xl p-3 flex flex-col justify-between shadow-sm ${isToday ? 'border-2 border-purplebrand-500 shadow-md' : 'border-slate-200 dark:border-slate-800'}`;

        card.innerHTML = `
            <div>
                <!-- Fejléc: Nap neve + Dátum + Napi index -->
                <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <span class="font-bold text-xs ${isToday ? 'text-purplebrand-600 dark:text-purplebrand-400' : 'text-slate-800 dark:text-slate-200'}">${currentDays[dIdx]}</span>
                        <span class="text-[10px] text-slate-400 ml-1">(${dObj.getDate()})</span>
                    </div>
                    <span class="text-xs font-black ${shield.statusTextColor}">${shield.total}%</span>
                </div>

                <!-- Sleep & Recovery Score Napi Kártyák -->
                <div class="grid grid-cols-2 gap-1.5 mb-2.5">
                    <div onclick="openRecoveryScoresModal('${dateKey}')" class="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-purplebrand-400 transition cursor-pointer text-center group">
                        <span class="text-[9px] text-slate-400 uppercase font-bold block flex items-center justify-center gap-1">
                            <i class="fa-solid fa-bed text-purplebrand-500"></i> Alvás
                        </span>
                        <strong class="text-xs font-black text-purplebrand-600 dark:text-purplebrand-400 mt-0.5 block">${sleepScore}</strong>
                    </div>

                    <div onclick="openRecoveryScoresModal('${dateKey}')" class="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 transition cursor-pointer text-center group">
                        <span class="text-[9px] text-slate-400 uppercase font-bold block flex items-center justify-center gap-1">
                            <i class="fa-solid fa-heart-pulse text-emerald-500"></i> Recovery
                        </span>
                        <strong class="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">${recoveryScore}</strong>
                    </div>
                </div>

                <!-- Elvégzett Recovery Aktivitások -->
                <div class="mb-2">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Aktivitások:</span>
                    <div>${actsHtml || '<div class="text-center py-3 text-slate-400 text-[11px] italic">Nincs rögzített aktivitás</div>'}</div>
                </div>
            </div>

            <!-- Gombok a nap alján -->
            <div class="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-1.5">
                <button type="button" onclick="openRecoveryScoresModal('${dateKey}')" class="py-1.5 bg-slate-100 dark:bg-slate-950 hover:bg-purplebrand-50 dark:hover:bg-purplebrand-950/60 text-slate-700 dark:text-slate-300 hover:text-purplebrand-600 dark:hover:text-purplebrand-400 rounded-xl text-[10px] font-bold border border-slate-200 dark:border-slate-800 transition cursor-pointer flex items-center justify-center gap-1">
                    <i class="fa-solid fa-sliders"></i> Pontok
                </button>
                <button type="button" onclick="openRecoveryActivityModal('${dateKey}')" class="py-1.5 bg-purplebrand-600 hover:bg-purplebrand-500 text-white rounded-xl text-[10px] font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1">
                    <i class="fa-solid fa-plus"></i> Aktivitás
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
};

// ==============================================================
// 4. RECOVERY AKTIVITÁSOK & PONTSZÁMOK KEZELŐJE
// ==============================================================
window.updateRecActMuscleBadges = function() {
    const container = document.getElementById('rec-act-muscle-badges');
    if (!container) return;
    container.innerHTML = '';

    window.MUSCLE_DEFINITIONS.forEach(def => {
        const isSelected = window.currentRecActMuscles.includes(def.key);
        const label = window.t(def.labelKey) || def.key;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => {
            const idx = window.currentRecActMuscles.indexOf(def.key);
            if (idx === -1) window.currentRecActMuscles.push(def.key);
            else window.currentRecActMuscles.splice(idx, 1);
            window.updateRecActMuscleBadges();
        };
        btn.className = isSelected
            ? "px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purplebrand-600 text-white shadow-xs cursor-pointer"
            : "px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 cursor-pointer";
        btn.textContent = label;
        container.appendChild(btn);
    });
};

window.openRecoveryActivityModal = function(dateKey = null, actId = null) {
    if (!dateKey) dateKey = window.getTodayKey();
    document.getElementById('rec-act-date-key').value = dateKey;
    document.getElementById('rec-act-id').value = actId || '';
    const day = window.getDayData(dateKey);
    const deleteBtn = document.getElementById('rec-act-delete-btn');

    if (actId) {
        const act = (day.recovery.activities || []).find(a => a.id === actId);
        if (act) {
            document.getElementById('recovery-activity-modal-title').textContent = `${act.customName || act.type} szerkesztése`;
            document.getElementById('rec-act-type').value = act.type || 'Nyújtás';
            document.getElementById('rec-act-custom-name').value = act.customName || '';
            document.getElementById('rec-act-duration').value = act.duration || '';
            document.getElementById('rec-act-routine').value = act.routine || '';
            window.currentRecActMuscles = Array.isArray(act.muscles) ? [...act.muscles] : [];
            deleteBtn.classList.remove('hidden');
        }
    } else {
        document.getElementById('recovery-activity-modal-title').textContent = window.t('recActivityTitle');
        document.getElementById('rec-act-type').value = 'Nyújtás';
        document.getElementById('rec-act-custom-name').value = '';
        document.getElementById('rec-act-duration').value = '';
        document.getElementById('rec-act-routine').value = '';
        window.currentRecActMuscles = [];
        deleteBtn.classList.add('hidden');
    }
    window.updateRecActMuscleBadges();
    document.getElementById('recovery-activity-modal').classList.remove('hidden');
};

window.saveRecoveryActivityForm = function(e) {
    e.preventDefault();
    const dateKey = document.getElementById('rec-act-date-key').value;
    const actId = document.getElementById('rec-act-id').value;
    const actData = {
        id: actId || 'ract-' + Date.now(),
        type: document.getElementById('rec-act-type').value,
        customName: document.getElementById('rec-act-custom-name').value.trim(),
        duration: document.getElementById('rec-act-duration').value.trim(),
        routine: document.getElementById('rec-act-routine').value.trim(),
        muscles: [...window.currentRecActMuscles]
    };

    const day = window.getDayData(dateKey);
    if (!day.recovery.activities) day.recovery.activities = [];

    if (actId) {
        const idx = day.recovery.activities.findIndex(a => a.id === actId);
        if (idx !== -1) day.recovery.activities[idx] = actData;
    } else {
        day.recovery.activities.push(actData);
    }

    window.saveData();
    window.renderRecoveryPlanner();
    window.closeModal('recovery-activity-modal');
    window.showToast('Recovery aktivitás rögzítve, izmok lazítva!', 'fa-spa', 'purplebrand');
};

window.deleteCurrentRecoveryActivity = function() {
    const dateKey = document.getElementById('rec-act-date-key').value;
    const actId = document.getElementById('rec-act-id').value;
    const day = window.getDayData(dateKey);
    day.recovery.activities = (day.recovery.activities || []).filter(a => a.id !== actId);

    window.saveData();
    window.renderRecoveryPlanner();
    window.closeModal('recovery-activity-modal');
    window.showToast('Aktivitás törölve!', 'fa-trash-can', 'red');
};

window.deleteRecoveryActivityDirect = function(dateKey, actId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const day = window.getDayData(dateKey);
    day.recovery.activities = (day.recovery.activities || []).filter(a => a.id !== actId);

    window.saveData();
    window.renderRecoveryPlanner();
    window.showToast('Aktivitás törölve!', 'fa-trash-can', 'red');
};

// Napi Recovery Pontszámok (Sleep Score & Recovery Score)
window.openRecoveryScoresModal = function(dateKey) {
    document.getElementById('rec-scores-date-key').value = dateKey;
    document.getElementById('recovery-scores-modal-title').textContent = `${window.t('recoveryScoresTitle')} (${dateKey})`;
    const day = window.getDayData(dateKey);
    const sleepVal = (day.recovery?.sleepScore !== null && day.recovery?.sleepScore !== undefined) ? day.recovery.sleepScore : 80;
    const recVal = (day.recovery?.recoveryScore !== null && day.recovery?.recoveryScore !== undefined) ? day.recovery.recoveryScore : 70;

    document.getElementById('rec-sleep-input').value = sleepVal;
    document.getElementById('rec-score-input').value = recVal;
    window.updateSleepScoreDisplay(sleepVal);
    window.updateRecoveryScoreDisplay(recVal);

    document.getElementById('recovery-scores-modal').classList.remove('hidden');
};

window.updateSleepScoreDisplay = function(val) {
    const b = document.getElementById('sleep-score-val-badge');
    if (b) b.textContent = `${val} pont`;
};

window.updateRecoveryScoreDisplay = function(val) {
    const b = document.getElementById('recovery-score-val-badge');
    if (b) b.textContent = `${val}%`;
};

window.saveRecoveryScoresForm = function(e) {
    e.preventDefault();
    const dateKey = document.getElementById('rec-scores-date-key').value;
    const day = window.getDayData(dateKey);
    if (!day.recovery) day.recovery = { activities: [] };

    day.recovery.sleepScore = Number(document.getElementById('rec-sleep-input').value);
    day.recovery.recoveryScore = Number(document.getElementById('rec-score-input').value);

    window.saveData();
    window.renderRecoveryPlanner();
    window.closeModal('recovery-scores-modal');
    window.showToast('Napi pontszámok mentve!', 'fa-bed', 'purplebrand');
};

window.clearDayScores = function() {
    const dateKey = document.getElementById('rec-scores-date-key').value;
    const day = window.getDayData(dateKey);
    if (day.recovery) {
        day.recovery.sleepScore = null;
        day.recovery.recoveryScore = null;
    }
    window.saveData();
    window.renderRecoveryPlanner();
    window.closeModal('recovery-scores-modal');
    window.showToast('Pontszámok törölve!', 'fa-trash', 'red');
};

// ==============================================================
// 5. RECOVERY GYAKORLATSOROK KÖNYVTÁRA & KATEGÓRIÁK
// ==============================================================
window.renderRecoveryRoutinesLibrary = function() {
    window.renderRecRoutineCategoryPills();

    const grid = document.getElementById('recovery-routines-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let list = window.recoveryRoutines || [];
    if (window.activeRecRoutineCategory !== 'all') {
        list = list.filter(r => r.categoryId === window.activeRecRoutineCategory);
    }

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-400 text-sm">
                <i class="fa-solid fa-spa text-4xl mb-3 text-slate-300 dark:text-slate-700 block"></i>
                Ebben a kategóriában még nincsenek rögzített recovery gyakorlatsorok.
            </div>
        `;
        return;
    }

    list.forEach(rout => {
        const cat = (window.recRoutineCategories || []).find(c => c.id === rout.categoryId);
        const catName = cat ? cat.name : 'Általános';

        let musclesHtml = '';
        if (rout.hasMuscles && rout.muscles && Array.isArray(rout.muscles) && rout.muscles.length > 0) {
            musclesHtml = '<div class="flex flex-wrap gap-1 mt-2">';
            rout.muscles.forEach(mKey => {
                const mDef = window.MUSCLE_DEFINITIONS.find(d => d.key === mKey);
                const mName = mDef ? (window.t(mDef.labelKey) || mKey) : mKey;
                musclesHtml += `<span class="px-2 py-0.5 rounded-md bg-purplebrand-50 dark:bg-purplebrand-950 border border-purplebrand-200 dark:border-purplebrand-900/50 text-[10px] font-bold text-purplebrand-700 dark:text-purplebrand-300">${mName}</span>`;
            });
            musclesHtml += '</div>';
        }

        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purplebrand-500/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition group";
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">${catName}</span>
                    <div class="flex items-center gap-1.5">
                        <button onclick="openRecoveryRoutineModal('${rout.id}')" class="text-slate-400 hover:text-purplebrand-500 p-1 cursor-pointer"><i class="fa-solid fa-pen text-xs"></i></button>
                        <button onclick="deleteRecoveryRoutineDirect('${rout.id}')" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer"><i class="fa-solid fa-trash text-xs"></i></button>
                    </div>
                </div>
                <h4 class="font-bold text-sm text-slate-900 dark:text-white mb-1">${rout.name}</h4>
                ${musclesHtml}
                <div class="mt-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto custom-scrollbar">
                    ${rout.desc}
                </div>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button onclick="applyRecoveryRoutineToToday('${rout.id}')" class="w-full py-2 bg-purplebrand-600 hover:bg-purplebrand-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow shadow-purplebrand-600/20 cursor-pointer">
                    <i class="fa-solid fa-play"></i> Indítás mai levezetésként
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
};

window.renderRecRoutineCategoryPills = function() {
    const container = document.getElementById('recovery-routine-category-pills');
    if (!container) return;
    container.innerHTML = '';

    const isAll = (window.activeRecRoutineCategory === 'all');
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.onclick = () => window.filterRecRoutineCategory('all');
    allBtn.className = isAll
        ? "px-3 py-1.5 rounded-xl text-xs font-bold transition bg-purplebrand-600 text-white shadow cursor-pointer"
        : "px-3 py-1.5 rounded-xl text-xs font-bold transition bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer";
    allBtn.textContent = window.t('filterAll');
    container.appendChild(allBtn);

    (window.recRoutineCategories || []).forEach(cat => {
        const isActive = (window.activeRecRoutineCategory === cat.id);
        const pill = document.createElement('div');
        pill.className = `flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${isActive ? 'bg-purplebrand-600 text-white border-purplebrand-600 shadow' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'}`;
        pill.innerHTML = `
            <span onclick="filterRecRoutineCategory('${cat.id}')" class="cursor-pointer">${cat.name}</span>
            <button type="button" onclick="deleteRecRoutineCategory('${cat.id}')" class="text-xs hover:text-red-400 ml-1 p-0.5 cursor-pointer" title="Kategória törlése"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(pill);
    });
};

window.filterRecRoutineCategory = function(catId) {
    window.activeRecRoutineCategory = catId;
    window.renderRecoveryRoutinesLibrary();
};

window.openRecoveryRoutineCategoryModal = function() {
    document.getElementById('rec-cat-name').value = '';
    document.getElementById('rec-routine-category-modal').classList.remove('hidden');
};

window.saveRecRoutineCategoryForm = function(e) {
    e.preventDefault();
    const name = document.getElementById('rec-cat-name').value.trim();
    if (!name) return;

    if (!window.recRoutineCategories) window.recRoutineCategories = [];
    window.recRoutineCategories.push({
        id: 'rec-cat-' + Date.now(),
        name: name
    });
    window.saveData();
    window.closeModal('rec-routine-category-modal');
    window.renderRecoveryRoutinesLibrary();
    window.showToast("Új recovery kategória létrehozva!", "fa-folder-plus", "purplebrand");
};

window.deleteRecRoutineCategory = function(catId) {
    window.customConfirm(window.t('confirmTitle'), "Biztosan törlöd ezt a recovery kategóriát?", () => {
        window.recRoutineCategories = (window.recRoutineCategories || []).filter(c => c.id !== catId);
        if (window.activeRecRoutineCategory === catId) window.activeRecRoutineCategory = 'all';
        window.saveData();
        window.renderRecoveryRoutinesLibrary();
        window.showToast("Kategória törölve", "fa-trash", "red");
    });
};

window.openRecoveryRoutineModal = function(routId = null) {
    const selectEl = document.getElementById('rec-routine-category');
    selectEl.innerHTML = '';
    (window.recRoutineCategories || []).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        selectEl.appendChild(opt);
    });

    document.getElementById('rec-routine-id').value = routId || '';
    const deleteBtn = document.getElementById('rec-routine-delete-btn');
    const hasMusclesToggle = document.getElementById('rec-routine-has-muscles');

    if (routId) {
        const rout = (window.recoveryRoutines || []).find(r => r.id === routId);
        if (rout) {
            document.getElementById('recovery-routine-modal-title').textContent = `${rout.name} szerkesztése`;
            document.getElementById('rec-routine-name').value = rout.name;
            document.getElementById('rec-routine-category').value = rout.categoryId || '';
            document.getElementById('rec-routine-desc').value = rout.desc || '';
            hasMusclesToggle.checked = !!rout.hasMuscles;
            window.currentRecRoutineMuscles = Array.isArray(rout.muscles) ? [...rout.muscles] : [];
            deleteBtn.classList.remove('hidden');
        }
    } else {
        document.getElementById('recovery-routine-modal-title').textContent = window.t('newRoutineBtn');
        document.getElementById('rec-routine-name').value = '';
        document.getElementById('rec-routine-desc').value = '';
        hasMusclesToggle.checked = false;
        window.currentRecRoutineMuscles = [];
        deleteBtn.classList.add('hidden');
    }

    window.toggleRecMuscleSection(hasMusclesToggle.checked);
    window.updateRecRoutineMuscleBadges();
    document.getElementById('recovery-routine-modal').classList.remove('hidden');
};

window.toggleRecMuscleSection = function(isChecked) {
    const wrapper = document.getElementById('rec-routine-muscles-wrapper');
    if (!wrapper) return;
    if (isChecked) {
        wrapper.classList.remove('hidden');
    } else {
        wrapper.classList.add('hidden');
        window.currentRecRoutineMuscles = [];
        window.updateRecRoutineMuscleBadges();
    }
};

window.toggleRecRoutineMuscle = function(mKey) {
    const idx = window.currentRecRoutineMuscles.indexOf(mKey);
    if (idx === -1) window.currentRecRoutineMuscles.push(mKey);
    else window.currentRecRoutineMuscles.splice(idx, 1);
    window.updateRecRoutineMuscleBadges();
};

window.updateRecRoutineMuscleBadges = function() {
    const container = document.getElementById('rec-routine-muscle-badges');
    if (!container) return;
    container.innerHTML = '';

    window.MUSCLE_DEFINITIONS.forEach(def => {
        const isSelected = window.currentRecRoutineMuscles.includes(def.key);
        const label = window.t(def.labelKey) || def.key;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => window.toggleRecRoutineMuscle(def.key);
        btn.className = isSelected
            ? "px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purplebrand-600 text-white shadow transition flex items-center gap-1.5 cursor-pointer"
            : "px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:border-purplebrand-400 transition flex items-center gap-1.5 cursor-pointer";
        
        btn.innerHTML = `<i class="fa-solid ${def.icon} text-[9px] ${isSelected ? 'text-white' : 'text-slate-400'}"></i> ${label}`;
        container.appendChild(btn);
    });
};

window.saveRecoveryRoutineForm = function(e) {
    e.preventDefault();
    const id = document.getElementById('rec-routine-id').value;
    const name = document.getElementById('rec-routine-name').value.trim();
    const categoryId = document.getElementById('rec-routine-category').value;
    const desc = document.getElementById('rec-routine-desc').value.trim();
    const hasMuscles = document.getElementById('rec-routine-has-muscles').checked;

    const routData = {
        id: id || 'rec-rout-' + Date.now(),
        categoryId: categoryId,
        name: name,
        desc: desc,
        hasMuscles: hasMuscles,
        muscles: hasMuscles ? [...window.currentRecRoutineMuscles] : []
    };

    if (!window.recoveryRoutines) window.recoveryRoutines = [];

    if (id) {
        const idx = window.recoveryRoutines.findIndex(r => r.id === id);
        if (idx !== -1) window.recoveryRoutines[idx] = routData;
    } else {
        window.recoveryRoutines.push(routData);
    }

    window.saveData();
    window.closeModal('recovery-routine-modal');
    window.renderRecoveryRoutinesLibrary();
    window.renderRecoveryPlanner();
    window.showToast("Recovery gyakorlatsor elmentve!", 'fa-spa', 'purplebrand');
};

window.deleteCurrentRecoveryRoutine = function() {
    const id = document.getElementById('rec-routine-id').value;
    window.deleteRecoveryRoutineDirect(id);
    window.closeModal('recovery-routine-modal');
};

window.deleteRecoveryRoutineDirect = function(routId) {
    window.customConfirm(window.t('confirmTitle'), "Biztosan törlöd ezt a recovery gyakorlatsort?", () => {
        window.recoveryRoutines = (window.recoveryRoutines || []).filter(r => r.id !== routId);
        window.saveData();
        window.renderRecoveryRoutinesLibrary();
        window.renderRecoveryPlanner();
        window.showToast("Gyakorlatsor törölve", "fa-trash", "red");
    });
};

window.applyRecoveryRoutineToToday = function(routId) {
    const rout = (window.recoveryRoutines || []).find(r => r.id === routId);
    if (!rout) return;

    if (typeof window.switchAppMode === 'function') window.switchAppMode('recovery');
    if (typeof window.switchRecoveryTab === 'function') window.switchRecoveryTab('planner');
    window.openRecoveryActivityModal(window.getTodayKey());

    document.getElementById('rec-act-custom-name').value = rout.name;
    document.getElementById('rec-act-routine').value = rout.desc;
    window.currentRecActMuscles = (rout.hasMuscles && Array.isArray(rout.muscles)) ? [...rout.muscles] : [];
    window.updateRecActMuscleBadges();
};
