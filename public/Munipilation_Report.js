// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-app.js";
import {
    getDatabase,
    ref,
    get,
    set,
    remove,
} from "https://www.gstatic.com/firebasejs/10.3.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnKRhT5xJTBvsQKpW7e9w-hGSbAQJWTSo",
    authDomain: "production1-ae85.firebaseapp.com",
    projectId: "production1-ae85",
    storageBucket: "production1-ae85.firebasestorage.app",
    messagingSenderId: "490438031865",
    appId: "1:490438031865:web:a4a69335989f30cd13a528",
    measurementId: "G-W3TZ1EKWWN",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Global Variables
let isLoading = false;

// DOM Elements
const mnameInput = document.getElementById("mname");
const mnoInput = document.getElementById("mno");
const mcoInput = document.getElementById("mco");
const notesInput = document.getElementById("notes");
const tableBody = document.getElementById("tableBody");
const totalKWSpan = document.getElementById("totalKW");
const totalHPSpan = document.getElementById("totalHP");
const totalAmpsSpan = document.getElementById("totalAmps");
const phaseMode = document.getElementById("phase_mode");
const countInput = document.getElementById("count");
const pfInput = document.getElementById("newItemPF");
const ampInput = document.getElementById("newItemA");
const wattInput = document.getElementById("newItemW");
const hpInput = document.getElementById("newItemHP");
const loadNameInput = document.getElementById("newItemName");
const btnSave = document.getElementById("btnSave");
const btnReport = document.getElementById("reportMainBtn");
const btnAddLoad = document.getElementById("btnAddLoad");
const resetBtn = document.getElementById("resetBtn");

// Store photos per load
let loadPhotos = {};

// ========== Loading Functions ==========
function showLoading(message = "جاري المعالجة...") {
    if (isLoading) return;
    isLoading = true;

    const allButtons = [btnSave, btnReport, btnAddLoad, resetBtn];
    const allInputs = [mnameInput, mnoInput, mcoInput, notesInput, phaseMode, countInput, pfInput, ampInput, wattInput, hpInput, loadNameInput];

    allButtons.forEach(btn => { if (btn) { btn.disabled = true; btn.style.opacity = "0.6"; } });
    allInputs.forEach(input => { if (input) { input.disabled = true; input.style.opacity = "0.6"; } });

    Swal.fire({
        title: message,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        showConfirmButton: false,
        backdrop: true
    });
}

function hideLoading() {
    if (!isLoading) return;
    isLoading = false;

    const allButtons = [btnSave, btnReport, btnAddLoad, resetBtn];
    const allInputs = [mnameInput, mnoInput, mcoInput, notesInput, phaseMode, countInput, pfInput, ampInput, wattInput, hpInput, loadNameInput];

    allButtons.forEach(btn => { if (btn) { btn.disabled = false; btn.style.opacity = "1"; } });
    allInputs.forEach(input => { if (input) { input.disabled = false; input.style.opacity = "1"; } });

    Swal.close();
}

// ========== Electrical Calculation Functions ==========
function calculateWattsAndHpFromAmps(amps, pf, mode) {
    const V = mode === "3" ? 380 : 220;
    const factor = mode === "3" ? Math.sqrt(3) : 1;
    const watts = factor * V * amps * pf;
    const hp = watts / 746;
    return { watts, hp };
}

function calculateAmpsAndHpFromWatts(watts, pf, mode) {
    const V = mode === "3" ? 380 : 220;
    const factor = mode === "3" ? Math.sqrt(3) : 1;
    const amps = watts / (factor * V * pf);
    const hp = watts / 746;
    return { amps, hp };
}

function calculateWattsAndAmpsFromHp(hp, pf, mode) {
    const watts = hp * 746;
    const V = mode === "3" ? 380 : 220;
    const factor = mode === "3" ? Math.sqrt(3) : 1;
    const amps = watts / (factor * V * pf);
    return { watts, amps };
}

// Update input fields based on which one changed
function updateFromWatts() {
    let watts = parseFloat(wattInput.value) || 0;
    let pf = parseFloat(pfInput.value) || 0.92;
    let mode = phaseMode.value;
    if (pf <= 0) pf = 0.92;

    if (watts > 0) {
        const { amps, hp } = calculateAmpsAndHpFromWatts(watts, pf, mode);
        hpInput.value = hp.toFixed(3);
        ampInput.value = amps.toFixed(2);
    } else {
        hpInput.value = "";
        ampInput.value = "";
    }
}

function updateFromHP() {
    let hpVal = parseFloat(hpInput.value) || 0;
    let pf = parseFloat(pfInput.value) || 0.92;
    let mode = phaseMode.value;
    if (pf <= 0) pf = 0.92;

    if (hpVal > 0) {
        const { watts, amps } = calculateWattsAndAmpsFromHp(hpVal, pf, mode);
        wattInput.value = watts.toFixed(0);
        ampInput.value = amps.toFixed(2);
    } else {
        wattInput.value = "";
        ampInput.value = "";
    }
}

