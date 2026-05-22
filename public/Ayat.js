import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-app.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-analytics.js";

// ==================== CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyAnKRhT5xJTBvsQKpW7e9w-hGSbAQJWTSo",
    authDomain: "production1-ae85.firebaseapp.com",
    projectId: "production1-ae85",
    storageBucket: "production1-ae85.firebasestorage.app",
    messagingSenderId: "490438031865",
    appId: "1:490438031865:web:a4a69335989f30cd13a528",
    measurementId: "G-W3TZ1EKWWN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
try { getAnalytics(app); } catch (e) { console.warn("Analytics disabled:", e); }

// ==================== GLOBAL STATE ====================
let allData = [];
let filteredData = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 20;
let currentEditOriginalIndex = null;

// Cache for existing meter numbers and MCO codes (for faster duplicate checking)
let existingMeterNumbersCache = new Set();
let existingMcoCache = new Set();
let duplicateReferenceMode = "metercode";

// ==================== HELPER FUNCTIONS ====================

// Clean numeric string (remove non-digits)
function cleanNumericString(value) {
    if (!value) return "";
    return String(value).replace(/\D/g, '').trim();
}

// Keep meter code as text (important for alphanumeric codes)
function normalizeMeterCode(value) {
    if (!value) return "";
    return String(value).replace(/\s+/g, '').trim();
}

function normalizeText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim().toLowerCase();
}

function getDuplicateSourceValue(item, mode) {
    if (!item) return "";
    if (mode === "meternumber") return item.meternumber;
    if (mode === "metercode") return item.metercode;
    if (mode === "metername") return item.metername;
    return "";
}

function normalizeDuplicateValue(value, mode) {
    if (mode === "meternumber") return cleanNumericString(value);
    if (mode === "metercode") return normalizeMeterCode(value).toLowerCase();
    if (mode === "metername") return normalizeText(value);
    return "";
}

function getDuplicateReferenceLabel(mode) {
    if (mode === "metercode") return "كود المشترك";
    if (mode === "metername") return "اسم المشترك";
    return "رقم العداد";
}

function mergeUploadedRecord(existingRecord, incomingRecord) {
    const merged = { ...existingRecord };

    Object.entries(incomingRecord).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            merged[key] = value;
        }
    });

    return merged;
}

// Convert any date format to DD/MM/YYYY
function convertToDDMMYYYY(dateStr) {
    if (!dateStr) return "";
    
    try {
        if (dateStr instanceof Date) {
            const day = String(dateStr.getDate()).padStart(2, '0');
            const month = String(dateStr.getMonth() + 1).padStart(2, '0');
            const year = dateStr.getFullYear();
            return `${day}/${month}/${year}`;
        }
        
        const str = String(dateStr).trim();
        
        if (typeof dateStr === 'number' || /^\d+$/.test(str)) {
            const serial = parseInt(str);
            if (serial > 0 && serial < 100000) {
                const excelEpoch = new Date(1900, 0, 1);
                const date = new Date(excelEpoch.getTime() + (serial - 2) * 86400000);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                if (year > 1900 && year < 2100) {
                    return `${day}/${month}/${year}`;
                }
            }
        }
        
        let day, month, year;
        
        if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const parts = str.split('-');
            year = parts[0];
            month = parts[1];
            day = parts[2];
            return `${day}/${month}/${year}`;
        }
        
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    year = parts[0];
                    month = parts[1].padStart(2, '0');
                    day = parts[2].padStart(2, '0');
                    return `${day}/${month}/${year}`;
                }
                day = parts[0].padStart(2, '0');
                month = parts[1].padStart(2, '0');
                year = parts[2];
                if (year.length === 2) {
                    year = parseInt(year) > 30 ? `19${year}` : `20${year}`;
                }
                return `${day}/${month}/${year}`;
            }
        }
        
        if (str.includes('-')) {
            const parts = str.split('-');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    year = parts[0];
                    month = parts[1].padStart(2, '0');
                    day = parts[2].padStart(2, '0');
                    return `${day}/${month}/${year}`;
                }
                day = parts[0].padStart(2, '0');
                month = parts[1].padStart(2, '0');
                year = parts[2];
                if (year.length === 2) {
                    year = parseInt(year) > 30 ? `19${year}` : `20${year}`;
                }
                return `${day}/${month}/${year}`;
            }
        }
        
        const jsDate = new Date(str);
        if (!isNaN(jsDate.getTime()) && jsDate.getFullYear() > 1900) {
            const day = String(jsDate.getDate()).padStart(2, '0');
            const month = String(jsDate.getMonth() + 1).padStart(2, '0');
            const year = jsDate.getFullYear();
            return `${day}/${month}/${year}`;
        }
        
        return str;
    } catch (e) {
        console.warn("Date conversion error:", dateStr, e);
        return dateStr;
    }
}

// Parse date safely from various formats
function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                return new Date(parts[2], parts[1] - 1, parts[0]);
            }
        }
        
        let date;
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    date = new Date(parts[0], parts[1] - 1, parts[2]);
                } else if (parts[2].length === 4) {
                    date = new Date(parts[2], parts[1] - 1, parts[0]);
                } else {
                    date = new Date(dateStr);
                }
            } else {
                date = new Date(dateStr);
            }
        } else {
            date = new Date(dateStr);
        }
        return date && !isNaN(date.getTime()) ? date : null;
    } catch (e) {
        return null;
    }
}

// Format date for display (DD-MM-YYYY)
function formatDateForDisplay(dateStr) {
    if (!dateStr) return "";
    try {
        if (dateStr.includes('/')) {
            return dateStr.replace(/\//g, '-');
        }
        
        let date = parseDate(dateStr);
        if (date) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        }
        return dateStr;
    } catch (e) {
        return dateStr;
    }
}

