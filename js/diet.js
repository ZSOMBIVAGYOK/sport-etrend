// ==============================================================
// FitPlan Pro - Étrend, Kiegészítők, Bűnözés & Víz (js/diet.js)
// ==============================================================

// ==============================================================
// 1. KIEGÉSZÍTŐK (SUPPLEMENTS) MOTORJA
// ==============================================================
window.openSupplementModal = function(dateKey) {
    document.getElementById('supp-date-key').value = dateKey;
    document.getElementById('supp-name').value = '';
    document.getElementById('supp-time').value = '';
    document.getElementById('supplement-modal').classList.remove('hidden');
};

window.saveSupplementForm = function(e) {
    e.preventDefault();
    const dateKey = document.getElementById('supp-date-key').value;
    const name = document.getElementById('supp-name').value.trim();
    const time = document.getElementById('supp-time').value.trim();
    if (!name) return;

    const day = window.getDayData(dateKey);
    if (!day.supplements) day.supplements = [];
    day.supplements.push({
        id: 'supp-' + Date.now(),
        name: name,
        time: time,
        taken: false
    });

    window.saveData();
    window.renderPlanner();
    window.closeModal('supplement-modal');
    window.showToast(`${name} hozzáadva a kiegészítőkhöz!`, 'fa-pills', 'purplebrand');
};

window.toggleSupplementCheck = function(dateKey, idx) {
    const day = window.getDayData(dateKey);
    if (day.supplements && day.supplements[idx]) {
        day.supplements[idx].taken = !day.supplements[idx].taken;
        window.saveData();
        window.renderPlanner();
    }
};

// stopPropagation megakadályozza a checkbox felvillanását/átbillenését törléskor
window.deleteSupplementItem = function(dateKey, idx, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const day = window.getDayData(dateKey);
    if (day.supplements && day.supplements[idx]) {
        const deletedName = day.supplements[idx].name;
        day.supplements.splice(idx, 1);
        window.saveData();
        window.renderPlanner();
        window.showToast(`${deletedName} törölve!`, 'fa-trash', 'red');
    }
};

// ==============================================================
// 2. BŰNÖZÉS (CHEAT MEAL) - KÉTIRÁNYÚ CSÚSZKA & SCANNER
// ==============================================================
window.html5QrCodeInstance = null;

window.openCheatModal = function(dateKey) {
    document.getElementById('cheat-date-key').value = dateKey;
    document.getElementById('cheat-name').value = '';
    document.getElementById('cheat-amount').value = 100;
    document.getElementById('cheat-amount-slider').value = 100;
    document.getElementById('cheat-calories').value = '';
    document.getElementById('cheat-protein').value = '';
    document.getElementById('cheat-carbs').value = '';
    document.getElementById('cheat-fat').value = '';
    document.getElementById('cheat-barcode-input').value = '';
    document.getElementById('cheat-100g-cal').value = 0;
    document.getElementById('cheat-100g-pro').value = 0;
    document.getElementById('cheat-100g-car').value = 0;
    document.getElementById('cheat-100g-fat').value = 0;
    document.getElementById('cheat-product-preview').classList.add('hidden');
    document.getElementById('cheat-lookup-loading').classList.add('hidden');
    window.stopBarcodeScanner();
    window.renderCheatDayLogsList(dateKey);
    document.getElementById('cheat-modal').classList.remove('hidden');
};

window.closeCheatModal = function() {
    window.stopBarcodeScanner();
    window.closeModal('cheat-modal');
};

// Kétirányú szinkron: beviteli mezőből a csúszkába
window.syncCheatSliderWithInput = function(val) {
    let num = Number(val);
    if (isNaN(num)) num = 100;
    if (num < 10) num = 10;
    if (num > 1000) num = 1000;
    const slider = document.getElementById('cheat-amount-slider');
    if (slider) slider.value = num;
    window.recalcCheatMacros();
};

// Kétirányú szinkron: csúszkából a beviteli mezőbe
window.syncCheatInputWithSlider = function(val) {
    const input = document.getElementById('cheat-amount');
    if (input) input.value = val;
    window.recalcCheatMacros();
};

window.recalcCheatMacros = function() {
    const amount = Number(document.getElementById('cheat-amount').value) || 100;
    const k100 = Number(document.getElementById('cheat-100g-cal').value);
    const p100 = Number(document.getElementById('cheat-100g-pro').value);
    const c100 = Number(document.getElementById('cheat-100g-car').value);
    const f100 = Number(document.getElementById('cheat-100g-fat').value);

    if (k100 > 0 || p100 > 0 || c100 > 0 || f100 > 0) {
        const ratio = amount / 100;
        document.getElementById('cheat-calories').value = Math.round(k100 * ratio);
        document.getElementById('cheat-protein').value = Math.round(p100 * ratio * 10) / 10;
        document.getElementById('cheat-carbs').value = Math.round(c100 * ratio * 10) / 10;
        document.getElementById('cheat-fat').value = Math.round(f100 * ratio * 10) / 10;
    }
};

window.startBarcodeScanner = function() {
    const container = document.getElementById('cheat-scanner-container');
    container.classList.remove('hidden');

    if (!window.html5QrCodeInstance) {
        window.html5QrCodeInstance = new Html5Qrcode("barcode-reader");
    }

    const config = { fps: 10, qrbox: { width: 250, height: 160 } };

    window.html5QrCodeInstance.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            window.stopBarcodeScanner();
            document.getElementById('cheat-barcode-input').value = decodedText;
            window.fetchProductByBarcode(decodedText);
        },
        () => {}
    ).catch(err => {
        console.warn("Kamera hiba:", err);
        window.showToast("Nem sikerült elérni a kamerát. Írd be a kódot kézzel!", "fa-circle-exclamation", "red");
        container.classList.add('hidden');
    });
};