function updateFromAmps() {
    let amps = parseFloat(ampInput.value) || 0;
    let pf = parseFloat(pfInput.value) || 0.92;
    let mode = phaseMode.value;
    if (pf <= 0) pf = 0.92;

    if (amps > 0) {
        const { watts, hp } = calculateWattsAndHpFromAmps(amps, pf, mode);
        wattInput.value = watts.toFixed(0);
        hpInput.value = hp.toFixed(3);
    } else {
        wattInput.value = "";
        hpInput.value = "";
    }
}

// Event listeners for real-time calculation
wattInput.addEventListener("input", updateFromWatts);
hpInput.addEventListener("input", updateFromHP);
ampInput.addEventListener("input", updateFromAmps);
phaseMode.addEventListener("change", () => {
    if (wattInput.value && parseFloat(wattInput.value) > 0) updateFromWatts();
    else if (ampInput.value && parseFloat(ampInput.value) > 0) updateFromAmps();
    else if (hpInput.value && parseFloat(hpInput.value) > 0) updateFromHP();
});
pfInput.addEventListener("change", () => {
    if (wattInput.value && parseFloat(wattInput.value) > 0) updateFromWatts();
    else if (ampInput.value && parseFloat(ampInput.value) > 0) updateFromAmps();
    else if (hpInput.value && parseFloat(hpInput.value) > 0) updateFromHP();
});

// ========== Calculate Row Totals ==========
function calculateRowTotals(count, watts, hp, amps) {
    const totalWatts = (watts || 0) * (count || 1);
    const totalHP = (hp || 0) * (count || 1);
    const totalAmps = (amps || 0) * (count || 1);
    const totalKW = totalWatts / 1000;
    return { totalWatts, totalHP, totalAmps, totalKW };
}

// ========== Update Total Calculations ==========
function updateTotals() {
    let totalKW = 0;
    let totalHP = 0;
    let totalAmps = 0;

    for (let row of tableBody.rows) {
        const kwCell = row.cells[5];
        const hpCell = row.cells[6];
        const ampsCell = row.cells[4];

        if (kwCell && kwCell.innerText) totalKW += parseFloat(kwCell.innerText) || 0;
        if (hpCell && hpCell.innerText) totalHP += parseFloat(hpCell.innerText) || 0;
        if (ampsCell && ampsCell.innerText) totalAmps += parseFloat(ampsCell.innerText) || 0;
    }

    totalKWSpan.innerText = totalKW.toFixed(2);
    totalHPSpan.innerText = totalHP.toFixed(2);
    totalAmpsSpan.innerText = totalAmps.toFixed(2);
}

// ========== Update Photo Preview in Row ==========
function updatePhotoPreview(row, loadName) {
    const photos = loadPhotos[loadName] || [];
    const photoCell = row.cells[7];

    if (photos.length > 0) {
        let thumbsHtml = '<div class="photo-preview">';
        photos.slice(0, 3).forEach((photo, idx) => {
            thumbsHtml += `<img src="${photo}" class="photo-thumb" onclick="event.stopPropagation(); window.enlargeImage('${photo}')" title="صورة ${idx + 1}">`;
        });
        if (photos.length > 3) {
            thumbsHtml += `<span style="font-size:9px; color:#666;">+${photos.length - 3}</span>`;
        }
        thumbsHtml += '</div>';
        photoCell.innerHTML = thumbsHtml;
    } else {
        photoCell.innerHTML = '<span style="color:#aaa; font-size:9px;">لا صور</span>';
    }
}

