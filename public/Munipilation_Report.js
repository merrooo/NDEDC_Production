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
let currentMeterNo = null;
let editingRow = null;

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

// Store photos per load
let loadPhotos = {};

// ========== Loading Functions ==========
function showLoading(message = "جاري المعالجة...") {
    if (isLoading) return;
    isLoading = true;

    const allButtons = [btnSave, btnReport, btnAddLoad];
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

    const allButtons = [btnSave, btnReport, btnAddLoad];
    const allInputs = [mnameInput, mnoInput, mcoInput, notesInput, phaseMode, countInput, pfInput, ampInput, wattInput, hpInput, loadNameInput];

    allButtons.forEach(btn => { if (btn) { btn.disabled = false; btn.style.opacity = "1"; } });
    allInputs.forEach(input => { if (input) { input.disabled = false; input.style.opacity = "1"; } });

    Swal.close();
}

// ========== Core Electrical Calculation Functions ==========
function calculateFromAmps(amps, pf = 0.92, mode = "3") {
    const V = mode === "3" ? 380 : 220;
    const factor = mode === "3" ? Math.sqrt(3) : 1;
    const watts = factor * V * amps * pf;
    const hp = watts / 746;
    return { watts, hp, amps };
}

function calculateFromWatts(watts, pf = 0.92, mode = "3") {
    const V = mode === "3" ? 380 : 220;
    const factor = mode === "3" ? Math.sqrt(3) : 1;
    const amps = watts / (factor * V * pf);
    const hp = watts / 746;
    return { watts, amps, hp };
}

function calculateFromHP(hp, pf = 0.92, mode = "3") {
    const watts = hp * 746;
    const V = mode === "3" ? 380 : 220;
    const factor = mode === "3" ? Math.sqrt(3) : 1;
    const amps = watts / (factor * V * pf);
    return { watts, amps, hp };
}

// ========== Real-time Calculation for Input Fields (Main Form) ==========
function updateInputsFromWatts() {
    let watts = parseFloat(wattInput.value) || 0;
    let pf = parseFloat(pfInput.value) || 0.92;
    let mode = phaseMode.value;
    
    if (watts > 0) {
        const result = calculateFromWatts(watts, pf, mode);
        ampInput.value = result.amps.toFixed(2);
        hpInput.value = result.hp.toFixed(3);
    } else {
        if (ampInput.value === "" || parseFloat(ampInput.value) === 0) ampInput.value = "";
        if (hpInput.value === "" || parseFloat(hpInput.value) === 0) hpInput.value = "";
    }
}

function updateInputsFromHP() {
    let hp = parseFloat(hpInput.value) || 0;
    let pf = parseFloat(pfInput.value) || 0.92;
    let mode = phaseMode.value;
    
    if (hp > 0) {
        const result = calculateFromHP(hp, pf, mode);
        wattInput.value = result.watts.toFixed(0);
        ampInput.value = result.amps.toFixed(2);
    } else {
        if (wattInput.value === "" || parseFloat(wattInput.value) === 0) wattInput.value = "";
        if (ampInput.value === "" || parseFloat(ampInput.value) === 0) ampInput.value = "";
    }
}

function updateInputsFromAmps() {
    let amps = parseFloat(ampInput.value) || 0;
    let pf = parseFloat(pfInput.value) || 0.92;
    let mode = phaseMode.value;
    
    if (amps > 0) {
        const result = calculateFromAmps(amps, pf, mode);
        wattInput.value = result.watts.toFixed(0);
        hpInput.value = result.hp.toFixed(3);
    } else {
        if (wattInput.value === "" || parseFloat(wattInput.value) === 0) wattInput.value = "";
        if (hpInput.value === "" || parseFloat(hpInput.value) === 0) hpInput.value = "";
    }
}