// Format date for storage (YYYY-MM-DD)
function formatDateForStorage(dateStr) {
    if (!dateStr) return "";
    try {
        let date = parseDate(dateStr);
        if (date) {
            return date.toISOString().split('T')[0];
        }
        return dateStr;
    } catch (e) {
        return dateStr;
    }
}

// Update cache of existing meter numbers and MCO codes
async function updateCaches() {
    try {
        const snap = await get(ref(db, "Ayat/meterdata"));
        if (snap.exists()) {
            const data = snap.val();
            const list = Array.isArray(data) ? data : Object.values(data);
            existingMeterNumbersCache.clear();
            existingMcoCache.clear();
            list.forEach(item => {
                if (item?.meternumber) {
                    existingMeterNumbersCache.add(cleanNumericString(item.meternumber));
                }
                if (item?.metercode) {
                    existingMcoCache.add(normalizeMeterCode(item.metercode));
                }
            });
            console.log("Caches updated:", {
                meterNumbers: existingMeterNumbersCache.size,
                mcoCodes: existingMcoCache.size
            });
        }
    } catch (error) {
        console.warn("Error updating caches:", error);
    }
}

// Reset form to empty state
window.resetUI = () => {
    currentEditOriginalIndex = null;
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.innerHTML = "💾 حفظ";
        saveBtn.style.background = "";
    }

    const fields = ["keta3", "handsa", "calib_date", "enter_date", "mname", "mco", "nashattype", "mtype", "mno", "munip", "notes"];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const enterDateInput = document.getElementById("enter_date");
    if (enterDateInput && !enterDateInput.value) {
        enterDateInput.value = new Date().toISOString().split('T')[0];
    }
};

// Collect data from form
function getFormData() {
    return {
        keta3: document.getElementById("keta3")?.value || "",
        handsa: document.getElementById("handsa")?.value || "",
        calibrationdate: document.getElementById("calib_date")?.value || "",
        enterdate: document.getElementById("enter_date")?.value || "",
        metername: document.getElementById("mname")?.value?.trim() || "",
        metercode: document.getElementById("mco")?.value?.trim() || "",
        nashattype: document.getElementById("nashattype")?.value || "",
        metertype: document.getElementById("mtype")?.value || "",
        meternumber: document.getElementById("mno")?.value?.trim() || "",
        result: document.getElementById("munip")?.value || "",
        notes: document.getElementById("notes")?.value?.trim() || ""
    };
}

// Clean meter number (remove non-digits) - kept for backward compatibility
function cleanMeterNumber(value) {
    return cleanNumericString(value);
}

// ==================== DUPLICATE REPORT FUNCTIONS ====================