window.stopBarcodeScanner = function() {
    const container = document.getElementById('cheat-scanner-container');
    if (container) container.classList.add('hidden');

    if (window.html5QrCodeInstance && window.html5QrCodeInstance.isScanning) {
        window.html5QrCodeInstance.stop().then(() => {
            window.html5QrCodeInstance.clear();
        }).catch(err => console.warn("Scanner leállítási hiba:", err));
    }
};

window.lookupBarcodeManual = function() {
    const code = document.getElementById('cheat-barcode-input').value.trim();
    if (!code) {
        window.showToast("Kérlek írd be a termék vonalkódját!", "fa-barcode", "amber");
        return;
    }
    window.fetchProductByBarcode(code);
};

window.fetchProductByBarcode = async function(barcode) {
    const loadingEl = document.getElementById('cheat-lookup-loading');
    loadingEl.classList.remove('hidden');

    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
            const prod = data.product;
            const prodName = prod.product_name_hu || prod.product_name || prod.generic_name || "Ismeretlen termék";
            const imgUrl = prod.image_front_url || prod.image_url || "";
            const nuts = prod.nutriments || {};

            const kcal100g = Math.round(nuts['energy-kcal_100g'] || nuts['energy-kcal'] || (nuts['energy_100g'] ? nuts['energy_100g'] / 4.184 : 0));
            const pro100g = Number(nuts.proteins_100g || nuts.proteins || 0);
            const car100g = Number(nuts.carbohydrates_100g || nuts.carbohydrates || 0);
            const fat100g = Number(nuts.fat_100g || nuts.fat || 0);

            document.getElementById('cheat-name').value = prodName;
            document.getElementById('cheat-100g-cal').value = kcal100g;
            document.getElementById('cheat-100g-pro').value = pro100g;
            document.getElementById('cheat-100g-car').value = car100g;
            document.getElementById('cheat-100g-fat').value = fat100g;

            const prevCard = document.getElementById('cheat-product-preview');
            const prevImg = document.getElementById('cheat-preview-img');
            const prevTitle = document.getElementById('cheat-preview-title');
            const prevMacros = document.getElementById('cheat-preview-macros-100g');

            prevTitle.textContent = prodName;
            prevMacros.textContent = `100g: ${kcal100g} kcal | P: ${pro100g}g | C: ${car100g}g | F: ${fat100g}g`;

            if (imgUrl) {
                prevImg.src = imgUrl;
                prevImg.classList.remove('hidden');
            } else {
                prevImg.classList.add('hidden');
            }
            prevCard.classList.remove('hidden');

            window.recalcCheatMacros();
            window.showToast(`Termék beolvasva: ${prodName}`, 'fa-circle-check', 'amber');
        } else {
            window.showToast("Nem található az adatbázisban. Add meg kézzel!", "fa-circle-exclamation", "amber");
            document.getElementById('cheat-name').focus();
        }
    } catch (err) {
        console.error("OpenFoodFacts Hiba:", err);
        window.showToast("Hiba a lekérdezés során. Töltsd ki kézzel!", "fa-circle-exclamation", "red");
    } finally {
        loadingEl.classList.add('hidden');
    }
};

window.renderCheatDayLogsList = function(dateKey) {
    const listEl = document.getElementById('cheat-day-logs-list');
    const totalBadge = document.getElementById('cheat-today-total-badge');
    if (!listEl) return;
    listEl.innerHTML = '';

    const day = window.getDayData(dateKey);
    const cheats = day.cheats || [];
    const totalKcal = cheats.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);

    if (totalBadge) {
        totalBadge.textContent = `${cheats.length} tétel (+${totalKcal} kcal)`;
    }

    if (cheats.length === 0) {
        listEl.innerHTML = `<div class="text-[11px] text-slate-500 italic py-2 text-center">Még nincs rögzített tétel mára.</div>`;
        return;
    }

    cheats.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = "flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-amber-300 dark:border-amber-900/40 text-[11px]";
        row.innerHTML = `
            <div class="flex items-center gap-2 overflow-hidden">
                <span class="text-amber-500 dark:text-amber-400 flex-shrink-0"><i class="fa-solid fa-cookie-bite"></i></span>
                <strong class="text-slate-900 dark:text-white truncate">${item.name}</strong>
                <span class="text-slate-500 dark:text-slate-400 whitespace-nowrap">(${item.amount}g)</span>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <span class="text-amber-600 dark:text-amber-400 font-bold">+${item.calories} kcal</span>
                <button type="button" onclick="deleteCheatItem('${dateKey}', ${idx})" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer"><i class="fa-solid fa-trash-can text-[10px]"></i></button>
            </div>
        `;
        listEl.appendChild(row);
    });
};

window.saveCheatForm = function(e) {
    e.preventDefault();
    const dateKey = document.getElementById('cheat-date-key').value;
    const name = document.getElementById('cheat-name').value.trim();
    const amount = Number(document.getElementById('cheat-amount').value) || 100;
    const calories = Number(document.getElementById('cheat-calories').value) || 0;
    const protein = Number(document.getElementById('cheat-protein').value) || 0;
    const carbs = Number(document.getElementById('cheat-carbs').value) || 0;
    const fat = Number(document.getElementById('cheat-fat').value) || 0;

    const day = window.getDayData(dateKey);
    if (!day.cheats) day.cheats = [];
    day.cheats.push({
        id: 'cheat-' + Date.now(),
        name: name,
        amount: amount,
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        time: new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
    });

    window.saveData();
    window.renderPlanner();
    window.renderCheatDayLogsList(dateKey);
    window.showToast(`Bűnözés mentve: ${name} (+${calories} kcal)!`, 'fa-cookie-bite', 'amber');

    document.getElementById('cheat-name').value = '';
    document.getElementById('cheat-calories').value = '';
    document.getElementById('cheat-protein').value = '';
    document.getElementById('cheat-carbs').value = '';
    document.getElementById('cheat-fat').value = '';
    document.getElementById('cheat-product-preview').classList.add('hidden');
};