// ========== Add Load Row ==========
function addLoadToTable(description, count, wattsPerUnit, hpPerUnit, ampsPerUnit) {
    const { totalWatts, totalHP, totalAmps, totalKW } = calculateRowTotals(count, wattsPerUnit, hpPerUnit, ampsPerUnit);

    const row = tableBody.insertRow();
    row.insertCell(0).innerText = description;
    row.insertCell(1).innerText = count;
    row.insertCell(2).innerText = wattsPerUnit || 0;
    row.insertCell(3).innerText = hpPerUnit ? hpPerUnit.toFixed(3) : 0;
    row.insertCell(4).innerText = totalAmps.toFixed(2);
    row.insertCell(5).innerText = totalKW.toFixed(3);
    row.insertCell(6).innerText = totalHP.toFixed(3);

    const photoCell = row.insertCell(7);
    photoCell.style.minWidth = "65px";
    updatePhotoPreview(row, description);

    const actionCell = row.insertCell(8);
    actionCell.style.whiteSpace = "nowrap";
    actionCell.innerHTML = `
        <button class="btn-camera-row" style="background:#2c9cd4; color:white; border:none; padding:3px 6px; border-radius:12px; margin:0 1px; cursor:pointer; font-size:10px;">
            <i class="fas fa-camera"></i>
        </button>
        <button class="btn-delete-row" style="background:#e1573c; color:white; border:none; padding:3px 6px; border-radius:12px; margin:0 1px; cursor:pointer; font-size:10px;">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;

    const cameraBtn = actionCell.querySelector('.btn-camera-row');
    const delBtn = actionCell.querySelector('.btn-delete-row');

    cameraBtn.onclick = () => uploadPhotoForLoad(description, row);
    delBtn.onclick = () => {
        delete loadPhotos[description];
        row.remove();
        updateTotals();
    };

    updateTotals();
}

// Upload photo for specific load
async function uploadPhotoForLoad(loadName, row) {
    if (isLoading) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;

    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        showLoading(`جاري رفع ${files.length} صورة...`);

        const newPhotos = [];
        for (const file of files) {
            const base64 = await compressImage(file);
            newPhotos.push(base64);
        }

        if (!loadPhotos[loadName]) loadPhotos[loadName] = [];
        loadPhotos[loadName] = [...loadPhotos[loadName], ...newPhotos];

        updatePhotoPreview(row, loadName);

        hideLoading();
        await Swal.fire("تم الرفع", `تم إضافة ${newPhotos.length} صورة للحمل "${loadName}"`, "success", { timer: 1500, showConfirmButton: false });
    };

    input.click();
}

// Compress image
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;
                const maxDimension = 600;

                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height * maxDimension) / width;
                        width = maxDimension;
                    } else {
                        width = (width * maxDimension) / height;
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.7;
                let base64 = canvas.toDataURL("image/jpeg", quality);

                resolve(base64);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Enlarge image function
window.enlargeImage = (imageSrc) => {
    Swal.fire({
        imageUrl: imageSrc,
        imageAlt: "الصورة",
        showCloseButton: true,
        showConfirmButton: false,
        width: "auto",
        background: "rgba(0,0,0,0.9)",
        imageWidth: "80%",
        imageHeight: "auto"
    });
};

btnAddLoad.onclick = () => {
    if (isLoading) return;

    const description = loadNameInput.value.trim();
    const count = parseInt(countInput.value) || 1;
    const watts = parseFloat(wattInput.value) || 0;
    const hp = parseFloat(hpInput.value) || 0;
    const amps = parseFloat(ampInput.value) || 0;

    if (!description) {
        Swal.fire("تنبيه", "يرجى إدخال وصف الحمل", "warning");
        return;
    }

    if (watts === 0 && amps === 0 && hp === 0) {
        Swal.fire("تنبيه", "أدخل الوات أو الأمبير أو الحصان", "info");
        return;
    }

    addLoadToTable(description, count, watts, hp, amps);

    loadNameInput.value = "";
    countInput.value = "1";
    wattInput.value = "";
    hpInput.value = "";
    ampInput.value = "";
};

// ========== Get Current Loads for Saving ==========
function getCurrentLoads() {
    const loads = [];
    for (let row of tableBody.rows) {
        loads.push({
            item: row.cells[0].innerText,
            count: row.cells[1].innerText,
            watts: row.cells[2].innerText,
            hp: row.cells[3].innerText,
            amps: row.cells[4].innerText,
            totalKW: row.cells[5].innerText,
            totalHP: row.cells[6].innerText
        });
    }
    return loads;
}

// ========== Save to Firebase ==========
btnSave.onclick = async () => {
    if (isLoading) return;

    const meterNo = mnoInput.value.trim();
    const name = mnameInput.value.trim();
    const code = mcoInput.value.trim();

    if (!meterNo) {
        await Swal.fire("خطأ", "رقم العداد مطلوب", "error");
        return;
    }

    if (!name) {
        await Swal.fire("خطأ", "اسم المشترك مطلوب", "error");
        return;
    }

    showLoading("جاري الحفظ...");

    try {
        const loads = getCurrentLoads();
        
        // Calculate totals
        let totalKW = 0, totalHP = 0, totalAmps = 0;
        for (const load of loads) {
            totalKW += parseFloat(load.totalKW) || 0;
            totalHP += parseFloat(load.totalHP) || 0;
            totalAmps += (parseFloat(load.amps) || 0) * (parseFloat(load.count) || 1);
        }

        const dataToSave = {
            name: name,
            meter_no: meterNo,
            code: code || "",
            description: notesInput.value || "",
            loads: loads,
            photos: loadPhotos,
            totalKW: totalKW.toFixed(2),
            totalHP: totalHP.toFixed(2),
            totalAmps: totalAmps.toFixed(2),
            lastUpdated: new Date().toISOString(),
        };

        await set(ref(db, `Munipilation/${meterNo}`), dataToSave);

        hideLoading();
        await Swal.fire({ title: "تم الحفظ", text: "تم حفظ البيانات بنجاح", icon: "success", timer: 1500, showConfirmButton: false });
    } catch (e) {
        hideLoading();
        await Swal.fire("خطأ", e.message, "error");
    }
};

function resetForm() {
    mnameInput.value = "";
    mnoInput.value = "";
    mcoInput.value = "";
    notesInput.value = "";
    tableBody.innerHTML = "";
    loadPhotos = {};
    updateTotals();
}

// ========== Load Data to Main Form ==========
async function loadDataToMainForm(meterNo) {
    try {
        const snap = await get(ref(db, `Munipilation/${meterNo}`));
        const data = snap.val();

        if (data) {
            resetForm();

            mnameInput.value = data.name || "";
            mnoInput.value = data.meter_no || "";
            mcoInput.value = data.code || "";
            notesInput.value = data.description || "";

            if (data.loads && Array.isArray(data.loads) && data.loads.length > 0) {
                for (const load of data.loads) {
                    addLoadToTable(
                        load.item,
                        parseFloat(load.count) || 1,
                        parseFloat(load.watts) || 0,
                        parseFloat(load.hp) || 0,
                        parseFloat(load.amps) || 0
                    );
                }
                updateTotals();
            }

            if (data.photos && typeof data.photos === 'object') {
                loadPhotos = JSON.parse(JSON.stringify(data.photos));
                for (let i = 0; i < tableBody.rows.length; i++) {
                    const row = tableBody.rows[i];
                    const loadName = row.cells[0].innerText;
                    updatePhotoPreview(row, loadName);
                }
            }
        }
        return data;
    } catch (error) {
        console.error("Error loading to main form:", error);
        return null;
    }
}

// ========== View Full Record ==========
window.viewFullRecord = async (meterNo) => {
    showLoading("جاري التحميل...");

    try {
        const snap = await get(ref(db, `Munipilation/${meterNo}`));
        const data = snap.val();
        hideLoading();

        if (!data) {
            await Swal.fire("خطأ", "لم يتم العثور على البيانات", "error");
            return;
        }

        let loadsHtml = `
            <div style="overflow-x:auto; margin-bottom:20px;">
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <thead><tr style="background:#0b2b40; color:white;">
                        <th style="padding:8px;">وصف الحمل</th>
                        <th style="padding:8px;">العدد</th>
                        <th style="padding:8px;">وات</th>
                        <th style="padding:8px;">حصان</th>
                        <th style="padding:8px;">أمبير</th>
                        <th style="padding:8px;">إجمالي ك.وات</th>
                        <th style="padding:8px;">إجمالي حصان</th>
                        <th style="padding:8px;">الصور</th>
                    </tr></thead><tbody>
        `;

        const photos = data.photos || {};

        if (data.loads && Array.isArray(data.loads) && data.loads.length > 0) {
            data.loads.forEach(load => {
                const loadPhotosList = photos[load.item] || [];
                let photosHtml = '<div style="display:flex; gap:5px; flex-wrap:wrap;">';
                loadPhotosList.slice(0, 2).forEach(photo => {
                    photosHtml += `<img src="${photo}" style="width:30px; height:30px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="window.enlargeImage('${photo}')">`;
                });
                if (loadPhotosList.length > 2) photosHtml += `<span style="font-size:10px;">+${loadPhotosList.length - 2}</span>`;
                photosHtml += '</div>';

                loadsHtml += `<tr style="border-bottom:1px solid #ddd;">
                    <td style="padding:6px;">${escapeHtml(load.item)}</td>
                    <td style="padding:6px;">${load.count || 1}</td>
                    <td style="padding:6px;">${load.watts || 0}</td>
                    <td style="padding:6px;">${load.hp || 0}</td>
                    <td style="padding:6px;">${load.amps || 0}</td>
                    <td style="padding:6px;">${load.totalKW || 0}</td>
                    <td style="padding:6px;">${load.totalHP || 0}</td>
                    <td style="padding:6px;">${photosHtml}</td>
                 </tr>`;
            });
        }

        loadsHtml += `<tfoot><tr style="background:#eef2f5; font-weight:bold;">
            <td colspan="5">الإجمالي</td>
            <td>${data.totalKW || 0}</td>
            <td>${data.totalHP || 0}</td>
            <td>${data.totalAmps || 0} A</td>
         </tr></tfoot></table></div>`;

        await Swal.fire({
            title: `📋 بيانات المشترك: ${escapeHtml(data.name)}`,
            html: `<div style="text-align:right; max-height:550px; overflow-y:auto;">
                <p><strong>رقم العداد:</strong> ${escapeHtml(data.meter_no || "-")}</p>
                <p><strong>كود المشترك:</strong> ${escapeHtml(data.code || "-")}</p>
                <p><strong>الملاحظات:</strong> ${escapeHtml(data.description || "-")}</p>
                ${loadsHtml}
            </div>`,
            width: "1100px",
            showConfirmButton: true,
            confirmButtonText: "إغلاق",
        });
    } catch (error) {
        hideLoading();
        await Swal.fire("خطأ", "فشل تحميل البيانات", "error");
    }
};

