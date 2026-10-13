// ==============================================================
// FitPlan Pro - Firebase Auth, Firestore & Storage (js/firebase.js)
// ==============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    signInWithPopup, GoogleAuthProvider, signOut, sendPasswordResetEmail, 
    onAuthStateChanged, updateProfile 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Firebase Projekt Konfiguráció
const firebaseConfig = {
    apiKey: "AIzaSyCiT4KQNBoPI-r47zGwQVTCVV5CZBUXcJQ",
    authDomain: "zsombor-etrend.firebaseapp.com",
    projectId: "zsombor-etrend",
    storageBucket: "zsombor-etrend.firebasestorage.app",
    messagingSenderId: "487266487659",
    appId: "1:487266487659:web:bf2a366a178ffc02af102e",
    measurementId: "G-YDD1SE90LE"
};

try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);
    const googleProvider = new GoogleAuthProvider();
    let activeUnsubscribe = null;

    window.authMode = 'login'; // 'login' | 'register'

    // ==============================================================
    // 1. CLOUD STORAGE FÁJLFELTÖLTŐ MOTOR (DOKUMENTUMOKHOZ)
    // ==============================================================
    window.uploadFileToFirebaseStorage = async function(file) {
        if (!auth.currentUser) throw new Error("A feltöltéshez be kell jelentkezned!");
        const uid = auth.currentUser.uid;
        const ext = file.name.split('.').pop() || 'dat';
        const path = `felhasznalok/${uid}/doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const fileRef = ref(storage, path);
        const snapshot = await uploadBytes(fileRef, file);
        return await getDownloadURL(snapshot.ref);
    };

    // ==============================================================
    // 2. AUTHENTICATION (GOOGLE, E-MAIL, JELSZÓ & KIJELENTKEZÉS)
    // ==============================================================
    window.handleGoogleSignIn = async function() {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            console.error("Google bejelentkezési hiba:", err);
            window.showToast(err.message, 'fa-circle-exclamation', 'red');
        }
    };

    window.setAuthMode = function(mode) {
        window.authMode = mode;
        const isReg = (mode === 'register');

        const nameGroup = document.getElementById('auth-name-group');
        const confirmGroup = document.getElementById('auth-confirm-group');
        const forgotBtn = document.getElementById('auth-forgot-btn');
        const submitBtn = document.getElementById('auth-submit-btn');

        if (nameGroup) nameGroup.classList.toggle('hidden', !isReg);
        if (confirmGroup) confirmGroup.classList.toggle('hidden', !isReg);
        if (forgotBtn) forgotBtn.classList.toggle('hidden', isReg);
        if (submitBtn) submitBtn.textContent = isReg ? window.t('registerBtn') : window.t('loginBtn');

        const tabLogin = document.getElementById('auth-tab-login');
        const tabReg = document.getElementById('auth-tab-register');
        if (tabLogin && tabReg) {
            tabLogin.className = isReg
                ? "flex-1 py-1.5 rounded-lg text-xs font-bold transition text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                : "flex-1 py-1.5 rounded-lg text-xs font-bold transition bg-brand-600 text-white shadow cursor-pointer";
            tabReg.className = isReg
                ? "flex-1 py-1.5 rounded-lg text-xs font-bold transition bg-brand-600 text-white shadow cursor-pointer"
                : "flex-1 py-1.5 rounded-lg text-xs font-bold transition text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer";
        }
    };

    window.handleEmailAuth = async function(e) {
        e.preventDefault();
        const email = document.getElementById('auth-email').value.trim();
        const pass = document.getElementById('auth-password').value;
        const errBanner = document.getElementById('auth-error-banner');
        const errText = document.getElementById('auth-error-text');
        if (errBanner) errBanner.classList.add('hidden');

        try {
            if (window.authMode === 'register') {
                const passConf = document.getElementById('auth-password-confirm').value;
                if (pass !== passConf) throw new Error("A megadott jelszavak nem egyeznek!");
                const cred = await createUserWithEmailAndPassword(auth, email, pass);
                const name = document.getElementById('auth-name').value.trim();
                if (name) await updateProfile(cred.user, { displayName: name });
            } else {
                await signInWithEmailAndPassword(auth, email, pass);
            }
        } catch (err) {
            console.error("Auth hiba:", err);
            if (errBanner && errText) {
                errBanner.classList.remove('hidden');
                errText.textContent = err.message;
            }
        }
    };

    window.handlePasswordReset = async function() {
        const email = document.getElementById('auth-email').value.trim();
        if (!email) return window.showToast("Kérlek add meg az e-mail címed!", "fa-circle-exclamation", "amber");
        try {
            await sendPasswordResetEmail(auth, email);
            window.showToast("Jelszó-visszaállító e-mail elküldve!", "fa-envelope", "brand");
        } catch (err) {
            window.showToast(err.message, "fa-circle-exclamation", "red");
        }
    };

    window.handleLogout = async function() {
        window.customConfirm(window.t('confirmTitle'), "Biztosan kijelentkezel a fiókodból?", async () => {
            if (activeUnsubscribe) activeUnsubscribe();
            await signOut(auth);
            location.reload();
        });
    };

    // ==============================================================
    // 3. FIRESTORE KÉTIRÁNYÚ SZINKRON & HUROKVÉDELEM
    // ==============================================================
    let isIncomingSync = false;
    let syncDebounceTimer = null;

    onAuthStateChanged(auth, async (user) => {
        const screen = document.getElementById('auth-screen');
        const syncText = document.getElementById('sync-text');
        const syncStatus = document.getElementById('sync-status');

        if (user) {
            if (screen) screen.classList.add('hidden');
            const userRef = doc(db, 'felhasznalok', user.uid);

            if (activeUnsubscribe) activeUnsubscribe();

            // Valós idejű felhőfigyelő
            activeUnsubscribe = onSnapshot(userRef, { includeMetadataChanges: true }, (snap) => {
                // Ha a módosítás ebből a böngészőből indult, nem dolgozzuk fel újra
                if (snap.metadata.hasPendingWrites) return;

                if (snap.exists() && snap.data().payload) {
                    try {
                        isIncomingSync = true;
                        const parsed = JSON.parse(snap.data().payload);
                        if (parsed.profiles && parsed.profileData) {
                            window.profiles = parsed.profiles;
                            window.profileData = parsed.profileData;
                            // skipSave = true: nem indítunk visszamentési hurkot
                            window.switchProfile(window.currentProfileId || window.profiles[0].id, true);
                        }
                    } catch (e) {
                        console.error("Szinkronizációs beolvasási hiba:", e);
                    } finally {
                        setTimeout(() => { isIncomingSync = false; }, 400);
                    }
                }
            });

            // 600 ms-os késleltetett felhőmentő függvény
            window.syncToFirebase = function() {
                if (isIncomingSync) return;
                clearTimeout(syncDebounceTimer);
                syncDebounceTimer = setTimeout(() => {
                    const payload = JSON.stringify({
                        profiles: window.profiles,
                        profileData: window.profileData
                    });
                    setDoc(userRef, { payload, email: user.email, updatedAt: Date.now() }, { merge: true })
                        .catch(err => console.warn("Firebase mentési hiba:", err));
                }, 600);
            };

            // Zöld „Felhő Aktív” státuszjelző
            if (syncText && syncStatus) {
                syncText.textContent = 'Felhő Aktív';
                syncStatus.className = 'px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800/60';
            }
        } else {
            if (screen) screen.classList.remove('hidden');
            if (syncText && syncStatus) {
                syncText.textContent = 'Helyi';
                syncStatus.className = 'hidden sm:flex px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-950 text-slate-500 text-[10px] font-medium items-center gap-1.5 border border-slate-200 dark:border-slate-800';
            }
        }
    });

} catch (err) {
    console.error("Firebase inicializálási hiba:", err);
}