window.deleteCheatItem = function(dateKey, idx) {
    const day = window.getDayData(dateKey);
    if (day.cheats) {
        day.cheats.splice(idx, 1);
        window.saveData();
        window.renderPlanner();
        window.renderCheatDayLogsList(dateKey);
    }
};

// ==============================================================
// 3. HIDRATÁCIÓ & IZZADÁS MOTORJA (KÉTIRÁNYÚ SZINKRONNAL)
// ==============================================================
window.HYDRATION_FACTORS = {
    "Izotóniás ital": 1.05,
    "Víz": 1.00,
    "Meleg tea": 0.90,
    "Gyümölcslé 100%": 0.85,
    "Gyümölcslé": 0.80,
    "Fehérje": 0.80,
    "Szörp": 0.75,
    "Kávé": 0.70,
    "Cukros innivaló": 0.60
};

// Kétirányú szinkron: számmezőből a csúszkába
window.syncHydroSliderWithInput = function(val) {
    let num = Number(val);
    if (isNaN(num)) num = 300;
    if (num < 50) num = 50;
    if (num > 2500) num = 2500;
    const slider = document.getElementById('hydro-amount-slider');
    if (slider) slider.value = num;
    window.updateHydrationPreview();
};

// Kétirányú szinkron: csúszkából a számmezőbe
window.syncHydroInputWithSlider = function(val) {
    const input = document.getElementById('hydro-amount-input');
    if (input) input.value = val;
    window.updateHydrationPreview();
};

window.getDayEffectiveHydration = function(dateKey) {
    const day = window.getDayData(dateKey);
    const logs = day.hydration || [];
    return logs.reduce((sum, item) => sum + (Number(item.effectiveAmount) || 0), 0);
};

window.getRecommendedWaterIntake = function(dateKey = null) {
    const prof = window.profiles.find(p => p.id === window.currentProfileId);
    const weight = (prof && prof.weight) ? Number(prof.weight) : 75;
    const baseTarget = Math.round(weight * 35);

    if (!dateKey) dateKey = window.getTodayKey();
    const day = window.getDayData(dateKey);
    const workouts = day.workouts || [];
    
    const totalSweat = workouts.reduce((sum, w) => sum + (Number(w.sweatLoss) || 0), 0);
    return baseTarget + totalSweat;
};

window.getDaySweatLossTotal = function(dateKey) {
    const day = window.getDayData(dateKey);
    const workouts = day.workouts || [];
    return workouts.reduce((sum, w) => sum + (Number(w.sweatLoss) || 0), 0);
};

window.openHydrationModal = function(dateKey) {
    document.getElementById('hydro-date-key').value = dateKey;
    document.getElementById('hydration-modal-title').innerHTML = `<i class="fa-solid fa-glass-water text-cyan-600 dark:text-cyan-400"></i> ${window.t('hydroModalTitle')} (${dateKey})`;
    document.getElementById('hydro-amount-slider').value = 300;
    document.getElementById('hydro-amount-input').value = 300;
    document.getElementById('hydro-type').value = 'Víz';

    const sweatBanner = document.getElementById('hydro-sweat-banner');
    const sweatVal = document.getElementById('hydro-sweat-val');
    const sweatDesc = document.getElementById('hydro-sweat-desc');
    const daySweat = window.getDaySweatLossTotal(dateKey);

    if (sweatBanner && sweatVal) {
        if (daySweat > 0) {
            sweatBanner.classList.remove('hidden');
            sweatVal.textContent = `+${daySweat} ml`;
            if (sweatDesc) sweatDesc.textContent = `Garmin becsült izzadás! A mai cél: ${window.getRecommendedWaterIntake(dateKey)} ml`;
        } else {
            sweatBanner.classList.add('hidden');
        }
    }

    window.updateHydrationPreview();
    window.renderHydrationDayLogsList(dateKey);
    document.getElementById('hydration-modal').classList.remove('hidden');
};

window.updateHydrationPreview = function() {
    const type = document.getElementById('hydro-type').value;
    const amount = Number(document.getElementById('hydro-amount-slider').value) || 300;
    const factor = window.HYDRATION_FACTORS[type] || 1.00;
    const effective = Math.round(amount * factor);

    const inputField = document.getElementById('hydro-amount-input');
    if (inputField && Number(inputField.value) !== amount) {
        inputField.value = amount;
    }

    document.getElementById('hydro-calc-result').innerHTML = `
        ${effective} ml <span class="text-xs text-cyan-600 dark:text-cyan-300 font-normal">(${amount} ml × ${factor.toFixed(2)})</span>
    `;
};