// ========== Calculate Edit Row Total (for edit modal) - Auto calculation like main page ==========
function calculateEditRowTotal(row) {
    const count = parseFloat(row.querySelector('.edit-count')?.value) || 1;
    let watts = parseFloat(row.querySelector('.edit-watts')?.value) || 0;
    let hp = parseFloat(row.querySelector('.edit-hp')?.value) || 0;
    let amps = parseFloat(row.querySelector('.edit-amps')?.value) || 0;

    const pf = 0.92;
    const mode = "3";
    const V = mode === "3" ? 380 : 220;
    const factor = mode === "3" ? Math.sqrt(3) : 1;

    // Auto-calculate based on which field was edited (same logic as main page)
    // Check which field has a value and calculate the others
    if (watts > 0 && (hp === 0 || amps === 0)) {
        // Calculate from watts
        if (hp === 0) {
            const calculatedHp = watts / 746;
            row.querySelector('.edit-hp').value = calculatedHp.toFixed(3);
            hp = calculatedHp;
        }
        if (amps === 0) {
            const calculatedAmps = watts / (factor * V * pf);
            row.querySelector('.edit-amps').value = calculatedAmps.toFixed(2);
            amps = calculatedAmps;
        }
    } else if (hp > 0 && (watts === 0 || amps === 0)) {
        // Calculate from HP
        if (watts === 0) {
            const calculatedWatts = hp * 746;
            row.querySelector('.edit-watts').value = calculatedWatts.toFixed(0);
            watts = calculatedWatts;
        }
        if (amps === 0) {
            const calculatedWatts = hp * 746;
            const calculatedAmps = calculatedWatts / (factor * V * pf);
            row.querySelector('.edit-amps').value = calculatedAmps.toFixed(2);
            amps = calculatedAmps;
        }
    } else if (amps > 0 && (watts === 0 || hp === 0)) {
        // Calculate from Amps
        const calculatedWatts = factor * V * amps * pf;
        const calculatedHp = calculatedWatts / 746;
        if (watts === 0) {
            row.querySelector('.edit-watts').value = calculatedWatts.toFixed(0);
            watts = calculatedWatts;
        }
        if (hp === 0) {
            row.querySelector('.edit-hp').value = calculatedHp.toFixed(3);
            hp = calculatedHp;
        }
    }

    // Calculate totals
    const totalWatts = watts * count;
    const totalHP = hp * count;
    const totalKW = totalWatts / 1000;

    const totalKwCell = row.querySelector('.total-kw');
    const totalHpCell = row.querySelector('.total-hp');
    if (totalKwCell) totalKwCell.innerText = totalKW.toFixed(3);
    if (totalHpCell) totalHpCell.innerText = totalHP.toFixed(3);
}

