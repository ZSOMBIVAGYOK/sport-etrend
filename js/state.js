// ==============================================================
// FitPlan Pro - Központi Állapotkezelő & Adatvédelem (js/state.js)
// ==============================================================

window.isAppReady = false;
window.currentUserId = null;

window.currentAppMode = 'diet';
window.currentWeekOffset = 0;
window.calCurrentYear = new Date().getFullYear();
window.calCurrentMonth = new Date().getMonth();

window.activeExerciseCategory = 'all';
window.activeProgramCategory = 'all';
window.activeRecRoutineCategory = 'all';
window.activeGearCategory = 'all';
window.activeDocFilter = 'all';

window.currentSelectedMuscles = [];
window.currentExerciseMuscles = [];
window.currentQuickExerciseMuscles = [];
window.currentRecRoutineMuscles = [];
window.currentRecActMuscles = [];
window.currentProgramBuilderItems = [];
window.currentRecipeIngredients = [];
window.currentScannedIngredient = null;
window.weightPickerCurrentVal = -1;
window.weightPickerTarget = null;
window.activePickerDateKey = null;
window.activePickerSlotIdx = null;

window.DEFAULT_MEALS = [
    { id: 'meal-1', name: 'Csirkemell jázmin rizzsel & brokkolival', image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=400&q=80', calories: 520, protein: 48, carbs: 62, fat: 8, ingredients: '200g csirkemell filé, 80g jázmin rizs, 150g párolt brokkoli, 5g olívaolaj', recipe: '1. A rizst kétszeres sós vízben készre főzzük.\n2. A csirkemellet fűszerezzük és serpenyőben kisütjük.\n3. A brokkolit 5 perc alatt roppanósra gőzöljük.' },
    { id: 'meal-2', name: 'Zabkása tejsavófehérjével & bogyós gyümölccsel', image: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?auto=format&fit=crop&w=400&q=80', calories: 410, protein: 34, carbs: 52, fat: 7, ingredients: '60g finomszemű zabpehely, 30g tejsavó fehérjepor, 80g áfonya/málna, fahéj', recipe: '1. A zabpelyhet forró vízzel vagy mandulatejjel felöntjük.\n2. Hagyjuk állni 3 percig, majd belekeverjük a fehérjeport.\n3. Friss bogyós gyümölccsel tálaljuk.' },
    { id: 'meal-3', name: 'Marhahátszín édesburgonyával', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80', calories: 630, protein: 52, carbs: 55, fat: 20, ingredients: '220g sovány marhahátszín, 250g sült édesburgonya, zöldsaláta', recipe: '1. Az édesburgonyát hasábokra vágva 200°C-on megsütjük.\n2. A steaket forró serpenyőben oldalanként 3-4 percig sütjük mediumra.' }
];

window.DEFAULT_EXERCISE_CATEGORIES = [
    { id: 'cat-mell', name: 'Mellizom' }, { id: 'cat-hat', name: 'Hátizom' }, { id: 'cat-lab', name: 'Láb & Fenék' }, { id: 'cat-vall', name: 'Vállizom' }, { id: 'cat-kar', name: 'Karok' }, { id: 'cat-torzs', name: 'Törzs & Has' }
];

window.DEFAULT_WORKOUT_EXERCISES = [
    { id: 'ex-1', categoryId: 'cat-mell', name: 'Fekvenyomás rúddal', desc: 'Vízszintes padon, kontrollált negatív szakasz', muscles: ['chest', 'triceps', 'shoulders'] },
    { id: 'ex-2', categoryId: 'cat-hat', name: 'Húzódzkodás széles fogással', desc: 'Teljes mozgástartomány, lapockazárással', muscles: ['back', 'biceps', 'forearms'] },
    { id: 'ex-3', categoryId: 'cat-lab', name: 'Guggolás rúddal', desc: 'Párhuzamos szint alá süllyedve, feszes törzzsel', muscles: ['quads', 'glutes', 'lower_back'] },
    { id: 'ex-4', categoryId: 'cat-lab', name: 'Román felhúzás', desc: 'Combhajlító és farizom fókusz, egyenes háttal', muscles: ['hamstrings', 'glutes', 'lower_back'] },
    { id: 'ex-5', categoryId: 'cat-vall', name: 'Vállból nyomás kézisúlyzóval', desc: 'Ülve vagy állva, kontrollált mozdulattal', muscles: ['shoulders', 'triceps'] }
];

window.DEFAULT_PROGRAM_CATEGORIES = [ { id: 'pcat-hyper', name: 'Hipertrófia (Izomtömeg)' }, { id: 'pcat-power', name: 'Erőemelés (Strength)' }, { id: 'pcat-cardio', name: 'Állóképesség' } ];

window.DEFAULT_WORKOUT_PROGRAMS = [{
    id: 'prog-1', categoryId: 'pcat-hyper', name: 'Felsőtest Hipertrófia A',
    items: [ { exerciseId: 'ex-1', name: 'Fekvenyomás rúddal', reps: 8, weight: 80, weightType: 'kg', muscles: ['chest', 'triceps', 'shoulders'] }, { exerciseId: 'ex-2', name: 'Húzódzkodás széles fogással', reps: 10, weight: -1, weightType: 'bw', muscles: ['back', 'biceps', 'forearms'] }, { exerciseId: 'ex-5', name: 'Vállból nyomás kézisúlyzóval', reps: 12, weight: 24, weightType: 'kg', muscles: ['shoulders', 'triceps'] } ],
    routine: '1. Fekvenyomás rúddal (8 × 80kg)\n2. Húzódzkodás széles fogással (10 × BW)\n3. Vállból nyomás kézisúlyzóval (12 × 24kg)', muscles: ['chest', 'triceps', 'shoulders', 'back', 'biceps', 'forearms']
}];

window.DEFAULT_REC_ROUTINE_CATEGORIES = [ { id: 'rcat-stretch', name: 'Nyújtás & Mobilitás' }, { id: 'rcat-smr', name: 'SMR Hengerezés' }, { id: 'rcat-hydro', name: 'Vízterápia & Szauna' } ];

window.DEFAULT_RECOVERY_ROUTINES = [
    { id: 'rrout-1', categoryId: 'rcat-stretch', name: 'Alsótest Mélynyújtó Protokoll', desc: '1. Galamb póz (Pigeon pose): 2 perc oldalanként\n2. Combhajlító nyújtás hevederrel: 90 mp oldalanként\n3. Békapóz (csípőnyitás): 2 perc', hasMuscles: true, muscles: ['glutes', 'hamstrings', 'quads'] },
    { id: 'rrout-2', categoryId: 'rcat-smr', name: 'Teljes Test SMR Hengerezés', desc: '1. Vádli és combhajlító lassan gördítve: 2-2 perc\n2. Négyfejű combizom & IT-szalag: 2 perc\n3. Széles hátizom & lapocka környéke: 3 perc', hasMuscles: true, muscles: ['calves', 'hamstrings', 'quads', 'back'] }
];

window.DEFAULT_GEAR_CATEGORIES = [ { id: 'gcat-cipo', name: 'Futócipők' }, { id: 'gcat-kerekpar', name: 'Kerékpár & Alkatrész' }, { id: 'gcat-fitness', name: 'Fitnesz Eszközök' } ];

window.DEFAULT_GEAR_ITEMS = [
    { id: 'gear-1', categoryId: 'gcat-cipo', name: 'Asics Novablast 4 (Országúti cipő)', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80', desc: 'Elsődleges aszfaltos edzőcipő. Élettartam: 800 km vagy 90 napos átvizsgálás.', intervalDays: 90, lastMaintained: Date.now() - (1000 * 60 * 60 * 24 * 15) },
    { id: 'gear-2', categoryId: 'gcat-kerekpar', name: 'Országúti Kerékpár Lánc & Hajtás', image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=400&q=80', desc: 'Lánctisztítás, zsírtalanítás és waxolás 30 naponta.', intervalDays: 30, lastMaintained: Date.now() - (1000 * 60 * 60 * 24 * 28) }
];

window.profiles = [];
window.currentProfileId = null;
window.profileData = {};

window.meals = [];
window.documents = [];
window.daysStore = {};
window.exerciseCategories = [];
window.workoutExercises = [];
window.programCategories = [];
window.workoutPrograms = [];
window.recRoutineCategories = [];
window.recoveryRoutines = [];
window.gearCategories = [];
window.gearItems = [];
window.personalRecords = []; // ÚJ MODUL MEMÓRIA

window.getDayData = function(dateKey) {
    if (!window.daysStore) window.daysStore = {};
    if (!window.daysStore[dateKey]) { window.daysStore[dateKey] = { meals: [null, null, null, null, null, null], workouts: [], supplements: [], cheats: [], hydration: [], recovery: { sleepScore: null, recoveryScore: null, activities: [] } }; }
    const day = window.daysStore[dateKey];
    if (!Array.isArray(day.meals) || day.meals.length < 6) day.meals = [null, null, null, null, null, null];
    if (!Array.isArray(day.workouts)) day.workouts = [];
    if (!Array.isArray(day.supplements)) day.supplements = [];
    if (!Array.isArray(day.cheats)) day.cheats = [];
    if (!Array.isArray(day.hydration)) day.hydration = [];
    if (!day.recovery || typeof day.recovery !== 'object') day.recovery = { sleepScore: null, recoveryScore: null, activities: [] };
    if (!Array.isArray(day.recovery.activities)) day.recovery.activities = [];
    return day;
};

window.formatDateKey = function(d) {
    const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`;
};
window.getTodayKey = () => window.formatDateKey(new Date());

window.getWeekDates = function(offset = 0) {
    const curr = new Date(); const day = curr.getDay(); const diff = curr.getDate() - day + (day === 0 ? -6 : 1) + (offset * 7);
    const monday = new Date(curr.setDate(diff)); const week = [];
    for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(monday.getDate() + i); week.push(d); } return week;
};

window.changeWeek = function(delta) { window.currentWeekOffset += delta; if (typeof window.renderAllActiveViews === 'function') window.renderAllActiveViews(); };
window.goToCurrentWeek = function() { window.currentWeekOffset = 0; if (typeof window.renderAllActiveViews === 'function') window.renderAllActiveViews(); };
window.jumpToWeekOfDate = function(dateKey) {
    const target = new Date(dateKey); const now = new Date(); const dayNow = now.getDay();
    const mondayNow = new Date(now.setDate(now.getDate() - dayNow + (dayNow === 0 ? -6 : 1)));
    const diffTime = target.getTime() - mondayNow.getTime(); const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    window.currentWeekOffset = diffWeeks;
    if (typeof window.closeModal === 'function') window.closeModal('calendar-day-modal');
    if (typeof window.renderAllActiveViews === 'function') window.renderAllActiveViews();
};

window.initTheme = function() { window.setAppTheme(localStorage.getItem('fitplan_theme') || 'dark'); };
window.setAppTheme = function(theme) {
    const html = document.documentElement; const isDark = (theme === 'dark');
    html.classList.toggle('dark', isDark); localStorage.setItem('fitplan_theme', theme);
    const lightBtn = document.getElementById('theme-light-btn'); const darkBtn = document.getElementById('theme-dark-btn');
    if (lightBtn && darkBtn) {
        if (isDark) {
            darkBtn.className = "py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-slate-800 text-white shadow cursor-pointer";
            lightBtn.className = "py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer";
        } else {
            lightBtn.className = "py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-white text-slate-950 shadow cursor-pointer";
            darkBtn.className = "py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer";
        }
    }
};

window.updateProfileUI = function() {
    const prof = window.profiles.find(p => p.id === window.currentProfileId); if (!prof) return;
    const nameEl = document.getElementById('active-profile-name');
    if (nameEl) { nameEl.textContent = prof.name; nameEl.classList.remove('hidden'); }
    const imgEl = document.getElementById('active-profile-img'); const iconEl = document.getElementById('active-profile-icon');
    if (imgEl && iconEl) {
        if (prof.image) { imgEl.src = prof.image; imgEl.classList.remove('hidden'); iconEl.classList.add('hidden'); } 
        else { imgEl.classList.add('hidden'); iconEl.classList.remove('hidden'); }
    }
};

window.switchProfile = function(id, skipSave = false) {
    if (!window.profiles.some(p => p.id === id)) { if (window.profiles.length > 0) id = window.profiles[0].id; else return; }
    window.currentProfileId = id; const dat = window.profileData[id] || {};

    window.meals = dat.meals || [...window.DEFAULT_MEALS];
    window.documents = dat.documents || [];
    window.daysStore = dat.days || {};
    window.exerciseCategories = dat.exerciseCategories || [...window.DEFAULT_EXERCISE_CATEGORIES];
    window.workoutExercises = dat.workoutExercises || [...window.DEFAULT_WORKOUT_EXERCISES];
    window.programCategories = dat.programCategories || [...window.DEFAULT_PROGRAM_CATEGORIES];
    window.workoutPrograms = dat.workoutPrograms || [...window.DEFAULT_WORKOUT_PROGRAMS];
    window.recRoutineCategories = dat.recRoutineCategories || [...window.DEFAULT_REC_ROUTINE_CATEGORIES];
    window.recoveryRoutines = dat.recoveryRoutines || [...window.DEFAULT_RECOVERY_ROUTINES];
    window.gearCategories = dat.gearCategories || [...window.DEFAULT_GEAR_CATEGORIES];
    window.gearItems = dat.gearItems || [...window.DEFAULT_GEAR_ITEMS];