// Show duplicate report in a SweetAlert table
window.showDuplicateReport = (duplicatesList, type = "both") => {
    if (!duplicatesList || duplicatesList.length === 0) {
        Swal.fire("لا توجد مكررات", "جميع البيانات فريدة ولا توجد أرقام مكررة", "success");
        return;
    }

    const duplicateLabel = getDuplicateReferenceLabel(type || duplicateReferenceMode);

    let html = `
        <div dir="rtl" style="text-align: right; max-height: 500px; overflow-y: auto;">
            <h4 style="color: #dc3545; margin-bottom: 15px;">
                🔴 تم رصد ${duplicatesList.length} سجل مكرر حسب ${duplicateLabel}
            </h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                        <th style="padding: 8px; text-align: center;">#</th>
                        <th style="padding: 8px; text-align: center;">القطاع</th>
                        <th style="padding: 8px; text-align: center;">الهندسة</th>
                        <th style="padding: 8px; text-align: center;">تاريخ الفحص</th>
                        <th style="padding: 8px; text-align: center;">تاريخ التسجيل</th>
                        <th style="padding: 8px; text-align: center;">اسم المشترك</th>
                        <th style="padding: 8px; text-align: center;">كود المشترك</th>
                        <th style="padding: 8px; text-align: center;">النشاط</th>
                        <th style="padding: 8px; text-align: center;">نوع العداد</th>
                        <th style="padding: 8px; text-align: center;">رقم العداد</th>
                        <th style="padding: 8px; text-align: center;">نتيجة الفحص</th>
                        <th style="padding: 8px; text-align: center;">ملاحظات</th>
                    </tr>
                </thead>
                <tbody>
    `;

    duplicatesList.forEach((dup, index) => {
        html += `
            <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px; text-align: center;">${index + 1}</td>
                <td style="padding: 8px; text-align: center;">${dup.keta3 || '—'}</td>
                <td style="padding: 8px; text-align: center;">${dup.handsa || '—'}</td>
                <td style="padding: 8px; text-align: center;">${formatDateForDisplay(dup.calibrationdate) || '—'}</td>
                <td style="padding: 8px; text-align: center;">${formatDateForDisplay(dup.enterdate) || '—'}</td>
                <td style="padding: 8px; text-align: center;">${dup.metername || '—'}</td>
                <td style="padding: 8px; text-align: center;">${dup.metercode || '—'}</td>
                <td style="padding: 8px; text-align: center;">${dup.nashattype || '—'}</td>
                <td style="padding: 8px; text-align: center;">${dup.metertype || '—'}</td>
                <td style="padding: 8px; text-align: center;"><strong>${dup.meternumber || '—'}</strong></td>
                <td style="padding: 8px; text-align: center;">${dup.result || '—'}</td>
                <td style="padding: 8px; text-align: center;">${dup.notes || '—'}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 5px; color: #856404;">
                <strong>📌 ملاحظة:</strong> هذه السجلات موجودة مسبقاً في قاعدة البيانات ولم يتم رفعها مرة أخرى.
            </div>
        </div>
    `;

    Swal.fire({
        title: "⚠️ السجلات المكررة",
        html: html,
        icon: "warning",
        width: "90%",
        maxWidth: "1000px",
        confirmButtonText: "حسناً",
        confirmButtonColor: "#10b981"
    });
};

// Function to check and report duplicates in current filtered data
window.checkCurrentDuplicates = () => {
    const counts = new Map();
    const duplicates = [];

    filteredData.forEach((item, index) => {
        const key = normalizeDuplicateValue(getDuplicateSourceValue(item, duplicateReferenceMode), duplicateReferenceMode);

        if (!key) {
            return;
        }

        if (!counts.has(key)) {
            counts.set(key, []);
        }

        counts.get(key).push({ ...item, originalIndex: index });
    });

    counts.forEach((items) => {
        if (items.length > 1) {
            duplicates.push(...items);
        }
    });

    if (duplicates.length === 0) {
        Swal.fire("✅ لا توجد مكررات", `جميع السجلات فريدة بالنسبة لـ ${getDuplicateReferenceLabel(duplicateReferenceMode)}.`, "success");
    } else {
        window.showDuplicateReport(duplicates, duplicateReferenceMode);
    }
};

// ==================== BULK EXCEL UPLOAD HANDLER ====================
function normalizeExcelKey(value) {
    return String(value ?? "")
        .replace(/\s+/g, "")
        .replace(/[\u200e\u200f]/g, "")
        .toLowerCase()
        .trim();
}

function getExcelValue(row, aliases) {
    const normalizedMap = Object.keys(row || {}).reduce((acc, key) => {
        acc[normalizeExcelKey(key)] = key;
        return acc;
    }, {});

    for (const alias of aliases) {
        const matchedKey = normalizedMap[normalizeExcelKey(alias)];
        if (matchedKey !== undefined) {
            const value = row[matchedKey];
            if (value !== undefined && value !== null) {
                const text = String(value).trim();
                if (text !== "") {
                    return text;
                }
            }
        }
    }

    return "";
}

window.handleBulkExcelUpload = function(event) {
    const file = event.target.files[0];
    if (!file) {
        console.log("No file selected");
        return;
    }

    console.log("File selected:", file.name, file.size);

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            console.log("Rows parsed:", rows.length);

            if (rows.length === 0) {
                Swal.fire("ملف فارغ", "لا توجد أسطر بيانات داخل هذا الملف لتمريرها.", "warning");
                return;
            }

            Swal.fire({
                title: 'جاري فحص وتصفية البيانات...',
                text: `تم رصد ${rows.length} سجل بالملف. جاري معالجة البيانات...`,
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const snap = await get(ref(db, "Ayat/meterdata"));
            let currentList = [];
            if (snap.exists()) {
                const val = snap.val();
                currentList = Array.isArray(val) ? val : Object.values(val);
            }

            let addedCount = 0;
            let updatedCount = 0;
            let savedCount = 0;
            let invalidCount = 0;
            const invalidRecords = [];

            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex];

                const mcoVal = normalizeMeterCode(getExcelValue(row, ["كود المشترك", "كود ","الكود الموحّد","الكود الجديد", "MCO", "mco", "metercode"]));
                const mNumber = cleanNumericString(getExcelValue(row, ["رقم العداد", "رقم العداد", "شاسيه العداد", "رقم الشاسية ", "meternumber", "mno"]));
                const keta3 = getExcelValue(row, ["قطاع", "القطاع", "DiscoSection", "keta3", "المنطقة", "المنطقة/القطاع"]);
                const handsa = getExcelValue(row, ["هندسة", "الهندسة", "DiscoBranch", "الادارة", "الفرع"]);
                const calibrationdate = getExcelValue(row, ["تاريخ الفحص", "تاريخ المعايرة", "تاريخ المعايره", "الفحص التاريخ"]);
                const enterdate = getExcelValue(row, ["تاريخ الإدخال", "تاريخ التسجيل", "تاريخ الرفع", "تاريخ الاضافة"]) || new Date().toISOString().split('T')[0];
                const metername = getExcelValue(row, ["اسم المشترك", "اسم المشتركين", "الأسم", "المشترك"]);
                const metertype = getExcelValue(row, ["نوع العداد", "نوع العداد", "meter type", "metertype"]);
                const nashattype = getExcelValue(row, ["نوع النشاط", "النشاط","حالة الأشتراك", "activity type", "nashattype"]);
                const result = getExcelValue(row, ["نتيجة الفحص", "الحالة", "النتيجة", "result"]);
                const notes = getExcelValue(row, ["ملاحظات", "ملاحظات الفحص", "التعليقات", "notes"]);

                if (!mcoVal) {
                    invalidCount++;
                    invalidRecords.push({
                        rowNumber: rowIndex + 2,
                        reason: "لا يوجد كود المشترك (يجب أن يكون اسم العمود بالضبط: كود المشترك أو أحد البدائل المدعومة)"
                    });
                    continue;
                }

                const preparedRecord = {
                    calibrationdate,
                    enterdate,
                    handsa,
                    keta3,
                    metercode: mcoVal,
                    metername,
                    meternumber: mNumber,
                    metertype,
                    nashattype,
                    notes,
                    result
                };

                const sameMcoSameMeterNumberIndex = currentList.findIndex(item =>
                    normalizeMeterCode(item?.metercode) === mcoVal &&
                    cleanNumericString(item?.meternumber) === mNumber
                );

                if (sameMcoSameMeterNumberIndex >= 0) {
                    currentList[sameMcoSameMeterNumberIndex] = mergeUploadedRecord(currentList[sameMcoSameMeterNumberIndex], preparedRecord);
                    updatedCount++;
                } else {
                    currentList.push(preparedRecord);
                    addedCount++;
                }

                savedCount++;
            }

            if (savedCount > 0) {
                await set(ref(db, "Ayat/meterdata"), currentList);

                let resultHtml = `
                    <div style="text-align: right; direction: rtl; font-size: 14px; line-height: 1.6;">
                        <p style="color: #3fb950; font-weight: bold;">✅ تم حفظ/تحديث ${savedCount} سجل.</p>
                        <p style="color: #93c5fd; font-weight: bold; margin-top: 8px;">➕ سجلات مضافة: ${addedCount}</p>
                        <p style="color: #f59e0b; font-weight: bold; margin-top: 8px;">🔄 سجلات محدثة: ${updatedCount}</p>
                `;

                if (invalidCount > 0) {
                    resultHtml += `
                        <p style="color: #f59e0b; font-weight: bold; margin-top: 8px;">
                            ⚠️ تم تخطي ${invalidCount} سجل لعدم وجود كود مشترك.
                        </p>
                        <button id="showInvalidBtn" style="margin-top: 10px; padding: 8px 16px; background-color: #f59e0b; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            🔎 عرض السجلات غير المكتملة
                        </button>
                    `;
                }

                resultHtml += `</div>`;

                await Swal.fire({
                    icon: invalidCount > 0 ? 'warning' : 'success',
                    title: invalidCount > 0 ? 'تم رفع الجزء الصحيح من الملف' : 'اكتملت معالجة ورفع الملف السحابي',
                    html: resultHtml,
                    didOpen: () => {
                        if (invalidCount > 0) {
                            const showInvalidBtn = document.getElementById('showInvalidBtn');
                            if (showInvalidBtn) {
                                showInvalidBtn.onclick = () => {
                                    Swal.close();
                                    Swal.fire({
                                        title: 'السجلات غير المكتملة',
                                        html: `
                                            <div dir="rtl" style="text-align: right; max-height: 420px; overflow-y: auto;">
                                                <table style="width:100%; border-collapse: collapse; font-size: 13px;">
                                                    <thead>
                                                        <tr style="background:#f8f9fa;">
                                                            <th style="padding:8px; text-align:center;">رقم الصف</th>
                                                            <th style="padding:8px; text-align:center;">السبب</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${invalidRecords.map((item) => `
                                                            <tr style="border-bottom:1px solid #dee2e6;">
                                                                <td style="padding:8px; text-align:center;">${item.rowNumber}</td>
                                                                <td style="padding:8px; text-align:center;">${item.reason}</td>
                                                            </tr>
                                                        `).join("")}
                                                    </tbody>
                                                </table>
                                            </div>
                                        `,
                                        icon: 'warning',
                                        width: '700px'
                                    });
                                };
                            }
                        }
                    }
                });

                await loadDataForModal();
                await updateCaches();
            } else if (invalidCount > 0) {
                await Swal.fire({
                    icon: 'warning',
                    title: '⚠️ لم يتم رفع أي سجل',
                    html: `
                        <div style="text-align: right; direction: rtl;">
                            <p>تم تخطي ${invalidCount} سجل لأنهم لا يحتويون على كود مشترك.</p>
                            <button id="viewInvalidBtn" style="margin-top: 10px; padding: 8px 16px; background-color: #f59e0b; color: white; border: none; border-radius: 5px; cursor: pointer;">
                                🔎 عرض السجلات غير المكتملة
                            </button>
                        </div>
                    `,
                    didOpen: () => {
                        const viewInvalidBtn = document.getElementById('viewInvalidBtn');
                        if (viewInvalidBtn) {
                            viewInvalidBtn.onclick = () => {
                                Swal.close();
                                Swal.fire({
                                    title: 'السجلات غير المكتملة',
                                    html: `
                                        <div dir="rtl" style="text-align: right; max-height: 420px; overflow-y: auto;">
                                            <table style="width:100%; border-collapse: collapse; font-size: 13px;">
                                                <thead>
                                                    <tr style="background:#f8f9fa;">
                                                        <th style="padding:8px; text-align:center;">رقم الصف</th>
                                                        <th style="padding:8px; text-align:center;">السبب</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${invalidRecords.map((item) => `
                                                        <tr style="border-bottom:1px solid #dee2e6;">
                                                            <td style="padding:8px; text-align:center;">${item.rowNumber}</td>
                                                            <td style="padding:8px; text-align:center;">${item.reason}</td>
                                                        </tr>
                                                    `).join("")}
                                                </tbody>
                                            </table>
                                        </div>
                                    `,
                                    icon: 'warning',
                                    width: '700px'
                                });
                            };
                        }
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'لم يتم رفع أي سجل',
                    text: 'لم يتم العثور على سجلات قابلة للرفع في هذا الملف.'
                });
            }

        } catch (err) {
            console.error("Bulk Upload Crash:", err);
            Swal.fire("فشل التحليل", "حدث خطأ أثناء معالجة ملف الـ Excel، تأكد من سلامة صياغة وتنسيق الملف.", "error");
        } finally {
            const fileInput = document.getElementById('excelFileInput');
            if (fileInput) fileInput.value = "";
        }
    };

    reader.onerror = function(error) {
        console.error("FileReader error:", error);
        Swal.fire("خطأ", "حدث خطأ في قراءة الملف", "error");
    };

    reader.readAsArrayBuffer(file);
};

// ==================== PASSWORD PROMPT FOR EXCEL UPLOAD ====================
window.promptPassword = () => {
    Swal.fire({
        title: "كلمة مرور النظام",
        input: "password",
        inputPlaceholder: "أدخل كلمة المرور",
        showCancelButton: true,
        confirmButtonText: "دخول",
        cancelButtonText: "إلغاء",
        inputAttributes: {
            maxlength: 10,
            autocapitalize: "off",
            autocorrect: "off"
        }
    }).then(result => {
        if (result.isConfirmed && result.value === "1") {
            let fileInput = document.getElementById("excelFileInput");
            if (!fileInput) {
                fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.id = "excelFileInput";
                fileInput.accept = ".xlsx, .xls, .csv";
                fileInput.style.display = "none";
                fileInput.setAttribute("onchange", "window.handleBulkExcelUpload(event)");
                document.body.appendChild(fileInput);
                console.log("Created file input element");
            }
            fileInput.click();
        } else if (result.isConfirmed && result.value) {
            Swal.fire("خطأ", "كلمة المرور غير صحيحة", "error");
        }
    });
};

// Manual trigger for testing (no password)
window.triggerFileUpload = () => {
    let fileInput = document.getElementById("excelFileInput");
    if (!fileInput) {
        fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.id = "excelFileInput";
        fileInput.accept = ".xlsx, .xls, .csv";
        fileInput.style.display = "none";
        fileInput.setAttribute("onchange", "window.handleBulkExcelUpload(event)");
        document.body.appendChild(fileInput);
        console.log("Created file input element");
    }
    fileInput.click();
};

// ==================== CRUD OPERATIONS ====================

// Save or Update record with duplicate warning
window.quickSave = async () => {
    const saveBtn = document.getElementById("saveBtn");
    const fields = getFormData();

    const requiredFields = ["keta3", "handsa", "calibrationdate", "enterdate", "metername", "metercode", "nashattype", "metertype", "meternumber", "result"];
    const missing = requiredFields.filter(f => !fields[f]);

    if (missing.length > 0) {
        return Swal.fire("تنبيه", "يرجى ملء جميع الحقول المطلوبة", "warning");
    }

    if (saveBtn) saveBtn.disabled = true;
    const originalText = saveBtn?.innerHTML || "💾 حفظ";
    if (saveBtn) saveBtn.innerHTML = "⌛ جاري المعالجة...";

    try {
        const cleanedMeterNo = cleanNumericString(fields.meternumber);
        const cleanedMco = normalizeMeterCode(fields.metercode);

        if (currentEditOriginalIndex === null) {
            if (existingMeterNumbersCache.has(cleanedMeterNo)) {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                }

                const snap = await get(ref(db, "Ayat/meterdata"));
                let list = [];
                if (snap.exists()) {
                    const val = snap.val();
                    list = Array.isArray(val) ? val : Object.values(val);
                }
                const existingRecord = list.find(item => cleanNumericString(item.meternumber) === cleanedMeterNo);

                const result = await Swal.fire({
                    title: "⚠️ رقم العداد مكرر",
                    html: `
                        <div dir="rtl" style="text-align: right;">
                            <p><strong>رقم العداد:</strong> ${cleanedMeterNo}</p>
                            <p><strong>البيانات الموجودة:</strong></p>
                            <ul style="text-align: right;">
                                <li>المشترك: ${existingRecord?.metername || 'غير معروف'}</li>
                                <li>تاريخ الفحص: ${formatDateForDisplay(existingRecord?.calibrationdate) || 'غير معروف'}</li>
                                <li>القطاع: ${existingRecord?.keta3 || 'غير معروف'}</li>
                            </ul>
                            <hr>
                            <p>هل تريد إضافة هذا الرقم كسجل جديد؟</p>
                            <p style="color: #dc3545; font-size: 12px;">⚠️ إضافة رقم مكرر قد يسبب مشاكل في التقارير</p>
                        </div>
                    `,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "✅ نعم، أضف كسجل جديد",
                    cancelButtonText: "❌ إلغاء",
                    confirmButtonColor: "#10b981",
                    cancelButtonColor: "#ef4444"
                });

                if (!result.isConfirmed) {
                    return;
                }
            }
        }

        const snap = await get(ref(db, "Ayat/meterdata"));
        let list = [];
        if (snap.exists()) {
            const val = snap.val();
            list = Array.isArray(val) ? val : Object.values(val);
        }

        const finalData = {
            ...fields,
            meternumber: cleanedMeterNo,
            metercode: cleanedMco,
            calibrationdate: fields.calibrationdate,
            enterdate: fields.enterdate
        };

        if (currentEditOriginalIndex !== null && currentEditOriginalIndex >= 0 && currentEditOriginalIndex < list.length) {
            list[currentEditOriginalIndex] = finalData;
            await set(ref(db, "Ayat/meterdata"), list);
            Swal.fire("تم التحديث", "تم تحديث البيانات بنجاح", "success");
        } else {
            list.push(finalData);
            await set(ref(db, "Ayat/meterdata"), list);
            existingMeterNumbersCache.add(cleanedMeterNo);
            if (cleanedMco) existingMcoCache.add(cleanedMco);
            Swal.fire("تم الحفظ", "تم إضافة البيانات بنجاح", "success");
        }

        window.resetUI();
        await loadDataForModal();
        await updateCaches();

    } catch (error) {
        console.error("Error in quickSave:", error);
        Swal.fire("خطأ", "حدث خطأ أثناء الاتصال بقاعدة البيانات", "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = "💾 حفظ";
        }
    }
};