// Add event listeners for real-time calculation in main form
wattInput.addEventListener('input', updateInputsFromWatts);
hpInput.addEventListener('input', updateInputsFromHP);
ampInput.addEventListener('input', updateInputsFromAmps);
phaseMode.addEventListener('change', () => {
    if (wattInput.value && parseFloat(wattInput.value) > 0) updateInputsFromWatts();
    else if (hpInput.value && parseFloat(hpInput.value) > 0) updateInputsFromHP();
    else if (ampInput.value && parseFloat(ampInput.value) > 0) updateInputsFromAmps();
});
pfInput.addEventListener('change', () => {
    if (wattInput.value && parseFloat(wattInput.value) > 0) updateInputsFromWatts();
    else if (hpInput.value && parseFloat(hpInput.value) > 0) updateInputsFromHP();
    else if (ampInput.value && parseFloat(ampInput.value) > 0) updateInputsFromAmps();
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
        let thumbsHtml = '<div class="photo-preview" style="display:flex; gap:5px; flex-wrap:wrap; align-items:center;">';
        photos.forEach((photo, idx) => {
            thumbsHtml += `
                <div style="position:relative; display:inline-block;">
                    <img src="${photo}" class="photo-thumb" style="width:35px; height:35px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="event.stopPropagation(); window.enlargeImage('${photo}')" title="صورة ${idx + 1}">
                </div>
            `;
        });
        thumbsHtml += '</div>';
        photoCell.innerHTML = thumbsHtml;
    } else {
        photoCell.innerHTML = '<span style="color:#aaa; font-size:9px;">لا صور</span>';
    }
}

// ========== Update Photo Preview in Edit Mode ==========
function updateEditPhotoPreview(row, loadName) {
    const photos = loadPhotos[loadName] || [];
    const photoCell = row.cells[7];

    if (photos.length > 0) {
        let thumbsHtml = '<div class="edit-photo-preview" style="display:flex; gap:5px; flex-wrap:wrap; align-items:center;">';
        photos.forEach((photo, idx) => {
            thumbsHtml += `
                <div style="position:relative; display:inline-block;">
                    <img src="${photo}" style="width:35px; height:35px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="event.stopPropagation(); window.enlargeImage('${photo}')">
                    <button class="remove-photo-btn" data-photo-index="${idx}" style="position:absolute; top:-5px; right:-5px; background:#e1573c; color:white; border:none; border-radius:50%; width:16px; height:16px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
                </div>
            `;
        });
        thumbsHtml += `<button class="add-photo-btn" style="background:#2c9cd4; color:white; border:none; padding:3px 8px; border-radius:12px; margin:0 2px; cursor:pointer; font-size:9px;"><i class="fas fa-plus"></i> إضافة</button>`;
        thumbsHtml += '</div>';
        photoCell.innerHTML = thumbsHtml;

        const removeBtns = photoCell.querySelectorAll('.remove-photo-btn');
        removeBtns.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const photoIndex = parseInt(btn.getAttribute('data-photo-index'));
                removePhotoFromLoad(loadName, photoIndex, row);
            };
        });

        const addBtn = photoCell.querySelector('.add-photo-btn');
        if (addBtn) {
            addBtn.onclick = (e) => {
                e.stopPropagation();
                uploadPhotoForLoadInEdit(loadName, row);
            };
        }
    } else {
        photoCell.innerHTML = `
            <div style="display:flex; gap:5px; align-items:center;">
                <span style="color:#aaa; font-size:9px;">لا صور</span>
                <button class="add-photo-btn" style="background:#2c9cd4; color:white; border:none; padding:3px 8px; border-radius:12px; cursor:pointer; font-size:9px;">
                    <i class="fas fa-plus"></i> إضافة
                </button>
            </div>
        `;
        const addBtn = photoCell.querySelector('.add-photo-btn');
        if (addBtn) {
            addBtn.onclick = (e) => {
                e.stopPropagation();
                uploadPhotoForLoadInEdit(loadName, row);
            };
        }
    }
}