window.renderHydrationDayLogsList = function(dateKey) {
    const listEl = document.getElementById('hydro-day-logs-list');
    const totalBadge = document.getElementById('hydro-today-total-badge');
    if (!listEl) return;
    listEl.innerHTML = '';

    const day = window.getDayData(dateKey);
    const logs = day.hydration || [];
    const totalEffective = window.getDayEffectiveHydration(dateKey);
    const goal = window.getRecommendedWaterIntake(dateKey);

    if (totalBadge) {
        totalBadge.textContent = `${totalEffective} / ${goal} ml (${Math.round((totalEffective/goal)*100)}%)`;
    }

    if (logs.length === 0) {
        listEl.innerHTML = `<div class="text-[11px] text-slate-500 italic py-2 text-center">${window.t('todayLoggedDrinks')} -</div>`;
        return;
    }

    logs.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = "flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]";
        row.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-cyan-600 dark:text-cyan-400"><i class="fa-solid fa-droplet text-[10px]"></i></span>
                <strong class="text-slate-900 dark:text-white">${item.type}</strong>
                <span class="text-slate-500 dark:text-slate-400">${item.amount} ml</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-cyan-600 dark:text-cyan-300 font-bold">+${item.effectiveAmount} ml</span>
                <button type="button" onclick="deleteHydrationItem('${dateKey}', ${idx})" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer"><i class="fa-solid fa-trash-can text-[10px]"></i></button>
            </div>
        `;
        listEl.appendChild(row);
    });
};

window.saveHydrationForm = function(e) {
    e.preventDefault();
    const dateKey = document.getElementById('hydro-date-key').value;
    const type = document.getElementById('hydro-type').value;
    const amount = Number(document.getElementById('hydro-amount-slider').value) || 300;
    const factor = window.HYDRATION_FACTORS[type] || 1.00;
    const effectiveAmount = Math.round(amount * factor);

    const day = window.getDayData(dateKey);
    if (!day.hydration) day.hydration = [];
    day.hydration.push({
        id: 'hydro-' + Date.now(),
        type: type,
        amount: amount,
        factor: factor,
        effectiveAmount: effectiveAmount,
        time: new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
    });

    window.saveData();
    window.renderPlanner();
    if (typeof window.renderTodayShieldBanner === 'function') window.renderTodayShieldBanner();
    window.renderHydrationDayLogsList(dateKey);
    window.showToast(`${effectiveAmount} ml hidratáció rögzítve!`, 'fa-glass-water', 'bluebrand');
};

window.deleteHydrationItem = function(dateKey, idx) {
    const day = window.getDayData(dateKey);
    if (day.hydration) {
        day.hydration.splice(idx, 1);
        window.saveData();
        window.renderPlanner();
        if (typeof window.renderTodayShieldBanner === 'function') window.renderTodayShieldBanner();
        window.renderHydrationDayLogsList(dateKey);
    }
};

// ==============================================================
// 4. RECEPTÉPÍTŐ & ÉTELKÖNYVTÁR (VONALKÓDOS TÁPANYAGOKKAL)
// ==============================================================
window.recipeHtml5QrCodeInstance = null;

window.openAddMealModal = function(mealId = null) {
    window.currentRecipeIngredients = [];
    window.currentScannedIngredient = null;
    document.getElementById('recipe-ing-staging').classList.add('hidden');
    document.getElementById('add-scanned-ing-btn').disabled = true;
    document.getElementById('recipe-barcode-input').value = '';
    document.getElementById('recipe-ingredient-amount').value = 100;
    window.stopRecipeBarcodeScanner();

    if (mealId) {
        const meal = window.meals.find(m => m.id === mealId);
        document.getElementById('meal-form-title').textContent = window.t('mealFormTitle');
        document.getElementById('meal-id').value = meal.id;
        document.getElementById('meal-name').value = meal.name;
        document.getElementById('meal-image').value = meal.image || '';
        document.getElementById('meal-calories').value = meal.calories;
        document.getElementById('meal-protein').value = meal.protein;
        document.getElementById('meal-carbs').value = meal.carbs;
        document.getElementById('meal-fat').value = meal.fat;
        document.getElementById('meal-ingredients').value = meal.ingredients || '';
        document.getElementById('meal-recipe').value = meal.recipe || '';
        if (meal.barcodeIngredients && Array.isArray(meal.barcodeIngredients)) {
            window.currentRecipeIngredients = [...meal.barcodeIngredients];
        }
    } else {
        document.getElementById('meal-form-title').textContent = window.t('newMealBtn');
        document.getElementById('meal-id').value = '';
        document.getElementById('meal-name').value = '';
        document.getElementById('meal-image').value = '';
        document.getElementById('meal-calories').value = '';
        document.getElementById('meal-protein').value = '';
        document.getElementById('meal-carbs').value = '';
        document.getElementById('meal-fat').value = '';
        document.getElementById('meal-ingredients').value = '';
        document.getElementById('meal-recipe').value = '';
    }
    window.renderRecipeIngredientsChips();
    document.getElementById('add-meal-modal').classList.remove('hidden');
};

window.closeAddMealModal = function() {
    window.stopRecipeBarcodeScanner();
    window.closeModal('add-meal-modal');
};

window.toggleRecipeBarcodeScanner = function() {
    const container = document.getElementById('recipe-scanner-container');
    const label = document.getElementById('recipe-scanner-btn-label');

    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        label.textContent = "Kamera Leállítása";
        window.startRecipeBarcodeScanner();
    } else {
        window.stopRecipeBarcodeScanner();
    }
};

window.startRecipeBarcodeScanner = function() {
    if (!window.recipeHtml5QrCodeInstance) {
        window.recipeHtml5QrCodeInstance = new Html5Qrcode("recipe-barcode-reader");
    }
    const config = { fps: 10, qrbox: { width: 250, height: 160 } };
    window.recipeHtml5QrCodeInstance.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            window.stopRecipeBarcodeScanner();
            document.getElementById('recipe-barcode-input').value = decodedText;
            window.fetchRecipeIngredientByBarcode(decodedText);
        },
        () => {}
    ).catch(err => {
        console.warn("Recept szkenner hiba:", err);
        window.showToast("Nem sikerült elérni a kamerát. Írd be a kódot kézzel!", "fa-circle-exclamation", "red");
        window.stopRecipeBarcodeScanner();
    });
};

window.stopRecipeBarcodeScanner = function() {
    const container = document.getElementById('recipe-scanner-container');
    const label = document.getElementById('recipe-scanner-btn-label');
    if (container) container.classList.add('hidden');
    if (label) label.textContent = "Kamera Indítása";

    if (window.recipeHtml5QrCodeInstance && window.recipeHtml5QrCodeInstance.isScanning) {
        window.recipeHtml5QrCodeInstance.stop().then(() => {
            window.recipeHtml5QrCodeInstance.clear();
        }).catch(err => console.warn(err));
    }
};

window.lookupRecipeBarcodeManual = function() {
    const code = document.getElementById('recipe-barcode-input').value.trim();
    if (!code) {
        window.showToast("Kérlek írd be a hozzávaló vonalkódját!", "fa-barcode", "amber");
        return;
    }
    window.fetchRecipeIngredientByBarcode(code);
};

window.fetchRecipeIngredientByBarcode = async function(barcode) {
    const loadingEl = document.getElementById('recipe-lookup-loading');
    loadingEl.classList.remove('hidden');

    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
            const prod = data.product;
            const prodName = prod.product_name_hu || prod.product_name || prod.generic_name || "Ismeretlen hozzávaló";
            const nuts = prod.nutriments || {};

            const kcal100g = Math.round(nuts['energy-kcal_100g'] || nuts['energy-kcal'] || (nuts['energy_100g'] ? nuts['energy_100g'] / 4.184 : 0));
            const pro100g = Number(nuts.proteins_100g || nuts.proteins || 0);
            const car100g = Number(nuts.carbohydrates_100g || nuts.carbohydrates || 0);
            const fat100g = Number(nuts.fat_100g || nuts.fat || 0);

            window.currentScannedIngredient = {
                name: prodName,
                kcal100g,
                pro100g,
                car100g,
                fat100g
            };

            const staging = document.getElementById('recipe-ing-staging');
            document.getElementById('staging-ing-name').textContent = prodName;
            document.getElementById('staging-ing-macros').textContent = `100g: ${kcal100g} kcal | P: ${pro100g}g | C: ${car100g}g | F: ${fat100g}g`;
            staging.classList.remove('hidden');

            document.getElementById('add-scanned-ing-btn').disabled = false;
            window.showToast(`Hozzávaló beolvasva: ${prodName}`, 'fa-check', 'brand');
        } else {
            window.showToast("A termék nem található az adatbázisban!", "fa-circle-exclamation", "amber");
        }
    } catch (err) {
        console.error("Hiba a lekérdezéskor:", err);
        window.showToast("Hiba a termék lekérdezésekor!", "fa-circle-exclamation", "red");
    } finally {
        loadingEl.classList.add('hidden');
    }
};

window.addCurrentScannedIngredient = function() {
    if (!window.currentScannedIngredient) return;
    const amount = Number(document.getElementById('recipe-ingredient-amount').value) || 100;
    const ing = window.currentScannedIngredient;
    const ratio = amount / 100;

    const calculatedItem = {
        id: 'ing-' + Date.now(),
        name: ing.name,
        amount: amount,
        calories: Math.round(ing.kcal100g * ratio),
        protein: Math.round(ing.pro100g * ratio * 10) / 10,
        carbs: Math.round(ing.car100g * ratio * 10) / 10,
        fat: Math.round(ing.fat100g * ratio * 10) / 10
    };

    window.currentRecipeIngredients.push(calculatedItem);
    window.currentScannedIngredient = null;
    document.getElementById('recipe-ing-staging').classList.add('hidden');
    document.getElementById('add-scanned-ing-btn').disabled = true;
    document.getElementById('recipe-barcode-input').value = '';

    window.renderRecipeIngredientsChips();
    window.recalcTotalMealMacros();
    window.showToast(`${calculatedItem.name} (${amount}g) hozzáadva az ételhez!`, 'fa-plus', 'brand');
};

window.removeRecipeIngredient = function(idx) {
    window.currentRecipeIngredients.splice(idx, 1);
    window.renderRecipeIngredientsChips();
    window.recalcTotalMealMacros();
};

window.renderRecipeIngredientsChips = function() {
    const container = document.getElementById('recipe-ingredients-chip-list');
    if (!container) return;
    container.innerHTML = '';

    if (window.currentRecipeIngredients.length === 0) {
        container.innerHTML = `<div id="empty-ingredients-hint" class="text-[11px] text-slate-400 italic">Még nincsenek vonalkóddal csatolt hozzávalók (vagy add meg kézzel lejjebb).</div>`;
        return;
    }

    window.currentRecipeIngredients.forEach((item, idx) => {
        const chip = document.createElement('div');
        chip.className = "flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-brand-200 dark:border-brand-900/40 text-xs";
        chip.innerHTML = `
            <div class="truncate pr-2">
                <strong class="text-slate-900 dark:text-white">${item.name}</strong>
                <span class="text-slate-500 font-semibold ml-1">(${item.amount}g)</span>
                <div class="text-[10px] text-brand-600 dark:text-brand-400 font-bold">
                    ${item.calories} kcal • P:${item.protein}g • C:${item.carbs}g • F:${item.fat}g
                </div>
            </div>
            <button type="button" onclick="removeRecipeIngredient(${idx})" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer">
                <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
        `;
        container.appendChild(chip);
    });
};

window.recalcTotalMealMacros = function() {
    if (window.currentRecipeIngredients.length === 0) return;

    let totalCal = 0, totalPro = 0, totalCar = 0, totalFat = 0;
    let ingNames = [];

    window.currentRecipeIngredients.forEach(item => {
        totalCal += item.calories;
        totalPro += item.protein;
        totalCar += item.carbs;
        totalFat += item.fat;
        ingNames.push(`${item.amount}g ${item.name}`);
    });

    document.getElementById('meal-calories').value = Math.round(totalCal);
    document.getElementById('meal-protein').value = Math.round(totalPro * 10) / 10;
    document.getElementById('meal-carbs').value = Math.round(totalCar * 10) / 10;
    document.getElementById('meal-fat').value = Math.round(totalFat * 10) / 10;
    document.getElementById('meal-ingredients').value = ingNames.join(', ');
};

window.saveMeal = function(e) {
    e.preventDefault();
    const id = document.getElementById('meal-id').value;
    const newMeal = {
        id: id || 'meal-' + Date.now(),
        name: document.getElementById('meal-name').value.trim(),
        image: document.getElementById('meal-image').value.trim(),
        calories: Number(document.getElementById('meal-calories').value) || 0,
        protein: Number(document.getElementById('meal-protein').value) || 0,
        carbs: Number(document.getElementById('meal-carbs').value) || 0,
        fat: Number(document.getElementById('meal-fat').value) || 0,
        ingredients: document.getElementById('meal-ingredients').value.trim(),
        recipe: document.getElementById('meal-recipe').value.trim(),
        barcodeIngredients: [...window.currentRecipeIngredients]
    };

    if (id) {
        const idx = window.meals.findIndex(m => m.id === id);
        if (idx !== -1) window.meals[idx] = newMeal;
        window.showToast('Étel sikeresen frissítve!');
    } else {
        window.meals.push(newMeal);
        window.showToast('Új étel hozzáadva a könyvtárhoz!');
    }

    window.saveData();
    window.renderLibrary();
    window.renderPlanner();
    window.closeAddMealModal();
};

window.renderLibrary = function() {
    const grid = document.getElementById('library-grid');
    if (!grid) return;
    grid.innerHTML = '';

    window.meals.forEach(meal => {
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between";
        card.innerHTML = `
            <div>
                <h4 class="font-bold text-sm text-slate-900 dark:text-white mb-2">${meal.name}</h4>
                
                <div class="flex flex-wrap gap-1.5 text-[11px] font-bold mb-3">
                    <span class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-800">${meal.calories} kcal</span>
                    <span class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 text-bluebrand-600 dark:text-bluebrand-400 border border-slate-200 dark:border-slate-800">P: ${meal.protein}g</span>
                    <span class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-800">C: ${meal.carbs}g</span>
                    <span class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 text-redbrand-600 dark:text-redbrand-400 border border-slate-200 dark:border-slate-800">F: ${meal.fat}g</span>
                </div>

                ${meal.ingredients ? `<p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">${meal.ingredients}</p>` : ''}
            </div>

            <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <button onclick="openRecipeModal('${meal.id}')" class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">
                    <i class="fa-solid fa-book-open mr-1"></i> ${window.t('recipeBtn')}
                </button>
                <div class="flex gap-2">
                    <button onclick="openAddMealModal('${meal.id}')" class="text-slate-400 hover:text-brand-500 cursor-pointer p-1" title="Szerkesztés"><i class="fa-solid fa-pen text-xs"></i></button>
                    <button onclick="deleteMeal('${meal.id}')" class="text-slate-400 hover:text-red-500 cursor-pointer p-1" title="Törlés"><i class="fa-solid fa-trash text-xs"></i></button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
};

