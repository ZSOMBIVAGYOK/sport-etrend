// ==============================================================
// FitPlan Pro - Eszközök, Dokumentumok & Navigáció (js/gear.js)
// ==============================================================

// ==============================================================
// 1. ESZKÖZÖK & FOGYÓ KÖRGYŰRŰS KARBANTARTÁSI MOTOR
// ==============================================================
window.renderGearLibrary = function() {
    window.renderGearCategoryPills();

    const grid = document.getElementById('gear-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let list = window.gearItems || [];
    if (window.activeGearCategory !== 'all') {
        list = list.filter(g => g.categoryId === window.activeGearCategory);
    }

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-400 text-sm">
                <i class="fa-solid fa-toolbox text-4xl mb-3 text-slate-300 dark:text-slate-700 block"></i>
                Ebben a kategóriában még nincsenek rögzített eszközök.
            </div>
        `;
        return;
    }

    const now = Date.now();

    list.forEach(item => {
        const cat = (window.gearCategories || []).find(c => c.id === item.categoryId);
        const catName = cat ? cat.name : 'Általános';

        // Karbantartási ciklus matematikai kalkulációja
        const intervalDays = Number(item.intervalDays) || 30;
        const lastMaintained = Number(item.lastMaintained) || now;
        const elapsedMs = Math.max(0, now - lastMaintained);
        const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
        const remainingDays = intervalDays - elapsedDays;

        let remainingPercent = Math.round((remainingDays / intervalDays) * 100);
        remainingPercent = Math.max(0, Math.min(100, remainingPercent));

        const isOverdue = remainingDays <= 0;

        // Színkódok és státusz-címkék meghatározása
        let ringColor = '#10b981'; // Zöld (>50%)
        let textColor = 'text-emerald-600 dark:text-emerald-400';
        let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">${remainingDays} ${window.t('daysLeft')}</span>`;

        if (remainingPercent <= 50 && remainingPercent > 20) {
            ringColor = '#f59e0b'; // Sárga
            textColor = 'text-amber-600 dark:text-amber-400';
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">${remainingDays} ${window.t('daysLeft')}</span>`;
        } else if (remainingPercent <= 20 && !isOverdue) {
            ringColor = '#f97316'; // Narancs
            textColor = 'text-orangebrand-600 dark:text-orangebrand-400';
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orangebrand-100 dark:bg-orangebrand-950/80 text-orangebrand-700 dark:text-orangebrand-300 border border-orangebrand-300 dark:border-orangebrand-800">${remainingDays} ${window.t('daysLeft')}</span>`;
        } else if (isOverdue) {
            ringColor = '#ef4444'; // Piros figyelmeztetés
            textColor = 'text-red-600 dark:text-red-400';
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">${window.t('overdue')} (${Math.abs(remainingDays)} napja)</span>`;
        }

        // Körgyűrű SVG generálása
        const radius = 28;
        const strokeWidth = 5;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (remainingPercent / 100) * circumference;
        const size = (radius + strokeWidth) * 2;
        const center = size / 2;

        const ringSvg = `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="overflow-visible flex-shrink-0">
                <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" class="text-slate-200 dark:text-slate-800"/>
                <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${ringColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" class="progress-ring-circle"/>
            </svg>
        `;

        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orangebrand-500/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition group";
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-3">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orangebrand-50 dark:bg-orangebrand-950/80 text-orangebrand-700 dark:text-orangebrand-300 border border-orangebrand-200 dark:border-orangebrand-800/50">${catName}</span>
                    <div class="flex items-center gap-1.5">
                        <button type="button" onclick="openGearItemModal('${item.id}')" class="text-slate-400 hover:text-orangebrand-500 p-1 cursor-pointer" title="Szerkesztés">
                            <i class="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button type="button" onclick="deleteGearItemDirect('${item.id}')" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer" title="Törlés">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>

                ${item.image ? `<img src="${item.image}" class="w-full h-32 object-cover rounded-xl mb-3 border border-slate-200 dark:border-slate-800" onerror="this.style.display='none'">` : ''}

                <h4 class="font-bold text-sm text-slate-900 dark:text-white mb-1">${item.name}</h4>
                ${item.desc ? `<p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-3">${item.desc}</p>` : ''}

                <!-- FOGYÓ KÖRGYŰRŰS WIDGET -->
                <div class="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-3 my-2">
                    <div class="flex items-center gap-3">
                        <div class="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                            ${ringSvg}
                            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span class="text-xs font-black ${textColor}">${remainingPercent}%</span>
                            </div>
                        </div>
                        <div class="truncate">
                            <span class="text-[10px] text-slate-400 block">${window.t('maintCycle')}: ${intervalDays} nap</span>
                            <div class="mt-1">${statusBadge}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- KARBANTARTÁS ELVÉGEZVE GOMB -->
            <div class="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button type="button" onclick="performGearMaintenance('${item.id}')" class="w-full py-2 bg-gradient-to-r from-orangebrand-500 to-amber-500 hover:opacity-95 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-orangebrand-500/20 transition cursor-pointer">
                    <i class="fa-solid fa-wrench"></i> ${window.t('maintainBtn')}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
};

window.renderGearCategoryPills = function() {
    const container = document.getElementById('gear-category-pills');
    if (!container) return;
    container.innerHTML = '';

    const isAll = (window.activeGearCategory === 'all');
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.onclick = () => window.filterGearCategory('all');
    allBtn.className = isAll
        ? "px-3 py-1.5 rounded-xl text-xs font-bold transition bg-orangebrand-500 text-slate-950 shadow cursor-pointer"
        : "px-3 py-1.5 rounded-xl text-xs font-bold transition bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer";
    allBtn.textContent = window.t('filterAll');
    container.appendChild(allBtn);

    (window.gearCategories || []).forEach(cat => {
        const isActive = (window.activeGearCategory === cat.id);
        const pill = document.createElement('div');
        pill.className = `flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${isActive ? 'bg-orangebrand-500 text-slate-950 border-orangebrand-500 shadow' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'}`;
        pill.innerHTML = `
            <span onclick="filterGearCategory('${cat.id}')" class="cursor-pointer">${cat.name}</span>
            <button type="button" onclick="deleteGearCategory('${cat.id}')" class="text-xs hover:text-red-500 ml-1 p-0.5 cursor-pointer" title="Kategória törlése"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(pill);
    });
};

window.filterGearCategory = function(catId) {
    window.activeGearCategory = catId;
    window.renderGearLibrary();
};

window.openGearCategoryModal = function() {
    document.getElementById('gear-cat-name').value = '';
    document.getElementById('gear-category-modal').classList.remove('hidden');
};

window.saveGearCategoryForm = function(e) {
    e.preventDefault();
    const name = document.getElementById('gear-cat-name').value.trim();
    if (!name) return;

    if (!window.gearCategories) window.gearCategories = [];
    window.gearCategories.push({
        id: 'gcat-' + Date.now(),
        name: name
    });
    window.saveData();
    window.closeModal('gear-category-modal');
    window.renderGearLibrary();
    window.showToast("Új eszköz kategória létrehozva!", "fa-folder-plus", "orangebrand");
};

window.deleteGearCategory = function(catId) {
    window.customConfirm(window.t('confirmTitle'), "Biztosan törlöd ezt az eszköz kategóriát?", () => {
        window.gearCategories = (window.gearCategories || []).filter(c => c.id !== catId);
        if (window.activeGearCategory === catId) window.activeGearCategory = 'all';
        window.saveData();
        window.renderGearLibrary();
        window.showToast("Kategória törölve", "fa-trash", "red");
    });
};

window.openGearItemModal = function(gearId = null) {
    const selectEl = document.getElementById('gear-form-category');
    selectEl.innerHTML = '';

    const cats = window.gearCategories || [];
    if (cats.length === 0) {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Alapértelmezett';
        selectEl.appendChild(defaultOpt);
    } else {
        cats.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            selectEl.appendChild(opt);
        });
    }

    document.getElementById('gear-form-id').value = gearId || '';
    const deleteBtn = document.getElementById('gear-delete-btn');

    if (gearId) {
        const item = (window.gearItems || []).find(g => String(g.id) === String(gearId));
        if (item) {
            document.getElementById('gear-item-modal-title').textContent = `${item.name} szerkesztése`;
            document.getElementById('gear-form-name').value = item.name || '';
            document.getElementById('gear-form-category').value = item.categoryId || (cats[0] ? cats[0].id : '');
            document.getElementById('gear-form-image').value = item.image || '';
            document.getElementById('gear-form-desc').value = item.desc || '';
            const interval = item.intervalDays || 30;
            document.getElementById('gear-form-interval').value = interval;
            document.getElementById('gear-interval-display').textContent = `${interval} nap`;
            if (deleteBtn) deleteBtn.classList.remove('hidden');
        }
    } else {
        document.getElementById('gear-item-modal-title').textContent = window.t('newGearBtn');
        document.getElementById('gear-form-name').value = '';
        document.getElementById('gear-form-image').value = '';
        document.getElementById('gear-form-desc').value = '';
        document.getElementById('gear-form-interval').value = 30;
        document.getElementById('gear-interval-display').textContent = '30 nap';
        if (cats[0]) selectEl.value = cats[0].id;
        if (deleteBtn) deleteBtn.classList.add('hidden');
    }

    document.getElementById('gear-item-modal').classList.remove('hidden');
};

window.saveGearItemForm = function(e) {
    e.preventDefault();
    const id = document.getElementById('gear-form-id').value;
    const name = document.getElementById('gear-form-name').value.trim();
    const categoryId = document.getElementById('gear-form-category').value;
    const image = document.getElementById('gear-form-image').value.trim();
    const desc = document.getElementById('gear-form-desc').value.trim();
    const intervalDays = Number(document.getElementById('gear-form-interval').value) || 30;

    if (!name) {
        window.showToast("Kérlek add meg az eszköz nevét!", "fa-circle-exclamation", "amber");
        return;
    }

    if (!window.gearItems) window.gearItems = [];

    if (id) {
        const idx = window.gearItems.findIndex(g => String(g.id) === String(id));
        if (idx !== -1) {
            window.gearItems[idx] = {
                ...window.gearItems[idx],
                name,
                categoryId,
                image,
                desc,
                intervalDays
            };
            window.showToast("Eszköz adatai sikeresen módosítva!", "fa-toolbox", "orangebrand");
        }
    } else {
        window.gearItems.push({
            id: 'gear-' + Date.now(),
            name,
            categoryId,
            image,
            desc,
            intervalDays,
            lastMaintained: Date.now()
        });
        window.showToast("Új eszköz sikeresen létrehozva!", "fa-plus", "orangebrand");
    }

    window.saveData();
    window.closeModal('gear-item-modal');
    window.renderGearLibrary();
};

window.deleteCurrentGearItem = function() {
    const id = document.getElementById('gear-form-id').value;
    if (id) {
        window.deleteGearItemDirect(id);
        window.closeModal('gear-item-modal');
    }
};

window.deleteGearItemDirect = function(gearId) {
    window.customConfirm(window.t('confirmTitle'), "Biztosan törlöd ezt az eszközt?", () => {
        window.gearItems = (window.gearItems || []).filter(g => String(g.id) !== String(gearId));
        window.saveData();
        window.renderGearLibrary();
        window.showToast("Eszköz törölve", "fa-trash", "red");
    });
};

window.performGearMaintenance = function(gearId) {
    const item = (window.gearItems || []).find(g => String(g.id) === String(gearId));
    if (!item) return;

    item.lastMaintained = Date.now();
    window.saveData();
    window.renderGearLibrary();
    window.showToast(`${item.name} karbantartva! Számláló visszaállítva 100%-ra.`, 'fa-wrench', 'orangebrand');
};

// ==============================================================
// 2. EGÉSZSÉGÜGYI DOKUMENTUMOK & LELETEK MOTORJA
// ==============================================================
window.renderDocuments = function() {
    const grid = document.getElementById('docs-grid');
    if (!grid) return;
    grid.innerHTML = '';
    let docs = window.documents || [];
    if (window.activeDocFilter !== 'all') docs = docs.filter(d => d.type === window.activeDocFilter);

    if (docs.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400 text-sm">Nincsenek feltöltött dokumentumok.</div>';
        return;
    }

    docs.forEach(doc => {
        const isPdf = doc.fileType === 'application/pdf' || (doc.url && doc.url.includes('.pdf'));
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col justify-between";
        card.innerHTML = `
            <div class="cursor-pointer" onclick="openDocViewer('${doc.id}')">
                <div class="h-32 bg-slate-100 dark:bg-slate-950 rounded-xl flex items-center justify-center overflow-hidden mb-2">
                    ${isPdf ? '<i class="fa-solid fa-file-pdf text-4xl text-red-500"></i>' : `<img src="${doc.url}" class="w-full h-full object-cover">`}
                </div>
                <h4 class="font-bold text-xs truncate text-slate-900 dark:text-white">${doc.title || doc.type}</h4>
                <span class="text-[10px] text-slate-400">${doc.date}</span>
            </div>
            <div class="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <button onclick="openDocViewer('${doc.id}')" class="text-xs font-bold text-redbrand-600 cursor-pointer">Megnyitás</button>
                <button onclick="deleteDocument('${doc.id}')" class="text-slate-400 hover:text-red-500 cursor-pointer p-1"><i class="fa-solid fa-trash text-xs"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
};

window.openUploadDocModal = function() {
    document.getElementById('doc-title').value = '';
    document.getElementById('doc-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('doc-file').value = '';
    document.getElementById('doc-upload-progress').classList.add('hidden');
    document.getElementById('doc-submit-btn').disabled = false;
    document.getElementById('doc-upload-modal').classList.remove('hidden');
};

window.saveDocumentForm = async function(e) {
    e.preventDefault();
    const file = document.getElementById('doc-file').files[0];
    if (!file) return window.showToast('Válassz ki egy fájlt!', 'fa-circle-exclamation', 'red');

    document.getElementById('doc-upload-progress').classList.remove('hidden');
    document.getElementById('doc-submit-btn').disabled = true;

    try {
        let downloadUrl = '';
        if (typeof window.uploadFileToFirebaseStorage === 'function') {
            downloadUrl = await window.uploadFileToFirebaseStorage(file);
        } else {
            downloadUrl = await new Promise(r => {
                const fr = new FileReader();
                fr.onload = () => r(fr.result);
                fr.readAsDataURL(file);
            });
        }

        if (!window.documents) window.documents = [];
        window.documents.push({
            id: 'doc-' + Date.now(),
            type: document.getElementById('doc-type').value,
            date: document.getElementById('doc-date').value,
            title: document.getElementById('doc-title').value.trim() || 'Lelet',
            url: downloadUrl,
            fileType: file.type
        });

        window.saveData();
        window.renderDocuments();
        window.closeModal('doc-upload-modal');
        window.showToast('Dokumentum sikeresen feltöltve!', 'fa-check', 'brand');
    } catch (err) {
        window.showToast(err.message || 'Feltöltési hiba!', 'fa-circle-exclamation', 'red');
    } finally {
        document.getElementById('doc-upload-progress').classList.add('hidden');
        document.getElementById('doc-submit-btn').disabled = false;
    }
};

window.openDocViewer = function(id) {
    const doc = (window.documents || []).find(d => d.id === id);
    if (!doc) return;
    const isPdf = doc.fileType === 'application/pdf' || (doc.url && doc.url.includes('.pdf'));
    document.getElementById('doc-viewer-title').textContent = doc.title || doc.type;
    document.getElementById('doc-viewer-body').innerHTML = isPdf
        ? `<iframe src="${doc.url}" class="w-full h-[70vh] rounded-xl border-0"></iframe>`
        : `<img src="${doc.url}" class="max-h-[75vh] object-contain rounded-xl">`;
    document.getElementById('doc-viewer-modal').classList.remove('hidden');
};

window.deleteDocument = function(id) {
    window.customConfirm(window.t('confirmTitle'), "Biztosan törlöd ezt a dokumentumot?", () => {
        window.documents = (window.documents || []).filter(d => d.id !== id);
        window.saveData();
        window.renderDocuments();
        window.showToast('Dokumentum törölve', 'fa-trash', 'red');
    });
};

window.filterDocuments = function(type) {
    window.activeDocFilter = type;
    document.querySelectorAll('.doc-filter-btn').forEach(btn => {
        const isMatch = btn.getAttribute('data-type') === type;
        btn.classList.toggle('bg-redbrand-600', isMatch);
        btn.classList.toggle('text-white', isMatch);
    });
    window.renderDocuments();
};

// ==============================================================
// 3. SPORTOLÓI PROFILOK KEZELŐJE (UI FORMS)
// ==============================================================
window.openProfilesModal = function() {
    const list = document.getElementById('profiles-list');
    if (!list) return;
    list.innerHTML = '';

    window.profiles.forEach(prof => {
        const isActive = (prof.id === window.currentProfileId);
        const row = document.createElement('div');
        row.className = `flex items-center justify-between p-3 rounded-2xl border transition ${isActive ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-500 shadow-xs' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`;
        row.innerHTML = `
            <div class="flex items-center gap-3 flex-1 cursor-pointer truncate mr-2" onclick="switchProfile('${prof.id}')">
                <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-600 dark:text-slate-300 font-bold text-xs overflow-hidden">
                    ${prof.image ? `<img src="${prof.image}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-[11px]"></i>`}
                </div>
                <div class="truncate">
                    <strong class="text-xs block text-slate-900 dark:text-white truncate">${prof.name}</strong>
                    <span class="text-[10px] text-slate-400 block">${prof.sport || 'Sportoló'} • ${prof.weight || 75} kg</span>
                </div>
            </div>
            <div class="flex items-center gap-1">
                <button type="button" onclick="openProfileFormModal('${prof.id}')" class="p-1.5 text-slate-400 hover:text-brand-500 cursor-pointer" title="Szerkesztés">
                    <i class="fa-solid fa-pen text-xs"></i>
                </button>
                <button type="button" onclick="deleteProfile('${prof.id}')" class="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer" title="Törlés">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </div>
        `;
        list.appendChild(row);
    });
    document.getElementById('profiles-modal').classList.remove('hidden');
};

window.openProfileFormModal = function(id = null) {
    document.getElementById('profile-form-id').value = id || '';
    if (id) {
        const p = window.profiles.find(x => x.id === id);
        if (p) {
            document.getElementById('profile-form-title').textContent = `${p.name} - ${window.t('profileSheetTitle')}`;
            document.getElementById('profile-form-name').value = p.name || '';
            document.getElementById('profile-form-gender').value = p.gender || 'Férfi';
            document.getElementById('profile-form-birthdate').value = p.birthdate || '';
            document.getElementById('profile-form-sport').value = p.sport || '';
            document.getElementById('profile-form-image').value = p.image || '';
            document.getElementById('profile-form-height').value = p.height || '';
            document.getElementById('profile-form-weight').value = p.weight || '';
            document.getElementById('profile-form-target-weight').value = p.targetWeight || '';
            document.getElementById('profile-form-bodyfat').value = p.bodyFat || '';
            document.getElementById('profile-form-resting-hr').value = p.restingHr || '';
        }
    } else {
        document.getElementById('profile-form-title').textContent = window.t('newProfileBtn');
        document.getElementById('profile-form-name').value = '';
        document.getElementById('profile-form-gender').value = 'Férfi';
        document.getElementById('profile-form-birthdate').value = '';
        document.getElementById('profile-form-sport').value = '';
        document.getElementById('profile-form-image').value = '';
        document.getElementById('profile-form-height').value = '180';
        document.getElementById('profile-form-weight').value = '75';
        document.getElementById('profile-form-target-weight').value = '80';
        document.getElementById('profile-form-bodyfat').value = '14';
        document.getElementById('profile-form-resting-hr').value = '60';
    }
    document.getElementById('profiles-modal').classList.add('hidden');
    document.getElementById('profile-form-modal').classList.remove('hidden');
};

window.saveProfileForm = function(e) {
    e.preventDefault();
    const id = document.getElementById('profile-form-id').value;
    const name = document.getElementById('profile-form-name').value.trim();
    const gender = document.getElementById('profile-form-gender').value;
    const birthdate = document.getElementById('profile-form-birthdate').value;
    const sport = document.getElementById('profile-form-sport').value.trim();
    const image = document.getElementById('profile-form-image').value.trim();
    const height = Number(document.getElementById('profile-form-height').value) || 180;
    const weight = Number(document.getElementById('profile-form-weight').value) || 75;
    const targetWeight = Number(document.getElementById('profile-form-target-weight').value) || 80;
    const bodyFat = Number(document.getElementById('profile-form-bodyfat').value) || 14;
    const restingHr = Number(document.getElementById('profile-form-resting-hr').value) || 60;

    if (!name) return;

    if (id) {
        const p = window.profiles.find(x => x.id === id);
        if (p) {
            p.name = name;
            p.gender = gender;
            p.birthdate = birthdate;
            p.sport = sport;
            p.image = image;
            p.height = height;
            p.weight = weight;
            p.targetWeight = targetWeight;
            p.bodyFat = bodyFat;
            p.restingHr = restingHr;
        }
    } else {
        const newId = 'prof-' + Date.now();
        window.profiles.push({
            id: newId, name, gender, birthdate, sport, image,
            height, weight, targetWeight, bodyFat, restingHr
        });
        window.profileData[newId] = {
            meals: [...window.DEFAULT_MEALS], documents: [], days: {},
            exerciseCategories: [...window.DEFAULT_EXERCISE_CATEGORIES],
            workoutExercises: [...window.DEFAULT_WORKOUT_EXERCISES],
            programCategories: [...window.DEFAULT_PROGRAM_CATEGORIES],
            workoutPrograms: [...window.DEFAULT_WORKOUT_PROGRAMS],
            recRoutineCategories: [...window.DEFAULT_REC_ROUTINE_CATEGORIES],
            recoveryRoutines: [...window.DEFAULT_RECOVERY_ROUTINES],
            gearCategories: [...window.DEFAULT_GEAR_CATEGORIES],
            gearItems: [...window.DEFAULT_GEAR_ITEMS]
        };
    }

    window.saveData();
    window.updateProfileUI();
    window.closeModal('profile-form-modal');
    window.openProfilesModal();
    window.showToast("Sportolói adatlap elmentve!", "fa-id-card", "brand");
};

window.deleteProfile = function(profId) {
    if (window.profiles.length <= 1) {
        return window.showToast(window.t('cannotDeleteLastProfile'), "fa-circle-exclamation", "amber");
    }
    const prof = window.profiles.find(p => p.id === profId);
    window.customConfirm(window.t('confirmTitle'), `${prof ? prof.name : 'Profil'}: ${window.t('deleteProfileConfirm')}`, () => {
        window.profiles = window.profiles.filter(p => p.id !== profId);
        delete window.profileData[profId];
        if (window.currentProfileId === profId) {
            window.currentProfileId = window.profiles[0].id;
            window.switchProfile(window.currentProfileId);
        }
        window.saveData();
        window.openProfilesModal();
        window.showToast("Profil törölve", "fa-trash", "red");
    });
};

// ==============================================================
// 4. ALKALMAZÁS MÓD & NÉZETVÁLTÓK (TABS & APP MODES)
// ==============================================================
window.switchTab = function(t) {
    document.getElementById('tab-planner').classList.toggle('hidden', t !== 'planner');
    document.getElementById('tab-month-diet').classList.toggle('hidden', t !== 'month');
    document.getElementById('tab-library').classList.toggle('hidden', t !== 'library');

    const tabButtons = {
        planner: document.getElementById('tab-planner-btn'),
        month: document.getElementById('tab-month-btn'),
        library: document.getElementById('tab-library-btn')
    };
    const activeClass = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition bg-brand-600 text-white shadow-md cursor-pointer";
    const inactiveClass = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer";

    Object.keys(tabButtons).forEach(k => {
        const btn = tabButtons[k];
        if (btn) btn.className = (k === t) ? activeClass : inactiveClass;
    });

    if (t === 'planner' && typeof window.renderPlanner === 'function') window.renderPlanner();
    if (t === 'month' && typeof window.renderMonthCalendar === 'function') window.renderMonthCalendar('diet');
    if (t === 'library' && typeof window.renderLibrary === 'function') window.renderLibrary();
};

window.switchWorkoutTab = function(t) {
    document.getElementById('tab-workout-planner').classList.toggle('hidden', t !== 'planner');
    document.getElementById('tab-month-workout').classList.toggle('hidden', t !== 'month');
    document.getElementById('tab-workout-programs').classList.toggle('hidden', t !== 'programs');
    document.getElementById('tab-workout-exercises').classList.toggle('hidden', t !== 'exercises');

    const wTabButtons = {
        planner: document.getElementById('w-tab-planner-btn'),
        month: document.getElementById('w-tab-month-btn'),
        programs: document.getElementById('w-tab-programs-btn'),
        exercises: document.getElementById('w-tab-exercises-btn')
    };
    const wActive = "px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition bg-bluebrand-600 text-white shadow-md cursor-pointer";
    const wInactive = "px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer";

    Object.keys(wTabButtons).forEach(k => {
        const btn = wTabButtons[k];
        if (btn) btn.className = (k === t) ? wActive : wInactive;
    });

    if (t === 'planner' && typeof window.renderWorkoutPlanner === 'function') window.renderWorkoutPlanner();
    if (t === 'month' && typeof window.renderMonthCalendar === 'function') window.renderMonthCalendar('workout');
    if (t === 'programs' && typeof window.renderWorkoutProgramsLibrary === 'function') window.renderWorkoutProgramsLibrary();
    if (t === 'exercises' && typeof window.renderWorkoutExercisesLibrary === 'function') window.renderWorkoutExercisesLibrary();
};

window.switchRecoveryTab = function(t) {
    document.getElementById('tab-recovery-planner').classList.toggle('hidden', t !== 'planner');
    document.getElementById('tab-month-recovery').classList.toggle('hidden', t !== 'month');
    document.getElementById('tab-recovery-routines').classList.toggle('hidden', t !== 'routines');

    const rTabButtons = {
        planner: document.getElementById('r-tab-planner-btn'),
        month: document.getElementById('r-tab-month-btn'),
        routines: document.getElementById('r-tab-routines-btn')
    };
    const rActive = "px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition bg-purplebrand-600 text-white shadow-md cursor-pointer";
    const rInactive = "px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer";

    Object.keys(rTabButtons).forEach(k => {
        const btn = rTabButtons[k];
        if (btn) btn.className = (k === t) ? rActive : rInactive;
    });

    if (t === 'planner' && typeof window.renderRecoveryPlanner === 'function') window.renderRecoveryPlanner();
    if (t === 'month' && typeof window.renderMonthCalendar === 'function') window.renderMonthCalendar('recovery');
    if (t === 'routines' && typeof window.renderRecoveryRoutinesLibrary === 'function') window.renderRecoveryRoutinesLibrary();
};

window.switchAppMode = function(mode) {
    window.currentAppMode = mode;
    const dd = document.getElementById('app-selector-dropdown');
    if (dd) dd.classList.add('hidden');

    ['diet', 'workout', 'recovery', 'gear', 'docs'].forEach(m => {
        const nav = document.getElementById(`${m}-nav`);
        const act = document.getElementById(`${m}-actions`);
        if (nav) nav.classList.toggle('hidden', m !== mode);
        if (act) act.classList.toggle('hidden', m !== mode);
    });

    document.getElementById('tab-planner').classList.add('hidden');
    document.getElementById('tab-month-diet').classList.add('hidden');
    document.getElementById('tab-library').classList.add('hidden');
    document.getElementById('tab-workout-planner').classList.add('hidden');
    document.getElementById('tab-month-workout').classList.add('hidden');
    document.getElementById('tab-workout-programs').classList.add('hidden');
    document.getElementById('tab-workout-exercises').classList.add('hidden');
    document.getElementById('tab-recovery-planner').classList.add('hidden');
    document.getElementById('tab-month-recovery').classList.add('hidden');
    document.getElementById('tab-recovery-routines').classList.add('hidden');
    document.getElementById('tab-gear').classList.add('hidden');
    document.getElementById('tab-docs').classList.add('hidden');

    const logoBg = document.getElementById('app-logo-bg');
    const logoIcon = document.getElementById('app-logo-icon');
    const title = document.getElementById('app-title');
    const sub = document.getElementById('app-subtitle');

    if (mode === 'diet') {
        if (logoBg) logoBg.className = "w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-brand-500/20 transition-all duration-300";
        if (logoIcon) logoIcon.className = "fa-solid fa-utensils text-slate-950";
        if (title) title.textContent = "FitPlan Pro";
        if (sub) { sub.textContent = window.t('dietSubtitle'); sub.className = "text-xs text-brand-600 dark:text-brand-400 font-medium transition-colors"; }
        window.switchTab('planner');
    } else if (mode === 'workout') {
        if (logoBg) logoBg.className = "w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-bluebrand-500/20 transition-all duration-300";
        if (logoIcon) logoIcon.className = "fa-solid fa-person-running text-slate-950";
        if (title) title.textContent = window.t('menuWorkout');
        if (sub) { sub.textContent = window.t('workoutSubtitle'); sub.className = "text-xs text-bluebrand-600 dark:text-bluebrand-400 font-medium transition-colors"; }
        window.switchWorkoutTab('planner');
    } else if (mode === 'recovery') {
        if (logoBg) logoBg.className = "w-10 h-10 rounded-xl bg-gradient-to-tr from-purplebrand-600 to-fuchsia-400 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-purplebrand-500/20 transition-all duration-300";
        if (logoIcon) logoIcon.className = "fa-solid fa-shield-halved text-white";
        if (title) title.textContent = window.t('menuRecovery');
        if (sub) { sub.textContent = window.t('recoverySubtitle'); sub.className = "text-xs text-purplebrand-600 dark:text-purplebrand-400 font-medium transition-colors"; }
        window.switchRecoveryTab('planner');
    } else if (mode === 'gear') {
        if (logoBg) logoBg.className = "w-10 h-10 rounded-xl bg-gradient-to-tr from-orangebrand-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-orangebrand-500/20 transition-all duration-300";
        if (logoIcon) logoIcon.className = "fa-solid fa-toolbox text-slate-950";
        if (title) title.textContent = window.t('menuGear');
        if (sub) { sub.textContent = window.t('gearSubtitle'); sub.className = "text-xs text-orangebrand-600 dark:text-orangebrand-400 font-medium transition-colors"; }
        document.getElementById('tab-gear').classList.remove('hidden');
        window.renderGearLibrary();
    } else if (mode === 'docs') {
        if (logoBg) logoBg.className = "w-10 h-10 rounded-xl bg-gradient-to-tr from-redbrand-600 to-rose-400 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-redbrand-500/20 transition-all duration-300";
        if (logoIcon) logoIcon.className = "fa-solid fa-file-lines text-white";
        if (title) title.textContent = window.t('menuDocs');
        if (sub) { sub.textContent = window.t('docsSubtitle'); sub.className = "text-xs text-redbrand-600 dark:text-redbrand-400 font-medium transition-colors"; }
        document.getElementById('tab-docs').classList.remove('hidden');
        window.renderDocuments();
    }
};

window.toggleAppMenu = function(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('app-selector-dropdown');
    if (dd) dd.classList.toggle('hidden');
};