// ========== Edit Full Record ==========
window.editFullRecord = async (meterNo) => {
    showLoading("جاري التحميل...");

    try {
        const snap = await get(ref(db, `Munipilation/${meterNo}`));
        const data = snap.val();
        hideLoading();

        if (!data) {
            await Swal.fire("خطأ", "لم يتم العثور على البيانات", "error");
            return;
        }

        const currentPhotos = data.photos || {};

        let editHtml = `
            <div style="margin-bottom:20px;">
                <h4 style="margin-bottom:10px;">بيانات المشترك</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
                    <div>
                        <label style="display:block; font-size:12px; margin-bottom:5px;">اسم المشترك</label>
                        <input type="text" id="editName" value="${escapeHtml(data.name || '')}" style="width:100%; padding:6px; border-radius:8px; border:1px solid #ddd;">
                    </div>
                    <div>
                        <label style="display:block; font-size:12px; margin-bottom:5px;">رقم العداد</label>
                        <input type="text" id="editMeterNo" value="${escapeHtml(data.meter_no || '')}" style="width:100%; padding:6px; border-radius:8px; border:1px solid #ddd;">
                    </div>
                    <div>
                        <label style="display:block; font-size:12px; margin-bottom:5px;">كود المشترك</label>
                        <input type="text" id="editCode" value="${escapeHtml(data.code || '')}" style="width:100%; padding:6px; border-radius:8px; border:1px solid #ddd;">
                    </div>
                    <div>
                        <label style="display:block; font-size:12px; margin-bottom:5px;">ملاحظات إضافية</label>
                        <input type="text" id="editNotes" value="${escapeHtml(data.description || '')}" style="width:100%; padding:6px; border-radius:8px; border:1px solid #ddd;">
                    </div>
                </div>
                <h4 style="margin-bottom:10px;">قائمة الأحمال</h4>
                <div style="max-height:400px; overflow-y:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:12px;">
                        <thead>
                            <tr style="background:#0b2b40; color:white; position:sticky; top:0;">
                                <th style="padding:6px;">وصف الحمل</th>
                                <th style="padding:6px;">العدد</th>
                                <th style="padding:6px;">وات</th>
                                <th style="padding:6px;">حصان</th>
                                <th style="padding:6px;">أمبير</th>
                                <th style="padding:6px;">إجمالي ك.وات</th>
                                <th style="padding:6px;">إجمالي حصان</th>
                                <th style="padding:6px;">الصور</th>
                                <th style="padding:6px;">حذف</th>
                             </tr>
                        </thead>
                        <tbody id="editTableBody">
        `;

        if (data.loads && Array.isArray(data.loads)) {
            data.loads.forEach((load, idx) => {
                const loadPhotosList = currentPhotos[load.item] || [];
                let photosHtml = '<div style="display:flex; gap:4px; flex-wrap:wrap;">';
                loadPhotosList.forEach((photo, pIdx) => {
                    photosHtml += `
                        <div style="position:relative; display:inline-block;">
                            <img src="${photo}" style="width:30px; height:30px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="window.enlargeImage('${photo}')">
                            <button onclick="window.removePhotoFromEdit('${meterNo}', '${escapeHtml(load.item)}', ${pIdx})" style="position:absolute; top:-4px; right:-4px; background:#e1573c; color:white; border:none; border-radius:50%; width:14px; height:14px; font-size:9px; cursor:pointer;">✕</button>
                        </div>
                    `;
                });
                photosHtml += `<button onclick="window.addPhotoToEdit('${meterNo}', '${escapeHtml(load.item)}')" style="background:#2c9cd4; color:white; border:none; padding:2px 5px; border-radius:10px; font-size:9px; margin-top:3px; cursor:pointer;"><i class="fas fa-plus"></i> إضافة</button>`;

                editHtml += `
                    <tr data-loadname="${escapeHtml(load.item)}" data-idx="${idx}">
                        <td style="padding:4px;"><strong>${escapeHtml(load.item)}</strong></td>
                        <td style="padding:4px;"><input type="number" class="edit-count" value="${load.count || 1}" style="width:55px; padding:3px; border-radius:4px; border:1px solid #ddd; text-align:center; font-size:11px;"></td>
                        <td style="padding:4px;"><input type="number" class="edit-watts" value="${load.watts || 0}" style="width:70px; padding:3px; border-radius:4px; border:1px solid #ddd; text-align:center; font-size:11px;"></td>
                        <td style="padding:4px;"><input type="number" class="edit-hp" value="${load.hp || 0}" style="width:70px; padding:3px; border-radius:4px; border:1px solid #ddd; text-align:center; font-size:11px;"></td>
                        <td style="padding:4px;"><input type="number" class="edit-amps" value="${load.amps || 0}" style="width:70px; padding:3px; border-radius:4px; border:1px solid #ddd; text-align:center; font-size:11px;"></td>
                        <td class="total-kw" style="padding:4px; font-size:11px;">${load.totalKW || 0}</td>
                        <td class="total-hp" style="padding:4px; font-size:11px;">${load.totalHP || 0}</td>
                        <td style="padding:4px; min-width:90px;">${photosHtml}</td>
                        <td style="padding:4px;"><button onclick="window.removeEditRow(this, '${meterNo}', '${escapeHtml(load.item)}')" style="background:#e1573c; color:white; border:none; padding:2px 6px; border-radius:10px; cursor:pointer; font-size:9px;">✕</button></td>
                    </tr>
                `;
            });
        }

        editHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        const result = await Swal.fire({
            title: `تعديل البيانات - ${escapeHtml(data.name)}`,
            html: editHtml,
            width: "1200px",
            showConfirmButton: true,
            showCancelButton: true,
            confirmButtonText: "حفظ التعديلات",
            cancelButtonText: "إلغاء",
            preConfirm: async () => {
                return await saveFullEditedData(meterNo);
            }
        });

        if (result.isConfirmed && result.value !== false) {
            // Success already handled
        }

        // Add event listeners for auto-calculation after modal is open
        setTimeout(() => {
            const editTableBody = document.getElementById('editTableBody');
            if (editTableBody) {
                const inputs = editTableBody.querySelectorAll('.edit-count, .edit-watts, .edit-hp, .edit-amps');
                inputs.forEach(input => {
                    input.addEventListener('input', function () {
                        const row = this.closest('tr');
                        calculateEditRowTotal(row);
                    });
                });
                // Initialize all row totals
                editTableBody.querySelectorAll('tr').forEach(row => {
                    calculateEditRowTotal(row);
                });
            }
        }, 100);

    } catch (error) {
        hideLoading();
        await Swal.fire("خطأ", "فشل تحميل البيانات", "error");
    }
};