// Remove photo from load
async function removePhotoFromLoad(loadName, photoIndex, row) {
    const result = await Swal.fire({
        title: "تأكيد الحذف",
        text: "هل أنت متأكد من حذف هذه الصورة؟",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "نعم، حذف",
        cancelButtonText: "إلغاء"
    });

    if (result.isConfirmed) {
        if (loadPhotos[loadName]) {
            loadPhotos[loadName].splice(photoIndex, 1);
            if (loadPhotos[loadName].length === 0) {
                delete loadPhotos[loadName];
            }
            updateEditPhotoPreview(row, loadName);
            Swal.fire("تم الحذف", "تم حذف الصورة بنجاح", "success", { timer: 1000, showConfirmButton: false });
        }
    }
}

// Upload photo for specific load in edit mode
async function uploadPhotoForLoadInEdit(loadName, row) {
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

        updateEditPhotoPreview(row, loadName);

        hideLoading();
        await Swal.fire("تم الرفع", `تم إضافة ${newPhotos.length} صورة للحمل "${loadName}"`, "success", { timer: 1500, showConfirmButton: false });
    };

    input.click();
}

// ========== Real-time Calculation Function for Edit Mode ==========
function updateEditCalculations(row, changedField) {
    const countInputEl = row.querySelector('.edit-count-input');
    const wattsInputEl = row.querySelector('.edit-watts-input');
    const hpInputEl = row.querySelector('.edit-hp-input');
    const ampsInputEl = row.querySelector('.edit-amps-input');

    if (!countInputEl || !wattsInputEl || !hpInputEl || !ampsInputEl) return;

    let watts = parseFloat(wattsInputEl.value) || 0;
    let hp = parseFloat(hpInputEl.value) || 0;
    let amps = parseFloat(ampsInputEl.value) || 0;
    const count = parseFloat(countInputEl.value) || 1;

    const pf = 0.92;
    const mode = "3";

    // Calculate based on which field was changed
    if (changedField === 'watts' && watts > 0) {
        const result = calculateFromWatts(watts, pf, mode);
        amps = result.amps;
        hp = result.hp;
        wattsInputEl.value = watts.toFixed(0);
        ampsInputEl.value = amps.toFixed(2);
        hpInputEl.value = hp.toFixed(3);
    }
    else if (changedField === 'hp' && hp > 0) {
        const result = calculateFromHP(hp, pf, mode);
        watts = result.watts;
        amps = result.amps;
        wattsInputEl.value = watts.toFixed(0);
        ampsInputEl.value = amps.toFixed(2);
        hpInputEl.value = hp.toFixed(3);
    }
    else if (changedField === 'amps' && amps > 0) {
        const result = calculateFromAmps(amps, pf, mode);
        watts = result.watts;
        hp = result.hp;
        wattsInputEl.value = watts.toFixed(0);
        ampsInputEl.value = amps.toFixed(2);
        hpInputEl.value = hp.toFixed(3);
    }

    // Calculate totals
    const totalWatts = watts * count;
    const totalHP = hp * count;
    const totalKW = totalWatts / 1000;

    const totalKwSpan = row.querySelector('.temp-total-kw');
    const totalHpSpan = row.querySelector('.temp-total-hp');

    if (totalKwSpan) totalKwSpan.innerText = totalKW.toFixed(3);
    if (totalHpSpan) totalHpSpan.innerText = totalHP.toFixed(3);
}