window.deleteMeal = function(id) {
    window.customConfirm(window.t('confirmTitle'), "Biztosan törlöd ezt az ételt a könyvtárból?", () => {
        window.meals = window.meals.filter(m => m.id !== id);
        window.saveData();
        window.renderLibrary();
        window.renderPlanner();
        window.showToast("Étel törölve", "fa-trash", "red");
    });
};

window.openRecipeModal = function(id) {
    const meal = window.meals.find(m => m.id === id);
    if (!meal) return;
    document.getElementById('recipe-modal-content').innerHTML = `
        <h3 class="text-lg font-black text-slate-900 dark:text-white mb-2">${meal.name}</h3>
        <div class="flex flex-wrap gap-2 text-xs font-bold mb-4">
            <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-800">${meal.calories} kcal</span>
            <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 text-bluebrand-600 dark:text-bluebrand-400 border border-slate-200 dark:border-slate-800">${window.t('macroProtein')}: ${meal.protein}g</span>
            <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-800">${window.t('macroCarbs')}: ${meal.carbs}g</span>
            <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 text-redbrand-600 dark:text-redbrand-400 border border-slate-200 dark:border-slate-800">${window.t('macroFat')}: ${meal.fat}g</span>
        </div>
        <h4 class="font-bold text-xs uppercase text-slate-400 mb-1">${window.t('ingredientsHeader')}</h4>
        <p class="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line mb-3 leading-relaxed">${meal.ingredients || '-'}</p>
        <h4 class="font-bold text-xs uppercase text-slate-400 mb-1">${window.t('recipeHeader')}</h4>
        <p class="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">${meal.recipe || '-'}</p>
    `;
    document.getElementById('recipe-modal').classList.remove('hidden');
};