// Remove edit row and its photos
window.removeEditRow = async (btn, meterNo, loadName) => {
    const result = await Swal.fire({
        title: "تأكيد الحذف",
        text: `هل أنت متأكد من حذف الحمل "${loadName}" وجميع صوره؟`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "نعم، حذف",
        cancelButtonText: "إلغاء",
        confirmButtonColor: "#e1573c"
    });

    if (result.isConfirmed) {
        const row = btn.closest('tr');

        try {
            const snap = await get(ref(db, `Munipilation/${meterNo}`));
            const data = snap.val();
            if (data && data.photos && data.photos[loadName]) {
                delete data.photos[loadName];
                await set(ref(db, `Munipilation/${meterNo}`), data);
            }
        } catch (error) {
            console.error("Error removing photos:", error);
        }

        if (row) row.remove();
        await Swal.fire("تم الحذف", `تم حذف الحمل "${loadName}"`, "success", { timer: 1500, showConfirmButton: false });
    }
};

// Remove photo from edit
window.removePhotoFromEdit = async (meterNo, loadName, photoIndex) => {
    const result = await Swal.fire({
        title: "تأكيد الحذف",
        text: "هل أنت متأكد من حذف هذه الصورة؟",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "حذف",
        cancelButtonText: "إلغاء"
    });

    if (result.isConfirmed) {
        showLoading("جاري الحذف...");
        try {
            const snap = await get(ref(db, `Munipilation/${meterNo}`));
            const data = snap.val();
            if (data && data.photos && data.photos[loadName]) {
                data.photos[loadName].splice(photoIndex, 1);
                if (data.photos[loadName].length === 0) {
                    delete data.photos[loadName];
                }
                await set(ref(db, `Munipilation/${meterNo}`), data);
                hideLoading();
                await Swal.fire("تم الحذف", "", "success", { timer: 1000, showConfirmButton: false });
                await window.editFullRecord(meterNo);
            } else {
                hideLoading();
            }
        } catch (error) {
            hideLoading();
            await Swal.fire("خطأ", "فشل حذف الصورة", "error");
        }
    }
};