// Edit record
window.editRow = async (filteredIndex) => {
    if (filteredIndex < 0 || filteredIndex >= filteredData.length) {
        return Swal.fire("خطأ", "السجل غير موجود", "error");
    }

    const item = filteredData[filteredIndex];
    const originalIndex = item.__originalIndex;

    const snap = await get(ref(db, "Ayat/meterdata"));
    if (!snap.exists()) return Swal.fire("خطأ", "لا توجد بيانات", "error");

    let list = Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val());
    if (originalIndex < 0 || originalIndex >= list.length) {
        return Swal.fire("خطأ", "السجل غير موجود في قاعدة البيانات", "error");
    }

    const d = list[originalIndex];

    document.getElementById("keta3").value = d.keta3 || "";
    document.getElementById("handsa").value = d.handsa || "";
    document.getElementById("calib_date").value = d.calibrationdate || "";
    document.getElementById("enter_date").value = d.enterdate || "";
    document.getElementById("mname").value = d.metername || "";
    document.getElementById("mno").value = d.meternumber || "";
    document.getElementById("mco").value = d.metercode || "";
    document.getElementById("nashattype").value = d.nashattype || "";
    document.getElementById("mtype").value = d.metertype || "";
    document.getElementById("munip").value = d.result || "";
    document.getElementById("notes").value = d.notes || "";

    currentEditOriginalIndex = originalIndex;
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.innerHTML = "🔄 تحديث البيانات";
        saveBtn.style.background = "linear-gradient(135deg, #f39c12, #e67e22)";
    }

    Swal.fire({
        title: "جاهز للتعديل",
        text: "تم تحميل السجل. قم بالتعديل ثم اضغط تحديث",
        icon: "info",
        timer: 2000,
        showConfirmButton: false
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
};

// Delete record
window.deleteRow = async (filteredIndex) => {
    if (filteredIndex < 0 || filteredIndex >= filteredData.length) {
        return Swal.fire("خطأ", "السجل غير موجود", "error");
    }

    const item = filteredData[filteredIndex];
    const originalIndex = item.__originalIndex;

    const confirmDel = await Swal.fire({
        title: "حذف السجل؟",
        html: `<strong>رقم العداد:</strong> ${item.meternumber || 'غير معروف'}<br>
           <strong>اسم المشترك:</strong> ${item.metername || 'غير معروف'}`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        confirmButtonText: "نعم، احذف",
        cancelButtonText: "إلغاء"
    });

    if (confirmDel.isConfirmed) {
        try {
            const snap = await get(ref(db, "Ayat/meterdata"));
            let list = snap.exists() ? (Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val())) : [];

            if (originalIndex >= 0 && originalIndex < list.length) {
                const deletedNumber = cleanNumericString(list[originalIndex]?.meternumber);
                const deletedMco = cleanNumericString(list[originalIndex]?.metercode);
                list.splice(originalIndex, 1);
                await set(ref(db, "Ayat/meterdata"), list);

                if (deletedNumber) {
                    existingMeterNumbersCache.delete(deletedNumber);
                }
                if (deletedMco) {
                    existingMcoCache.delete(deletedMco);
                }

                if (currentEditOriginalIndex === originalIndex) window.resetUI();
                await loadDataForModal();
                Swal.fire("تم الحذف", "تم حذف السجل بنجاح", "success");
            } else {
                Swal.fire("خطأ", "السجل غير موجود", "error");
            }
        } catch (error) {
            console.error("Delete error:", error);
            Swal.fire("خطأ", "حدث خطأ أثناء الحذف", "error");
        }
    }
};