// ========== Save Row Data After Edit ==========
function saveRowEdit(row, originalDescription) {
    const count = parseInt(row.querySelector('.edit-count-input')?.value) || 1;
    let watts = parseFloat(row.querySelector('.edit-watts-input')?.value) || 0;
    let hp = parseFloat(row.querySelector('.edit-hp-input')?.value) || 0;
    let amps = parseFloat(row.querySelector('.edit-amps-input')?.value) || 0;
    const newDescription = row.querySelector('.edit-name-input')?.value.trim();

    if (!newDescription) {
        Swal.fire("تنبيه", "وصف الحمل مطلوب", "warning");
        return false;
    }

    // Ensure calculations are consistent
    const pf = 0.92;
    const mode = "3";

    if (watts > 0) {
        const result = calculateFromWatts(watts, pf, mode);
        amps = result.amps;
        hp = result.hp;
    } else if (hp > 0) {
        const result = calculateFromHP(hp, pf, mode);
        watts = result.watts;
        amps = result.amps;
    } else if (amps > 0) {
        const result = calculateFromAmps(amps, pf, mode);
        watts = result.watts;
        hp = result.hp;
    }

    const { totalWatts, totalHP, totalAmps, totalKW } = calculateRowTotals(count, watts, hp, amps);

    // Update the row display
    row.cells[0].innerHTML = `<strong>${escapeHtml(newDescription)}</strong>`;
    row.cells[1].innerHTML = count;
    row.cells[2].innerHTML = watts.toFixed(0);
    row.cells[3].innerHTML = hp.toFixed(3);
    row.cells[4].innerHTML = totalAmps.toFixed(2);
    row.cells[5].innerHTML = totalKW.toFixed(3);
    row.cells[6].innerHTML = totalHP.toFixed(3);

    // Restore action buttons
    const actionCell = row.cells[8];
    actionCell.innerHTML = `
        <button class="btn-edit-row" style="background:#f4b942; color:white; border:none; padding:3px 6px; border-radius:12px; margin:0 1px; cursor:pointer; font-size:10px;">
            <i class="fas fa-edit"></i>
        </button>
        <button class="btn-camera-row" style="background:#2c9cd4; color:white; border:none; padding:3px 6px; border-radius:12px; margin:0 1px; cursor:pointer; font-size:10px;">
            <i class="fas fa-camera"></i>
        </button>
        <button class="btn-delete-row" style="background:#e1573c; color:white; border:none; padding:3px 6px; border-radius:12px; margin:0 1px; cursor:pointer; font-size:10px;">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;

    // Reattach event handlers
    const editBtn = actionCell.querySelector('.btn-edit-row');
    const cameraBtn = actionCell.querySelector('.btn-camera-row');
    const delBtn = actionCell.querySelector('.btn-delete-row');

    editBtn.onclick = () => makeRowEditable(row);
    cameraBtn.onclick = () => uploadPhotoForLoad(newDescription, row);
    delBtn.onclick = () => {
        if (originalDescription && originalDescription !== newDescription) {
            delete loadPhotos[originalDescription];
        }
        delete loadPhotos[newDescription];
        row.remove();
        updateTotals();
    };

    // Handle photo renaming
    if (originalDescription && originalDescription !== newDescription && loadPhotos[originalDescription]) {
        loadPhotos[newDescription] = loadPhotos[originalDescription];
        delete loadPhotos[originalDescription];
        updatePhotoPreview(row, newDescription);
    }

    updateTotals();
    editingRow = null;
    return true;
}

// ========== Make Row Editable ==========
function makeRowEditable(row) {
    if (editingRow && editingRow !== row) {
        const cancelBtn = editingRow.querySelector('.btn-cancel-edit');
        if (cancelBtn) cancelBtn.click();
    }

    const originalDescription = row.cells[0].innerText;
    const currentCount = row.cells[1].innerText;
    const currentWatts = row.cells[2].innerText;
    const currentHp = row.cells[3].innerText;
    const currentAmps = row.cells[4].innerText;

    // Replace cells with input fields
    row.cells[0].innerHTML = `<input type="text" class="edit-name-input" value="${escapeHtml(originalDescription)}" style="width:100%; padding:3px; border-radius:4px; border:1px solid #2c9cd4;">`;
    row.cells[1].innerHTML = `<input type="number" class="edit-count-input" value="${currentCount}" style="width:60px; padding:3px; border-radius:4px; border:1px solid #2c9cd4; text-align:center;">`;
    row.cells[2].innerHTML = `<input type="number" class="edit-watts-input" value="${currentWatts}" style="width:80px; padding:3px; border-radius:4px; border:1px solid #2c9cd4; text-align:center;">`;
    row.cells[3].innerHTML = `<input type="number" class="edit-hp-input" value="${currentHp}" step="0.001" style="width:80px; padding:3px; border-radius:4px; border:1px solid #2c9cd4; text-align:center;">`;
    row.cells[4].innerHTML = `<input type="number" class="edit-amps-input" value="${currentAmps}" step="0.01" style="width:80px; padding:3px; border-radius:4px; border:1px solid #2c9cd4; text-align:center;">`;
    row.cells[5].innerHTML = `<span class="temp-total-kw">${row.cells[5].innerText}</span>`;
    row.cells[6].innerHTML = `<span class="temp-total-hp">${row.cells[6].innerText}</span>`;

    // Update photo cell for edit mode
    updateEditPhotoPreview(row, originalDescription);

    // Update action buttons
    const actionCell = row.cells[8];
    actionCell.innerHTML = `
        <button class="btn-save-edit" style="background:#2e8b57; color:white; border:none; padding:3px 6px; border-radius:12px; margin:0 1px; cursor:pointer; font-size:10px;">
            <i class="fas fa-save"></i>
        </button>
        <button class="btn-cancel-edit" style="background:#888; color:white; border:none; padding:3px 6px; border-radius:12px; margin:0 1px; cursor:pointer; font-size:10px;">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Get input elements
    const wattsInputEl = row.querySelector('.edit-watts-input');
    const hpInputEl = row.querySelector('.edit-hp-input');
    const ampsInputEl = row.querySelector('.edit-amps-input');
    const countInputEl = row.querySelector('.edit-count-input');

    // Add real-time calculation event listeners
    wattsInputEl.addEventListener('input', () => updateEditCalculations(row, 'watts'));
    hpInputEl.addEventListener('input', () => updateEditCalculations(row, 'hp'));
    ampsInputEl.addEventListener('input', () => updateEditCalculations(row, 'amps'));
    countInputEl.addEventListener('input', () => updateEditCalculations(row, 'count'));

    // Save button
    const saveBtn = actionCell.querySelector('.btn-save-edit');
    saveBtn.onclick = () => {
        if (saveRowEdit(row, originalDescription)) {
            editingRow = null;
        }
    };

    // Cancel button
    const cancelBtn = actionCell.querySelector('.btn-cancel-edit');
    cancelBtn.onclick = () => {
        // Restore original display
        row.cells[0].innerHTML = `<strong>${escapeHtml(originalDescription)}</strong>`;
        row.cells[1].innerHTML = currentCount;
        row.cells[2].innerHTML = currentWatts;
        row.cells[3].innerHTML = currentHp;
        row.cells[4].innerHTML = currentAmps;
        row.cells[5].innerHTML = row.cells[5].innerHTML;
        row.cells[6].innerHTML = row.cells[6].innerHTML;
        updatePhotoPreview(row, originalDescription);

        // Restore action buttons
        actionCell.innerHTML = `
            <button class="btn-edit-row" style="background:#f4b942; color:white; border:none; padding:3px 6px; border-radius:12px; margin:0 1px; cursor:pointer; font-size:10px;">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-camera-row" style="background:#2c9cd4; color:white; border:none; padding:3px 6px; border-radius:12px; margin:0 1px; cursor:pointer; font-size:10px;">
                <i class="fas fa-camera"></i>
            </button>
            <button class="btn-delete-row" style="background:#e1573c; color:white; border:none; padding:3px 6px; border-radius:12px; margin:0 1px; cursor:pointer; font-size:10px;">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;

        const editBtn = actionCell.querySelector('.btn-edit-row');
        const cameraBtn = actionCell.querySelector('.btn-camera-row');
        const delBtn = actionCell.querySelector('.btn-delete-row');

        editBtn.onclick = () => makeRowEditable(row);
        cameraBtn.onclick = () => uploadPhotoForLoad(originalDescription, row);
        delBtn.onclick = () => {
            delete loadPhotos[originalDescription];
            row.remove();
            updateTotals();
        };

        editingRow = null;
    };

    editingRow = row;
}

// ========== Add Load Row ==========
function addLoadToTable(description, count, wattsPerUnit, hpPerUnit, ampsPerUnit) {
    const { totalWatts, totalHP, totalAmps, totalKW } = calculateRowTotals(count, wattsPerUnit, hpPerUnit, ampsPerUnit);

    const row = tableBody.insertRow();
    row.insertCell(0).innerHTML = `<strong>${escapeHtml(description)}</strong>`;
    row.insertCell(1).innerHTML = count;
    row.insertCell(2).innerHTML = wattsPerUnit || 0;
    row.insertCell(3).innerHTML = hpPerUnit ? hpPerUnit.toFixed(3) : 0;
    row.insertCell(4).innerHTML = totalAmps.toFixed(2);
    row.insertCell(5).innerHTML = totalKW.toFixed(3);
    row.insertCell(6).innerHTML = totalHP.toFixed(3);

    const photoCell = row.insertCell(7);
    photoCell.style.minWidth = "65px";
    updatePhotoPreview(row, description);

    const actionCell = row.insertCell(8);
    actionCell.style.whiteSpace = "nowrap";
    actionCell.innerHTML = `
        <button class="btn-edit-row" style="background:#f4b942; color:white; border:none; padding:3px 6px; border-radius:12px; margin:0 1px; cursor:pointer; font-size:10px;">
            <i class="fas fa-edit"></i>
        </button>
        <button class="btn-camera-row" style="background:#2c9cd4; color:white; border:none; padding:3px 6px; border-radius:12px; margin:0 1px; cursor:pointer; font-size:10px;">
            <i class="fas fa-camera"></i>
        </button>
        <button class="btn-delete-row" style="background:#e1573c; color:white; border:none; padding:3px 6px; border-radius:12px; margin:0 1px; cursor:pointer; font-size:10px;">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;

    const editBtn = actionCell.querySelector('.btn-edit-row');
    const cameraBtn = actionCell.querySelector('.btn-camera-row');
    const delBtn = actionCell.querySelector('.btn-delete-row');

    editBtn.onclick = () => makeRowEditable(row);
    cameraBtn.onclick = () => uploadPhotoForLoad(description, row);
    delBtn.onclick = () => {
        delete loadPhotos[description];
        row.remove();
        updateTotals();
    };

    updateTotals();
}

// Upload photo for specific load (normal mode)
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
    let watts = parseFloat(wattInput.value) || 0;
    let hp = parseFloat(hpInput.value) || 0;
    let amps = parseFloat(ampInput.value) || 0;

    if (!description) {
        Swal.fire("تنبيه", "يرجى إدخال وصف الحمل", "warning");
        return;
    }

    if (watts === 0 && amps === 0 && hp === 0) {
        Swal.fire("تنبيه", "أدخل الوات أو الأمبير أو الحصان", "info");
        return;
    }

    // Auto-calculate missing values
    const pf = 0.92;
    const mode = phaseMode.value;

    if (watts > 0) {
        const result = calculateFromWatts(watts, pf, mode);
        amps = result.amps;
        hp = result.hp;
    } else if (hp > 0) {
        const result = calculateFromHP(hp, pf, mode);
        watts = result.watts;
        amps = result.amps;
    } else if (amps > 0) {
        const result = calculateFromAmps(amps, pf, mode);
        watts = result.watts;
        hp = result.hp;
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
        currentMeterNo = meterNo;

        hideLoading();
        await Swal.fire({ title: "تم الحفظ", text: "تم حفظ البيانات بنجاح", icon: "success", timer: 1500, showConfirmButton: false });
    } catch (e) {
        hideLoading();
        await Swal.fire("خطأ", e.message, "error");
    }

    window.location.reload();
};