// Add photo to edit
window.addPhotoToEdit = async (meterNo, loadName) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;

    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        showLoading(`جاري رفع ${files.length} صورة...`);

        const newPhotos = [];
        for (const file of files) {
            const base64 = await compressImage(file);
            newPhotos.push(base64);
        }

        const snap = await get(ref(db, `Munipilation/${meterNo}`));
        const data = snap.val();
        if (!data.photos) data.photos = {};
        if (!data.photos[loadName]) data.photos[loadName] = [];
        data.photos[loadName] = [...data.photos[loadName], ...newPhotos];
        await set(ref(db, `Munipilation/${meterNo}`), data);

        hideLoading();
        await Swal.fire("تم الرفع", `تم إضافة ${newPhotos.length} صورة`, "success", { timer: 1500, showConfirmButton: false });
        await window.editFullRecord(meterNo);
    };

    input.click();
};

// Save full edited data - preserves photos structure correctly
async function saveFullEditedData(meterNo) {
    showLoading("جاري الحفظ...");

    try {
        const newName = document.getElementById('editName')?.value || "";
        const newMeterNo = document.getElementById('editMeterNo')?.value || "";
        const newCode = document.getElementById('editCode')?.value || "";
        const newDescription = document.getElementById('editNotes')?.value || "";

        const rows = document.querySelectorAll('#editTableBody tr');
        const loads = [];
        let totalKWSum = 0;
        let totalHPSum = 0;
        let totalAmpsSum = 0;

        // Get existing photos from Firebase to preserve them
        const snap = await get(ref(db, `Munipilation/${meterNo}`));
        const currentData = snap.val();
        let photos = currentData?.photos || {};

        for (const row of rows) {
            const item = row.cells[0]?.innerText?.trim();
            if (!item) continue;

            const count = parseFloat(row.querySelector('.edit-count')?.value) || 1;
            const watts = parseFloat(row.querySelector('.edit-watts')?.value) || 0;
            const hp = parseFloat(row.querySelector('.edit-hp')?.value) || 0;
            const amps = parseFloat(row.querySelector('.edit-amps')?.value) || 0;

            const totalWatts = watts * count;
            const totalHP = hp * count;
            const totalAmpsLoad = amps * count;
            const totalKW = totalWatts / 1000;

            totalKWSum += totalKW;
            totalHPSum += totalHP;
            totalAmpsSum += totalAmpsLoad;

            loads.push({
                item: item,
                count: count.toString(),
                watts: watts.toString(),
                hp: hp.toString(),
                amps: amps.toString(),
                totalKW: totalKW.toFixed(3),
                totalHP: totalHP.toFixed(3)
            });

            // If photos for this load don't exist in photos object, create empty array
            if (!photos[item]) {
                photos[item] = [];
            }
        }

        // Remove photos for loads that no longer exist
        const existingLoadNames = loads.map(l => l.item);
        Object.keys(photos).forEach(photoKey => {
            if (!existingLoadNames.includes(photoKey)) {
                delete photos[photoKey];
            }
        });

        const dataToSave = {
            name: newName,
            meter_no: newMeterNo,
            code: newCode || "",
            description: newDescription || "",
            loads: loads,
            photos: photos,
            totalKW: totalKWSum.toFixed(2),
            totalHP: totalHPSum.toFixed(2),
            totalAmps: totalAmpsSum.toFixed(2),
            lastUpdated: new Date().toISOString(),
        };

        await set(ref(db, `Munipilation/${newMeterNo}`), dataToSave);

        if (newMeterNo !== meterNo) {
            await remove(ref(db, `Munipilation/${meterNo}`));
        }

        hideLoading();
        await Swal.fire("تم الحفظ", "تم تحديث البيانات بنجاح", "success", { timer: 1500, showConfirmButton: false });

        await loadDataToMainForm(newMeterNo);
        return true;

    } catch (error) {
        hideLoading();
        await Swal.fire("خطأ", "فشل حفظ التعديلات: " + error.message, "error");
        return false;
    }
}