// ==================== DATA DISPLAY & FILTERING ====================

// Load data from Firebase
window.loadDataForModal = async () => {
    try {
        const snap = await get(ref(db, "Ayat/meterdata"));
        if (!snap.exists()) {
            allData = [];
            filteredData = [];
            renderPage();
            return;
        }

        const data = snap.val();
        allData = Array.isArray(data) ? data : Object.values(data);

        filteredData = allData.map((d, i) => ({ ...d, __originalIndex: i }));

        filteredData.sort((a, b) => {
            const dateA = parseDate(a.calibrationdate) || new Date(0);
            const dateB = parseDate(b.calibrationdate) || new Date(0);
            return dateB - dateA;
        });

        existingMeterNumbersCache.clear();
        existingMcoCache.clear();
        filteredData.forEach(item => {
            if (item.meternumber) {
                existingMeterNumbersCache.add(cleanNumericString(item.meternumber));
            }
            if (item.metercode) {
                existingMcoCache.add(normalizeMeterCode(item.metercode));
            }
        });

        currentPage = 1;
        renderPage();
    } catch (error) {
        console.error("Error loading data:", error);
        Swal.fire("خطأ", "حدث خطأ في تحميل البيانات", "error");
    }
};

// Render current page
function renderPage() {
    const body = document.getElementById("modalBody");
    if (!body) return;

    if (filteredData.length === 0) {
        body.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:40px;">📭 لا توجد بيانات</td></tr>`;
        const rowCountEl = document.getElementById("rowCount");
        if (rowCountEl) rowCountEl.innerText = 0;
        const dupCountEl = document.getElementById("duplicateCount");
        if (dupCountEl) dupCountEl.style.display = "none";
        updatePaginationControls();
        return;
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredData.slice(start, start + ITEMS_PER_PAGE);

    const duplicateCounts = {};
    filteredData.forEach(item => {
        const key = normalizeDuplicateValue(getDuplicateSourceValue(item, duplicateReferenceMode), duplicateReferenceMode);
        if (key) {
            duplicateCounts[key] = (duplicateCounts[key] || 0) + 1;
        }
    });

    body.innerHTML = pageItems.map((d, idx) => {
        const key = normalizeDuplicateValue(getDuplicateSourceValue(d, duplicateReferenceMode), duplicateReferenceMode);
        const isDuplicate = !!key && (duplicateCounts[key] || 0) > 1;
        const globalIndex = start + idx;
        return `
            <tr>
                <td>${start + idx + 1}</td>
                <td>${d.keta3 || ''}</td>
                <td>${d.handsa || ''}</td>
                <td>${formatDateForDisplay(d.calibrationdate)}</td>
                <td>${formatDateForDisplay(d.enterdate)}</td>
                <td>${d.metername || ''}</td>
                <td>${d.metercode || ''}</td>
                <td>${d.nashattype || ''}</td>
                <td>${d.metertype || ''}</td>
                <td><strong>${d.meternumber || ''}</strong></td>
                <td>${d.result || ''}</td>
                <td>${d.notes || ''}</td>
                <td class="action-buttons">
                    <button class="btn-edit" data-index="${globalIndex}" title="تعديل">✏️</button>
                    <button class="btn-del" data-index="${globalIndex}" title="حذف">🗑</button>
                </td>
             </tr>
        `;
    }).join("");

    const rowCountEl = document.getElementById("rowCount");
    if (rowCountEl) rowCountEl.innerText = filteredData.length;

    const duplicateCount = Object.values(duplicateCounts).filter(c => c > 1).length;
    const dupSpan = document.getElementById("duplicateCount");
    const showBtn = document.getElementById("showDuplicatesBtn");
    const dupLabel = document.getElementById("duplicateLabel");

    if (dupSpan) {
        if (duplicateCount > 0) {
            dupSpan.style.display = "inline";
            const dupNumEl = document.getElementById("duplicateNum");
            if (dupNumEl) dupNumEl.innerText = duplicateCount;
            if (dupLabel) dupLabel.innerText = getDuplicateReferenceLabel(duplicateReferenceMode);
            if (showBtn) showBtn.style.display = "inline-block";
        } else {
            dupSpan.style.display = "none";
            if (showBtn) showBtn.style.display = "none";
        }
    }

    updatePaginationControls();
}

// Update pagination buttons
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
    const pageInfo = document.getElementById("pageInfo");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    if (pageInfo) pageInfo.textContent = `الصفحة ${currentPage} من ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

// Pagination navigation
window.nextPage = () => {
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderPage();
    }
};

window.prevPage = () => {
    if (currentPage > 1) {
        currentPage--;
        renderPage();
    }
};

// Filter table data
window.filterTable = () => {
    const filters = {
        keta3: normalizeText(document.getElementById("f0")?.value || ""),
        handsa: normalizeText(document.getElementById("f1")?.value || ""),
        calibDateFrom: document.getElementById("f2")?.value || "",
        calibDateTo: document.getElementById("f3")?.value || "",
        entryDateFrom: document.getElementById("f11")?.value || "",
        entryDateTo: document.getElementById("f12")?.value || "",
        name: normalizeText(document.getElementById("f4")?.value || ""),
        code: normalizeText(document.getElementById("f5")?.value || ""),
        nashat: normalizeText(document.getElementById("f6")?.value || ""),
        mType: normalizeText(document.getElementById("f7")?.value || ""),
        mNo: normalizeText(document.getElementById("f8")?.value || ""),
        result: normalizeText(document.getElementById("f9")?.value || ""),
        notes: normalizeText(document.getElementById("f10")?.value || "")
    };

    filteredData = allData.map((d, i) => ({ ...d, __originalIndex: i })).filter(d => {
        const rowCalibDate = normalizeText(d.calibrationdate);
        const rowEnterDate = normalizeText(d.enterdate);

        let calibDateMatch = true;
        if (filters.calibDateFrom || filters.calibDateTo) {
            const rowDate = parseDate(rowCalibDate);
            if (rowDate) {
                if (filters.calibDateFrom) {
                    const fromDate = new Date(filters.calibDateFrom);
                    fromDate.setHours(0, 0, 0, 0);
                    if (rowDate < fromDate) calibDateMatch = false;
                }
                if (filters.calibDateTo && calibDateMatch) {
                    const toDate = new Date(filters.calibDateTo);
                    toDate.setHours(23, 59, 59, 999);
                    if (rowDate > toDate) calibDateMatch = false;
                }
            }
        }

        let entryDateMatch = true;
        if (filters.entryDateFrom || filters.entryDateTo) {
            const rowDate = parseDate(rowEnterDate);
            if (rowDate) {
                if (filters.entryDateFrom) {
                    const fromDate = new Date(filters.entryDateFrom);
                    fromDate.setHours(0, 0, 0, 0);
                    if (rowDate < fromDate) entryDateMatch = false;
                }
                if (filters.entryDateTo && entryDateMatch) {
                    const toDate = new Date(filters.entryDateTo);
                    toDate.setHours(23, 59, 59, 999);
                    if (rowDate > toDate) entryDateMatch = false;
                }
            }
        }

        return calibDateMatch && entryDateMatch &&
            (!filters.keta3 || normalizeText(d.keta3) === filters.keta3) &&
            (!filters.handsa || normalizeText(d.handsa) === filters.handsa) &&
            normalizeText(d.metername).includes(filters.name) &&
            normalizeText(d.metercode).includes(filters.code) &&
            normalizeText(d.nashattype).includes(filters.nashat) &&
            normalizeText(d.metertype).includes(filters.mType) &&
            normalizeText(d.meternumber).includes(filters.mNo) &&
            normalizeText(d.result).includes(filters.result) &&
            normalizeText(d.notes).includes(filters.notes);
    });

    currentPage = 1;
    renderPage();
};

// Clear all filters
window.clearFilters = () => {
    const filterIds = ["f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12"];
    filterIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    window.filterTable();
};

// Show duplicate numbers
window.showDuplicateNumbers = () => {
    const counts = {};
    filteredData.forEach(item => {
        const key = normalizeDuplicateValue(getDuplicateSourceValue(item, duplicateReferenceMode), duplicateReferenceMode);
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
    });

    const duplicates = Object.entries(counts).filter(([, c]) => c > 1);

    if (duplicates.length === 0) {
        return Swal.fire("لا توجد مكررات", `جميع ${getDuplicateReferenceLabel(duplicateReferenceMode)} فريدة`, "info");
    }

    const label = getDuplicateReferenceLabel(duplicateReferenceMode);
    let html = `<div dir="rtl"><h4 style="color:#dc3545">🔴 ${label} المكررة (${duplicates.length})</h4>
              <table style="width:100%; border-collapse:collapse;">
              <thead><tr style="background:#f8f9fa"><th style="padding:8px">${label}</th><th>التكرار</th></tr></thead><tbody>`;
    duplicates.forEach(([num, count]) => {
        html += `<tr><td style="padding:8px; border-bottom:1px solid #ddd"><strong>${num}</strong></td>
             <td style="text-align:center">${count}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    Swal.fire({ title: "المكررات", html, width: 500, confirmButtonText: "حسناً" });
};