window.openSelectMealModal = function(dateKey, sIdx) {
    window.activePickerDateKey = dateKey;
    window.activePickerSlotIdx = sIdx;
    window.filterSelectMeals('');
    document.getElementById('select-meal-modal').classList.remove('hidden');
};

window.filterSelectMeals = function(query) {
    const list = document.getElementById('select-meal-list');
    if (!list) return;
    list.innerHTML = '';
    const filtered = window.meals.filter(m => m.name.toLowerCase().includes((query || '').toLowerCase()));
    filtered.forEach(m => {
        const item = document.createElement('div');
        item.className = "p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:border-brand-500 transition";
        item.onclick = () => {
            const day = window.getDayData(window.activePickerDateKey);
            day.meals[window.activePickerSlotIdx] = m.id;
            window.saveData();
            window.renderPlanner();
            window.closeModal('select-meal-modal');
        };
        item.innerHTML = `<span class="font-bold text-xs truncate">${m.name}</span><span class="text-[10px] text-brand-600 font-bold">${m.calories} kcal</span>`;
        list.appendChild(item);
    });
};

window.quickAddMealFromPicker = function() {
    window.closeModal('select-meal-modal');
    window.openAddMealModal();
};

// ==============================================================
// 5. HETI ÉTREND TERVEZŐ (LILA KIEGÉSZÍTŐK & SÖTÉT/VILÁGOS MAKRÓK)
// ==============================================================
window.renderPlanner = function() {
    const grid = document.getElementById('planner-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const weekDates = window.getWeekDates(window.currentWeekOffset);
    const todayKey = window.getTodayKey();
    const currentDays = window.getDaysArray();
    const currentSlots = window.getSlotNames();

    const rangeLabel = document.getElementById('week-date-range-label');
    if (rangeLabel) {
        rangeLabel.textContent = `${weekDates[0].getFullYear()}. ${weekDates[0].getMonth()+1}.${weekDates[0].getDate()}. – ${weekDates[6].getMonth()+1}.${weekDates[6].getDate()}.`;
    }

    let totalWeekCal = 0, totalWeekPro = 0, totalWeekCar = 0, totalWeekFat = 0;

    weekDates.forEach((dObj, dIdx) => {
        const dateKey = window.formatDateKey(dObj);
        const dayData = window.getDayData(dateKey);
        const isToday = (dateKey === todayKey);

        let dayCal = 0, dayPro = 0, dayCar = 0, dayFat = 0;
        let mealsHtml = '';

        // 1. Ételek slotok szerint
        currentSlots.forEach((slotName, sIdx) => {
            const mealId = dayData.meals[sIdx];
            const meal = mealId ? window.meals.find(m => m.id === mealId) : null;
            if (meal) {
                dayCal += meal.calories; dayPro += meal.protein; dayCar += meal.carbs; dayFat += meal.fat;
                mealsHtml += `
                    <div class="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs mb-1.5 flex items-center justify-between">
                        <div class="truncate pr-1 cursor-pointer" onclick="openRecipeModal('${meal.id}')">
                            <span class="text-[9px] text-slate-400 block">${slotName}</span>
                            <strong class="truncate block text-slate-800 dark:text-slate-100">${meal.name}</strong>
                            <span class="text-[10px] text-brand-600 dark:text-brand-400 font-bold">${meal.calories} kcal</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <button onclick="openRecipeModal('${meal.id}')" class="text-slate-400 hover:text-brand-500 p-1 cursor-pointer" title="${window.t('recipeBtn')}">
                                <i class="fa-solid fa-book-open text-xs"></i>
                            </button>
                            <button onclick="removeMealFromSlot('${dateKey}', ${sIdx})" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer">
                                <i class="fa-solid fa-xmark text-xs"></i>
                            </button>
                        </div>
                    </div>
                `;
            } else {
                mealsHtml += `
                    <div onclick="openSelectMealModal('${dateKey}', ${sIdx})" class="p-2 mb-1.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-500/50 text-center cursor-pointer text-[10px] text-slate-400">
                        + ${slotName}
                    </div>
                `;
            }
        });

        // 2. KIEGÉSZÍTŐK BLOKK: ERŐS LILA HÁTTÉRREL ÉS BIZTOS TÖRLÉSSEL
        const supplements = dayData.supplements || [];
        let suppHtml = '';
        if (supplements.length > 0) {
            suppHtml = '<div class="space-y-1 mb-2 pt-1 border-t border-purple-200/50 dark:border-purple-800/40">';
            supplements.forEach((sp, spIdx) => {
                suppHtml += `
                    <div class="flex items-center justify-between p-1.5 px-2 bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 rounded-xl text-[10px] border border-purple-300 dark:border-purple-800 shadow-xs">
                        <label class="flex items-center gap-1.5 truncate cursor-pointer flex-1 mr-1">
                            <input type="checkbox" ${sp.taken ? 'checked' : ''} onchange="toggleSupplementCheck('${dateKey}', ${spIdx})" class="w-3.5 h-3.5 rounded text-purplebrand-600 focus:ring-0 cursor-pointer">
                            <span class="${sp.taken ? 'line-through opacity-60' : 'font-bold'} truncate">${sp.name}</span>
                            ${sp.time ? `<span class="text-[9px] opacity-75 font-normal">(${sp.time})</span>` : ''}
                        </label>
                        <button type="button" onclick="deleteSupplementItem('${dateKey}', ${spIdx}, event)" class="text-purple-400 hover:text-red-500 p-0.5 cursor-pointer ml-1" title="Törlés">
                            <i class="fa-solid fa-xmark text-[10px]"></i>
                        </button>
                    </div>
                `;
            });
            suppHtml += '</div>';
        }

        // 3. Bűnözések (Cheat Meals)
        const cheats = dayData.cheats || [];
        let cheatsHtml = '';
        if (cheats.length > 0) {
            cheatsHtml = '<div class="space-y-1 mb-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">';
            cheats.forEach((ch, chIdx) => {
                dayCal += ch.calories; dayPro += ch.protein; dayCar += ch.carbs; dayFat += ch.fat;
                cheatsHtml += `
                    <div class="flex items-center justify-between p-1 px-1.5 bg-amber-50/70 dark:bg-amber-950/40 rounded-lg text-[10px] border border-amber-200/60 dark:border-amber-800/40">
                        <span class="truncate font-semibold text-amber-800 dark:text-amber-300">🍪 ${ch.name} (${ch.amount}g)</span>
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <span class="font-black text-amber-600 dark:text-amber-400">+${ch.calories}</span>
                            <button onclick="deleteCheatItem('${dateKey}', ${chIdx})" class="text-slate-400 hover:text-red-500 p-0.5"><i class="fa-solid fa-xmark text-[9px]"></i></button>
                        </div>
                    </div>
                `;
            });
            cheatsHtml += '</div>';
        }

        // 4. Hidratáció
        const hydroEffective = window.getDayEffectiveHydration(dateKey);

        totalWeekCal += dayCal; totalWeekPro += dayPro; totalWeekCar += dayCar; totalWeekFat += dayFat;

        const card = document.createElement('div');
        card.className = `bg-white dark:bg-slate-900 border rounded-2xl p-3 flex flex-col justify-between shadow-sm ${isToday ? 'border-2 border-brand-500 shadow-md' : 'border-slate-200 dark:border-slate-800'}`;
        
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <span class="font-bold text-xs ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-slate-200'}">${currentDays[dIdx]} (${dObj.getDate()})</span>
                    <span class="text-[10px] font-black text-brand-600 dark:text-brand-400">${dayCal} kcal</span>
                </div>

                <div>${mealsHtml}</div>

                ${suppHtml}
                ${cheatsHtml}

                <div class="grid grid-cols-3 gap-1 pt-1 mb-2">
                    <button type="button" onclick="openSupplementModal('${dateKey}')" class="py-1 px-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/70 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-300 rounded-lg text-[9px] font-bold border border-purple-300 dark:border-purple-800/50 truncate cursor-pointer" title="${window.t('addSuppBtn')}">
                        <i class="fa-solid fa-pills mr-0.5"></i> Kieg.
                    </button>
                    <button type="button" onclick="openCheatModal('${dateKey}')" class="py-1 px-1 bg-amber-50 dark:bg-amber-950/70 hover:bg-amber-100 text-amber-700 dark:text-amber-300 rounded-lg text-[9px] font-bold border border-amber-200 dark:border-amber-800/50 truncate cursor-pointer" title="${window.t('addCheatBtn')}">
                        <i class="fa-solid fa-cookie-bite mr-0.5"></i> Cheat
                    </button>
                    <button type="button" onclick="openHydrationModal('${dateKey}')" class="py-1 px-1 bg-cyan-50 dark:bg-cyan-950/70 hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300 rounded-lg text-[9px] font-bold border border-cyan-200 dark:border-cyan-800/50 truncate cursor-pointer" title="${window.t('addHydroBtn')}">
                        <i class="fa-solid fa-glass-water mr-0.5"></i> ${hydroEffective}ml
                    </button>
                </div>
            </div>

            <!-- NAPI MAKRÓK: TISZTA VILÁGOS & MÉLYSÖTÉT PANELEK HÁTTÉRRE SZABVA -->
            <div class="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-1 text-center text-[9px] font-bold">
                <div class="bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-col items-center">
                    <span class="text-[8px] text-slate-400 uppercase font-semibold">Kcal</span>
                    <span class="text-brand-600 dark:text-brand-400 font-black">${dayCal}</span>
                </div>
                <div class="bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-col items-center">
                    <span class="text-[8px] text-slate-400 uppercase font-semibold">Fehérje</span>
                    <span class="text-bluebrand-600 dark:text-bluebrand-400 font-black">${Math.round(dayPro)}g</span>
                </div>
                <div class="bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-col items-center">
                    <span class="text-[8px] text-slate-400 uppercase font-semibold">Szénh.</span>
                    <span class="text-amber-600 dark:text-amber-400 font-black">${Math.round(dayCar)}g</span>
                </div>
                <div class="bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-col items-center">
                    <span class="text-[8px] text-slate-400 uppercase font-semibold">Zsír</span>
                    <span class="text-redbrand-600 dark:text-redbrand-400 font-black">${Math.round(dayFat)}g</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    // HETI ÁTLAG SÁV
    const summaryEl = document.getElementById('weekly-macro-summary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-slate-800 dark:text-slate-100" data-i18n="weeklyDailyAverage">${window.t('weeklyDailyAverage')}:</span>
                <span class="text-xs font-black text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-brand-200 dark:border-brand-900/40">🔥 ${Math.round(totalWeekCal/7)} kcal ${window.t('perDay')}</span>
            </div>
            <div class="flex flex-wrap gap-2 text-xs font-bold">
                <span class="bg-slate-100 dark:bg-slate-950 text-bluebrand-600 dark:text-bluebrand-400 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800">${window.t('macroProtein')}: ${Math.round(totalWeekPro/7)}g</span>
                <span class="bg-slate-100 dark:bg-slate-950 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800">${window.t('macroCarbs')}: ${Math.round(totalWeekCar/7)}g</span>
                <span class="bg-slate-100 dark:bg-slate-950 text-redbrand-600 dark:text-redbrand-400 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800">${window.t('macroFat')}: ${Math.round(totalWeekFat/7)}g</span>
            </div>
        `;
    }
};

window.removeMealFromSlot = function(dateKey, sIdx) {
    const day = window.getDayData(dateKey);
    day.meals[sIdx] = null;
    window.saveData();
    window.renderPlanner();
};

// ==============================================================
// 6. BEVÁSÁRLÓLISTA KEZELŐ
// ==============================================================
function extractIngredientsList(raw) {
    if (!raw) return [];
    return raw.split('\n').flatMap(l => l.split(',')).map(s => s.trim()).filter(Boolean);
}

window.openWeeklyShoppingList = function() {
    const listContainer = document.getElementById('shopping-list-content');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    const weekDates = window.getWeekDates(window.currentWeekOffset);
    const items = new Set();

    weekDates.forEach(dObj => {
        const day = window.getDayData(window.formatDateKey(dObj));
        (day.meals || []).forEach(mId => {
            if (mId) {
                const m = window.meals.find(x => x.id === mId);
                if (m) extractIngredientsList(m.ingredients).forEach(i => items.add(i));
            }
        });
    });

    if (items.size === 0) {
        listContainer.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs italic">Nincs rögzített hozzávaló erre a hétre.</div>';
    } else {
        items.forEach(ing => {
            const row = document.createElement('label');
            row.className = "flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-brand-500 cursor-pointer text-xs";
            row.innerHTML = `<input type="checkbox" class="w-4 h-4 rounded text-brand-600 focus:ring-0 cursor-pointer"> <span>${ing}</span>`;
            listContainer.appendChild(row);
        });
    }
    document.getElementById('shopping-modal').classList.remove('hidden');
};

window.clearShoppingChecked = function() {
    document.querySelectorAll('#shopping-list-content input[type="checkbox"]').forEach(c => c.checked = false);
};