function resetForm() {
    mnameInput.value = "";
    mnoInput.value = "";
    mcoInput.value = "";
    notesInput.value = "";
    tableBody.innerHTML = "";
    loadPhotos = {};
    currentMeterNo = null;
    editingRow = null;
    updateTotals();
}

// ========== Load Data to Main Form ==========
async function loadDataToMainForm(meterNo) {
    if (!meterNo) {
        console.warn("لا يوجد رقم عداد للتحميل");
        return null;
    }

    showLoading("جاري تحميل البيانات...");

    try {
        const snap = await get(ref(db, `Munipilation/${meterNo}`));
        const data = snap.val();
        hideLoading();

        if (data && data.meter_no === meterNo) {
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
                    if (loadPhotos[loadName]) {
                        updatePhotoPreview(row, loadName);
                    }
                }
            }

            currentMeterNo = meterNo;
            console.log("✅ تم تحميل البيانات بنجاح للمشترك:", data.name);
            return data;
        } else {
            console.log("ℹ️ لا توجد بيانات للمشترك:", meterNo);
            return null;
        }
    } catch (error) {
        hideLoading();
        console.error("❌ خطأ في تحميل البيانات:", error);
        return null;
    }
}

// ========== View Full Record ==========
window.viewFullRecord = async (meterNo) => {
    if (!meterNo) {
        await Swal.fire("خطأ", "رقم العداد غير صالح", "error");
        return;
    }

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
                loadPhotosList.slice(0, 3).forEach((photo, idx) => {
                    photosHtml += `<img src="${photo}" style="width:35px; height:35px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="window.enlargeImage('${photo}')" title="صورة ${idx + 1}">`;
                });
                if (loadPhotosList.length > 3) photosHtml += `<span style="font-size:10px; color:#666;">+${loadPhotosList.length - 3}</span>`;
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
                <p><strong>آخر تحديث:</strong> ${data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('ar-EG') : "-"}</p>
                ${loadsHtml}
            </div>`,
            width: "1100px",
            showConfirmButton: true,
            confirmButtonText: "إغلاق",
        });
    } catch (error) {
        hideLoading();
        console.error("Error viewing record:", error);
        await Swal.fire("خطأ", "فشل تحميل البيانات: " + error.message, "error");
    }
};

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
                                    <button onclick="window.loadDataToMainForm('${r.key}')" style="background:#2e8b57; color:white; border:none; padding:4px 8px; border-radius:12px; cursor:pointer; font-size:10px;">
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

            if (currentMeterNo === meterNo) {
                resetForm();
            }

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


// Helper function to escape HTML
function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function (m) {
        if (m === "&") return "&amp;";
        if (m === "<") return "&lt;";
        if (m === ">") return "&gt;";
        return m;
    });
}

// Make functions available globally
window.loadDataToMainForm = loadDataToMainForm;
window.checkDatabaseStructure = async (meterNo) => {
    try {
        const snap = await get(ref(db, `Munipilation/${meterNo}`));
        const data = snap.val();
        console.log("📊 هيكل البيانات:", {
            exists: !!data,
            keys: data ? Object.keys(data) : [],
            hasPhotos: data?.photos ? Object.keys(data.photos) : false,
            hasLoads: data?.loads ? data.loads.length : 0
        });
        return data;
    } catch (error) {
        console.error("خطأ في فحص قاعدة البيانات:", error);
        return null;
    }
};

console.log("✅ Application loaded successfully! Real-time calculation in main form and edit mode is enabled.");