// ========== Report ==========
btnReport.onclick = async () => {
    if (isLoading) return;

    showLoading("جاري التحميل...");

    try {
        const snapshot = await get(ref(db, "Munipilation"));
        const data = snapshot.val();
        hideLoading();

        if (!data || Object.keys(data).length === 0) {
            await Swal.fire("لا توجد بيانات", "لا يوجد مشتركين", "info");
            return;
        }

        const records = Object.entries(data).map(([key, val]) => ({ key, ...val }));

        await Swal.fire({
            title: "التقارير - إدارة المشتركين",
            html: `
                <input type="text" id="reportSearchInput" class="swal2-input" placeholder="بحث بالاسم أو رقم العداد..." style="width:90%">
                <div id="reportRecordsList" style="margin-top:15px; max-height:450px; overflow-y:auto;"></div>
            `,
            showConfirmButton: true,
            confirmButtonText: "إغلاق",
            width: "800px",
            didOpen: () => {
                const searchInput = document.getElementById("reportSearchInput");
                const container = document.getElementById("reportRecordsList");

                function renderList(searchTerm = "") {
                    const filtered = records.filter(r =>
                        (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (r.meter_no && r.meter_no.toLowerCase().includes(searchTerm.toLowerCase()))
                    );

                    if (filtered.length === 0) {
                        container.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">لا توجد نتائج</div>';
                        return;
                    }

                    container.innerHTML = filtered.map(r => `
                        <div style="border:1px solid #ddd; border-radius:10px; padding:10px; margin:8px 0; background:white;">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                                <div>
                                    <strong>${escapeHtml(r.name)}</strong><br>
                                    <small>رقم العداد: ${escapeHtml(r.meter_no)} | كود: ${escapeHtml(r.code || '-')}</small>
                                </div>
                                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                    <button onclick="window.viewFullRecord('${r.key}')" style="background:#f4b942; color:white; border:none; padding:4px 8px; border-radius:12px; cursor:pointer; font-size:10px;">
                                        <i class="fas fa-eye"></i> عرض
                                    </button>
                                    <button onclick="window.editFullRecord('${r.key}')" style="background:#2e8b57; color:white; border:none; padding:4px 8px; border-radius:12px; cursor:pointer; font-size:10px;">
                                        <i class="fas fa-edit"></i> تعديل
                                    </button>
                                    <button onclick="window.exportToExcel('${r.key}')" style="background:#2c9cd4; color:white; border:none; padding:4px 8px; border-radius:12px; cursor:pointer; font-size:10px;">
                                        <i class="fas fa-file-excel"></i> Excel
                                    </button>
                                    <button onclick="window.deleteRecord('${r.key}')" style="background:#e1573c; color:white; border:none; padding:4px 8px; border-radius:12px; cursor:pointer; font-size:10px;">
                                        <i class="fas fa-trash"></i> حذف
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join("");
                }

                if (searchInput) {
                    searchInput.addEventListener("input", (e) => renderList(e.target.value));
                }
                renderList("");
            }
        });
    } catch (error) {
        hideLoading();
        await Swal.fire("خطأ", "فشل تحميل البيانات", "error");
    }
};

// Delete record
window.deleteRecord = async (meterNo) => {
    const result = await Swal.fire({
        title: "تأكيد الحذف",
        text: "هل أنت متأكد من حذف هذا المشترك؟",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "نعم، حذف",
        cancelButtonText: "إلغاء",
        confirmButtonColor: "#e1573c"
    });

    if (result.isConfirmed) {
        showLoading("جاري الحذف...");
        try {
            await remove(ref(db, `Munipilation/${meterNo}`));
            hideLoading();
            await Swal.fire("تم الحذف", "تم حذف المشترك بنجاح", "success", { timer: 1500, showConfirmButton: false });
            btnReport.click();
        } catch (error) {
            hideLoading();
            await Swal.fire("خطأ", "فشل الحذف", "error");
        }
    }
};

// Export to Excel
window.exportToExcel = async (meterNo) => {
    showLoading("جاري التصدير...");

    try {
        const snap = await get(ref(db, `Munipilation/${meterNo}`));
        const data = snap.val();

        if (!data) {
            hideLoading();
            await Swal.fire("خطأ", "لم يتم العثور على البيانات", "error");
            return;
        }

        const rows = [
            ["تقرير بيان الأحمال الكهربائية", "", "", "", "", "", ""],
            [`الاسم: ${data.name || ""}`, "", "", "", "", "", ""],
            [`رقم العداد: ${data.meter_no || ""}`, "", "", "", "", "", ""],
            [`كود المشترك: ${data.code || ""}`, "", "", "", "", "", ""],
            [`الوصف: ${data.description || ""}`, "", "", "", "", "", ""],
            [`آخر تحديث: ${new Date().toLocaleDateString("ar-EG")}`, "", "", "", "", "", ""],
            ["", "", "", "", "", "", ""],
            ["الأحمال", "العدد", "وات", "حصان", "أمبير", "إجمالي ك.وات", "إجمالي حصان"],
        ];

        (data.loads || []).forEach((load) => {
            rows.push([
                load.item || "",
                load.count || "1",
                load.watts || "0",
                load.hp || "0",
                load.amps || "0",
                load.totalKW || "0",
                load.totalHP || "0"
            ]);
        });

        rows.push(["الإجمالي", "", "", "", "", data.totalKW || "0.00", data.totalHP || "0.00"]);
        rows.push([], ["ملاحظة: الصور محفوظة في قاعدة البيانات", "", "", "", "", ""]);

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 25 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "الأحمال");
        XLSX.writeFile(wb, `تقرير_${data.meter_no || meterNo}.xlsx`);

        hideLoading();
        await Swal.fire("تم التصدير", "تم إنشاء ملف Excel", "success", { timer: 1500, showConfirmButton: false });
    } catch (error) {
        hideLoading();
        await Swal.fire("خطأ", "فشل التصدير", "error");
    }
};

// Reset form
resetBtn.onclick = () => {
    Swal.fire({
        title: "إعادة تعيين النموذج",
        text: "سيتم مسح جميع البيانات المدخلة. هل أنت متأكد؟",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "نعم، إعادة تعيين",
        cancelButtonText: "إلغاء"
    }).then((result) => {
        if (result.isConfirmed) {
            resetForm();
            Swal.fire("تم", "تم مسح النموذج", "success", { timer: 1000, showConfirmButton: false });
        }
    });
};

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function (m) {
        if (m === "&") return "&amp;";
        if (m === "<") return "&lt;";
        if (m === ">") return "&gt;";
        return m;
    });
}

console.log("✅ Application loaded successfully!");