window.setDuplicateReferenceMode = (mode) => {
    if (mode === "metercode") {
        duplicateReferenceMode = mode;
        renderPage();
    }
};

window.showDuplicateRows = (value, mode = duplicateReferenceMode) => {
    const normalizedValue = normalizeDuplicateValue(value, mode);

    if (!normalizedValue) {
        return Swal.fire("تنبيه", "لا يوجد تكرار لعرضه", "info");
    }

    const duplicates = filteredData.filter(item => normalizeDuplicateValue(getDuplicateSourceValue(item, mode), mode) === normalizedValue);

    if (duplicates.length === 0) {
        return Swal.fire("لا توجد مكررات", `لا يوجد سجل مكرر لهذا ${getDuplicateReferenceLabel(mode)}`, "info");
    }

    window.showDuplicateReport(duplicates, mode);
};

// ==================== FAST EXPORT ====================

// Export to Excel
window.exportExcel = () => {
    if (!filteredData.length) {
        return Swal.fire("تنبيه", "لا توجد بيانات للتصدير", "warning");
    }

    const headers = ["م", "القطاع", "الهندسة", "تاريخ الفحص", "تاريخ الإدخال", "اسم المشترك", "كود المشترك", "النشاط", "نوع العداد", "رقم العداد", "نتيجة الفحص", "ملاحظات"];
    const rows = [headers];

    filteredData.forEach((d, i) => {
        rows.push([
            i + 1,
            d.keta3 || "",
            d.handsa || "",
            formatDateForDisplay(d.calibrationdate),
            formatDateForDisplay(d.enterdate),
            d.metername || "",
            d.metercode || "",
            d.nashattype || "",
            d.metertype || "",
            d.meternumber || "",
            d.result || "",
            d.notes || ""
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "بيانات_التلاعبات");
    const date = new Date().toLocaleDateString('ar-EG').replace(/\//g, '-');
    XLSX.writeFile(wb, `سجل_التلاعبات_${date}.xlsx`);
    Swal.fire("تم التصدير", `تم تصدير ${filteredData.length} سجل`, "success");
};

// ==================== DYNAMIC OPTIONS ====================

// Add new option to select dropdowns
window.checkNewOption = async (selectEl) => {
    if (selectEl.value === "ADD_NEW") {
        const { value: newVal } = await Swal.fire({
            title: "إضافة خيار جديد",
            input: "text",
            inputPlaceholder: "اكتب الخيار الجديد هنا...",
            showCancelButton: true,
            confirmButtonText: "إضافة",
            cancelButtonText: "إلغاء"
        });

        if (newVal && newVal.trim()) {
            const opt = new Option(newVal.trim(), newVal.trim());
            selectEl.add(opt, selectEl.options[selectEl.options.length - 1]);
            selectEl.value = newVal.trim();
        } else {
            selectEl.value = "";
        }
    }
};

// ==================== SHOW MODAL ====================

function bindModalControls() {
    const popup = Swal.getPopup();
    if (!popup || popup.dataset.modalHandlersBound === "true") {
        return;
    }

    popup.dataset.modalHandlersBound = "true";

    const addListener = (selector, eventName, handler) => {
        const element = popup.querySelector(selector);
        if (element) {
            element.addEventListener(eventName, handler);
        }
    };

    addListener("#showDuplicatesBtn", "click", () => window.showDuplicateNumbers?.());
    addListener("#duplicateFlagBtn", "click", () => window.checkCurrentDuplicates?.());
    addListener(".btn-excel", "click", () => window.exportExcel?.());
    addListener(".btn-refresh", "click", () => window.loadDataForModal?.());
    addListener(".btn-clear-filters", "click", () => window.clearFilters?.());
    addListener("#prevBtn", "click", () => window.prevPage?.());
    addListener("#nextBtn", "click", () => window.nextPage?.());
    addListener("#duplicateReferenceSelect", "change", (event) => window.setDuplicateReferenceMode?.(event.target.value));

    [
        ["#f0", "change"],
        ["#f1", "change"],
        ["#f2", "change"],
        ["#f3", "change"],
        ["#f11", "change"],
        ["#f12", "change"],
        ["#f4", "input"],
        ["#f5", "input"],
        ["#f6", "input"],
        ["#f7", "input"],
        ["#f8", "input"],
        ["#f9", "input"],
        ["#f10", "input"]
    ].forEach(([selector, eventName]) => {
        addListener(selector, eventName, () => window.filterTable?.());
    });

    popup.addEventListener("click", (event) => {
        const editButton = event.target.closest(".btn-edit");
        if (editButton) {
            event.preventDefault();
            const index = Number(editButton.dataset.index);
            if (!Number.isNaN(index)) {
                window.editRow(index);
            }
            return;
        }

        const deleteButton = event.target.closest(".btn-del");
        if (deleteButton) {
            event.preventDefault();
            const index = Number(deleteButton.dataset.index);
            if (!Number.isNaN(index)) {
                window.deleteRow(index);
            }
            return;
        }

        const duplicateButton = event.target.closest(".duplicate-flag");
        if (duplicateButton) {
            event.preventDefault();
            window.showDuplicateRows?.(duplicateButton.dataset.value, duplicateButton.dataset.mode || duplicateReferenceMode);
        }
    });
}

window.showData = async () => {
    Swal.fire({
        title: "📋 سجل البيانات",
        html: document.getElementById("tableTemplate")?.innerHTML || "",
        width: "98%",
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: async () => {
            await loadDataForModal();
            bindModalControls();
        }
    });
};

// ==================== INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM loaded, initializing...");
    
    const enterDateInput = document.getElementById("enter_date");
    if (enterDateInput && !enterDateInput.value) {
        enterDateInput.value = new Date().toISOString().split('T')[0];
    }
    
    await updateCaches();
    console.log("Initialization complete");
});

console.log("Ayat.js loaded successfully - with duplicate report feature");