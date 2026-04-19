import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-database.js";
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

// Cache for existing meter numbers (for faster duplicate checking)
let existingMeterNumbersCache = new Set();

// ==================== DATE HELPER FUNCTIONS ====================

// Convert any date format to DD/MM/YYYY
function convertToDDMMYYYY(dateStr) {
    if (!dateStr) return "";
    
    try {
        // If it's already a Date object
        if (dateStr instanceof Date) {
            const day = String(dateStr.getDate()).padStart(2, '0');
            const month = String(dateStr.getMonth() + 1).padStart(2, '0');
            const year = dateStr.getFullYear();
            return `${day}/${month}/${year}`;
        }
        
        // Convert to string if needed
        const str = String(dateStr).trim();
        
        // Check for Excel serial number (dates stored as numbers)
        if (typeof dateStr === 'number' || /^\d+$/.test(str)) {
            const serial = parseInt(str);
            if (serial > 0 && serial < 100000) {
                // Excel serial date conversion (days since 1900-01-01)
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
        
        // Try to parse common date formats
        let day, month, year;
        
        // Format: YYYY-MM-DD
        if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const parts = str.split('-');
            year = parts[0];
            month = parts[1];
            day = parts[2];
            return `${day}/${month}/${year}`;
        }
        
        // Format: MM/DD/YYYY or DD/MM/YYYY
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
                // Check if first part is year (YYYY/MM/DD)
                if (parts[0].length === 4) {
                    year = parts[0];
                    month = parts[1].padStart(2, '0');
                    day = parts[2].padStart(2, '0');
                    return `${day}/${month}/${year}`;
                }
                // Assume DD/MM/YYYY
                day = parts[0].padStart(2, '0');
                month = parts[1].padStart(2, '0');
                year = parts[2];
                // If year is 2 digits, convert to 4 digits
                if (year.length === 2) {
                    year = parseInt(year) > 30 ? `19${year}` : `20${year}`;
                }
                return `${day}/${month}/${year}`;
            }
        }
        
        // Format: DD-MM-YYYY
        if (str.includes('-')) {
            const parts = str.split('-');
            if (parts.length === 3) {
                // Check if first part is year (YYYY-MM-DD)
                if (parts[0].length === 4) {
                    year = parts[0];
                    month = parts[1].padStart(2, '0');
                    day = parts[2].padStart(2, '0');
                    return `${day}/${month}/${year}`;
                }
                // Assume DD-MM-YYYY
                day = parts[0].padStart(2, '0');
                month = parts[1].padStart(2, '0');
                year = parts[2];
                if (year.length === 2) {
                    year = parseInt(year) > 30 ? `19${year}` : `20${year}`;
                }
                return `${day}/${month}/${year}`;
            }
        }
        
        // Try using JavaScript Date parsing as last resort
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
        // If already in DD/MM/YYYY format
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
        // If already in DD/MM/YYYY format, convert to DD-MM-YYYY for display
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

// Clean meter number (remove non-digits)
function cleanMeterNumber(value) {
    return String(value || "").replace(/\D/g, '').trim();
}

// Update cache of existing meter numbers
async function updateMeterNumberCache() {
    try {
        const snap = await get(ref(db, "Ayat/meterdata"));
        if (snap.exists()) {
            const data = snap.val();
            const list = Array.isArray(data) ? data : Object.values(data);
            existingMeterNumbersCache.clear();
            list.forEach(item => {
                if (item?.meternumber) {
                    existingMeterNumbersCache.add(cleanMeterNumber(item.meternumber));
                }
            });
        }
    } catch (error) {
        console.warn("Error updating cache:", error);
    }
}

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
        const cleanedMeterNo = cleanMeterNumber(fields.meternumber);

        // Use cache for faster duplicate checking
        if (currentEditOriginalIndex === null && existingMeterNumbersCache.has(cleanedMeterNo)) {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }

            // Find existing record details
            const snap = await get(ref(db, "Ayat/meterdata"));
            let list = [];
            if (snap.exists()) {
                const val = snap.val();
                list = Array.isArray(val) ? val : Object.values(val);
            }
            const existingRecord = list.find(item => cleanMeterNumber(item.meternumber) === cleanedMeterNo);

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

        const snap = await get(ref(db, "Ayat/meterdata"));
        let list = [];
        if (snap.exists()) {
            const val = snap.val();
            list = Array.isArray(val) ? val : Object.values(val);
        }

        const finalData = {
            ...fields,
            meternumber: cleanedMeterNo,
            calibrationdate: formatDateForStorage(fields.calibrationdate),
            enterdate: formatDateForStorage(fields.enterdate)
        };

        if (currentEditOriginalIndex !== null && currentEditOriginalIndex >= 0 && currentEditOriginalIndex < list.length) {
            list[currentEditOriginalIndex] = finalData;
            await set(ref(db, "Ayat/meterdata"), list);
            Swal.fire("تم التحديث", "تم تحديث البيانات بنجاح", "success");
        } else {
            list.push(finalData);
            await set(ref(db, "Ayat/meterdata"), list);
            existingMeterNumbersCache.add(cleanedMeterNo);
            Swal.fire("تم الحفظ", "تم إضافة البيانات بنجاح", "success");
        }

        window.resetUI();

        const modal = document.querySelector('.swal2-container');
        if (modal && modal.style.display !== 'none') {
            await loadDataForModal();
        }

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
    document.getElementById("calib_date").value = formatDateForStorage(d.calibrationdate) || "";
    document.getElementById("enter_date").value = formatDateForStorage(d.enterdate) || "";
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
                const deletedNumber = cleanMeterNumber(list[originalIndex]?.meternumber);
                list.splice(originalIndex, 1);
                await set(ref(db, "Ayat/meterdata"), list);

                if (deletedNumber) {
                    existingMeterNumbersCache.delete(deletedNumber);
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

        // Update cache
        existingMeterNumbersCache.clear();
        filteredData.forEach(item => {
            if (item.meternumber) {
                existingMeterNumbersCache.add(cleanMeterNumber(item.meternumber));
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

    const meterCounts = {};
    filteredData.forEach(item => {
        if (item.meternumber) {
            const clean = cleanMeterNumber(item.meternumber);
            if (clean) meterCounts[clean] = (meterCounts[clean] || 0) + 1;
        }
    });

    body.innerHTML = pageItems.map((d, idx) => {
        const isDuplicate = meterCounts[cleanMeterNumber(d.meternumber)] > 1;
        const globalIndex = start + idx;
        return `
            <tr class="${isDuplicate ? 'duplicate-row' : ''}">
                <td>${start + idx + 1}</td>
                <td>${d.keta3 || ''}</td>
                <td>${d.handsa || ''}</td>
                <td>${formatDateForDisplay(d.calibrationdate)}</td>
                <td>${formatDateForDisplay(d.enterdate)}</td>
                <td>${d.metername || ''}</td>
                <td>${d.metercode || ''}</td>
                <td>${d.nashattype || ''}</td>
                <td>${d.metertype || ''}</td>
                <td><strong>${d.meternumber || ''}</strong>${isDuplicate ? ' 🔴' : ''}</td>
                <td>${d.result || ''}</td>
                <td>${d.notes || ''}</td>
                <td class="action-buttons">
                    <button class="btn-edit" onclick="window.editRow(${globalIndex})" title="تعديل">✏️</button>
                    <button class="btn-del" onclick="window.deleteRow(${globalIndex})" title="حذف">🗑</button>
                </td>
            </tr>
        `;
    }).join("");

    const rowCountEl = document.getElementById("rowCount");
    if (rowCountEl) rowCountEl.innerText = filteredData.length;

    const duplicateCount = Object.values(meterCounts).filter(c => c > 1).length;
    const dupSpan = document.getElementById("duplicateCount");
    const showBtn = document.getElementById("showDuplicatesBtn");

    if (dupSpan) {
        if (duplicateCount > 0) {
            dupSpan.style.display = "inline";
            const dupNumEl = document.getElementById("duplicateNum");
            if (dupNumEl) dupNumEl.innerText = duplicateCount;
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
        keta3: document.getElementById("f0")?.value || "",
        handsa: document.getElementById("f1")?.value || "",
        calibDateFrom: document.getElementById("f2")?.value || "",
        calibDateTo: document.getElementById("f3")?.value || "",
        entryDateFrom: document.getElementById("f11")?.value || "",
        entryDateTo: document.getElementById("f12")?.value || "",
        name: (document.getElementById("f4")?.value || "").toLowerCase(),
        code: (document.getElementById("f5")?.value || "").toLowerCase(),
        nashat: (document.getElementById("f6")?.value || "").toLowerCase(),
        mType: (document.getElementById("f7")?.value || "").toLowerCase(),
        mNo: (document.getElementById("f8")?.value || "").toLowerCase(),
        result: (document.getElementById("f9")?.value || "").toLowerCase(),
        notes: (document.getElementById("f10")?.value || "").toLowerCase()
    };

    filteredData = allData.map((d, i) => ({ ...d, __originalIndex: i })).filter(d => {
        // Calibration Date filter
        let calibDateMatch = true;
        if (filters.calibDateFrom || filters.calibDateTo) {
            const rowDate = parseDate(d.calibrationdate);
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

        // Entry Date filter
        let entryDateMatch = true;
        if (filters.entryDateFrom || filters.entryDateTo) {
            const rowDate = parseDate(d.enterdate);
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
            (!filters.keta3 || d.keta3 === filters.keta3) &&
            (!filters.handsa || d.handsa === filters.handsa) &&
            (d.metername || "").toLowerCase().includes(filters.name) &&
            (d.metercode || "").toLowerCase().includes(filters.code) &&
            (d.nashattype || "").toLowerCase().includes(filters.nashat) &&
            (d.metertype || "").toLowerCase().includes(filters.mType) &&
            (d.meternumber || "").toLowerCase().includes(filters.mNo) &&
            (d.result || "").toLowerCase().includes(filters.result) &&
            (d.notes || "").toLowerCase().includes(filters.notes);
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
    const meterNumbers = filteredData.map(item => cleanMeterNumber(item.meternumber)).filter(n => n);
    const counts = {};
    meterNumbers.forEach(num => counts[num] = (counts[num] || 0) + 1);
    const duplicates = Object.entries(counts).filter(([, c]) => c > 1);

    if (duplicates.length === 0) {
        return Swal.fire("لا توجد مكررات", "جميع الأرقام فريدة", "info");
    }

    let html = `<div dir="rtl"><h4 style="color:#dc3545">🔴 الأرقام المكررة (${duplicates.length})</h4>
              <table style="width:100%; border-collapse:collapse;">
              <thead><tr style="background:#f8f9fa"><th style="padding:8px">رقم العداد</th><th>التكرار</th></tr></thead><tbody>`;
    duplicates.forEach(([num, count]) => {
        html += `<tr><td style="padding:8px; border-bottom:1px solid #ddd"><strong>${num}</strong></td>
             <td style="text-align:center">${count}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    Swal.fire({ title: "المكررات", html, width: 500, confirmButtonText: "حسناً" });
};

// ==================== FAST EXPORT & IMPORT ====================

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

// Password prompt for Excel upload
window.promptPassword = () => {
    Swal.fire({
        title: "كلمة مرور النظام",
        input: "password",
        inputPlaceholder: "أدخل كلمة المرور",
        showCancelButton: true,
        confirmButtonText: "دخول",
        cancelButtonText: "إلغاء"
    }).then(r => {
        if (r.value === "1") {
            document.getElementById("excelFile")?.click();
        } else if (r.value) {
            Swal.fire("خطأ", "كلمة المرور غير صحيحة", "error");
        }
    });
};

// ULTRA FAST Excel upload handler with date conversion to DD/MM/YYYY
document.getElementById("excelFile")?.addEventListener("change", async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
        return Swal.fire("خطأ", "حجم الملف كبير جداً. الحد الأقصى 20 ميجابايت", "error");
    }

    // Show loading immediately
    Swal.fire({
        title: '⏳ جاري تحميل الملف...',
        html: 'يرجى الانتظار',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // Read file
        const data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error("خطأ في قراءة الملف"));
            reader.readAsArrayBuffer(file);
        });

        // Parse Excel with date handling
        const workbook = XLSX.read(data, { 
            type: 'array', 
            cellDates: true,  // Enable date parsing
            dateNF: 'dd/mm/yyyy'  // Set date format to dd/mm/yyyy
        });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert to JSON with date formatting
        const json = XLSX.utils.sheet_to_json(sheet, { 
            defval: "", 
            raw: false,
            dateNF: 'dd/mm/yyyy'
        });

        if (!json.length) throw new Error("الملف فارغ");

        // Update progress
        Swal.fire({
            title: '🔄 جاري معالجة البيانات...',
            html: '<progress id="uploadProgress" value="0" max="100" style="width: 100%; height: 20px; border-radius: 10px;"></progress><p id="progressText" style="margin-top: 10px;">0%</p>',
            allowOutsideClick: false,
            showConfirmButton: false
        });

        // Get existing data once
        const snap = await get(ref(db, "Ayat/meterdata"));
        let current = [];
        if (snap.exists()) {
            const val = snap.val();
            current = Array.isArray(val) ? val : Object.values(val);
        }

        // Create Set for O(1) lookup
        const existingSet = new Set();
        current.forEach(item => {
            const clean = cleanMeterNumber(item.meternumber);
            if (clean) existingSet.add(clean);
        });

        const getVal = (row, keys) => {
            for (let k of keys) {
                const val = row[k];
                if (val !== undefined && val !== null && String(val).trim()) {
                    return String(val).trim();
                }
            }
            return "";
        };

        const newRecords = [];
        const duplicatesInDB = [];
        const seenInFile = new Set();
        const totalRows = json.length;

        // Get current date for default enterdate (in DD/MM/YYYY format)
        const today = new Date();
        const todayFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

        // Process rows
        for (let i = 0; i < totalRows; i++) {
            const row = json[i];

            // Update progress
            if (i % Math.ceil(totalRows / 20) === 0 || i === totalRows - 1) {
                const percent = Math.round(((i + 1) / totalRows) * 100);
                const progressElem = document.getElementById('uploadProgress');
                const textElem = document.getElementById('progressText');
                if (progressElem) progressElem.value = percent;
                if (textElem) textElem.textContent = `${percent}% - معالجة ${i + 1} من ${totalRows}`;
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            let meterNo = cleanMeterNumber(getVal(row, ["رقم العداد", "meternumber", "Meter No", "meter_no", "رقم", "العداد"]));
            if (!meterNo) continue;

            // Check duplicate in file
            if (seenInFile.has(meterNo)) {
                continue;
            }
            seenInFile.add(meterNo);

            // Check duplicate in database
            if (existingSet.has(meterNo)) {
                duplicatesInDB.push(meterNo);
                continue;
            }

            // Get and convert calibration date to DD/MM/YYYY
            let calibDateRaw = getVal(row, ["تاريخ الفحص", "calibrationdate", "Date", "التاريخ", "تاريخ"]);
            let calibDateFormatted = "";
            if (calibDateRaw) {
                calibDateFormatted = convertToDDMMYYYY(calibDateRaw);
            }

            // Get and convert entry date to DD/MM/YYYY
            let entryDateRaw = getVal(row, ["تاريخ التسجيل", "تاريخ الإدخال", "enterdate", "Entry Date", "تسجيل", "تاريخ التسجيل"]);
            let entryDateFormatted = "";
            if (entryDateRaw) {
                entryDateFormatted = convertToDDMMYYYY(entryDateRaw);
            } else {
                entryDateFormatted = todayFormatted;
            }

            const record = {
                keta3: getVal(row, ["القطاع", "keta3"]),
                handsa: getVal(row, ["الهندسة", "handsa"]),
                calibrationdate: calibDateFormatted,
                enterdate: entryDateFormatted,
                metername: getVal(row, ["اسم المشترك", "metername", "Name", "الاسم"]),
                metercode: getVal(row, ["كود المشترك", "metercode", "Code", "كود"]),
                nashattype: getVal(row, ["النشاط", "nashattype", "Activity"]),
                metertype: getVal(row, ["نوع العداد", "metertype", "Type"]),
                meternumber: meterNo,
                result: getVal(row, ["نتيجة الفحص", "result", "Result"]),
                notes: getVal(row, ["ملاحظات", "notes", "Notes"])
            };

            newRecords.push(record);
            existingSet.add(meterNo);
        }

        // Batch save to Firebase
        let addedCount = 0;
        if (newRecords.length > 0) {
            const updatedList = [...current, ...newRecords];
            await set(ref(db, "Ayat/meterdata"), updatedList);
            addedCount = newRecords.length;

            // Update cache
            newRecords.forEach(record => {
                if (record.meternumber) {
                    existingMeterNumbersCache.add(cleanMeterNumber(record.meternumber));
                }
            });
        }

        // Show result
        let resultHtml = `<div dir="rtl" style="text-align: right;">`;

        if (addedCount > 0) {
            resultHtml += `
                <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="color: #155724; margin: 0 0 10px 0;">✅ تمت الإضافة بنجاح</h4>
                    <p style="font-size: 20px; font-weight: bold; color: #155724;">📊 ${addedCount} عداد جديد</p>
                    <p style="color: #155724; margin-top: 10px; font-size: 12px;">📅 تم تحويل التواريخ إلى صيغة DD/MM/YYYY</p>
                </div>`;
        } else {
            resultHtml += `
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="color: #856404; margin: 0;">⚠️ لم تتم إضافة أي بيانات جديدة</h4>
                    <p style="margin-top: 10px;">جميع الأرقام موجودة مسبقاً</p>
                </div>`;
        }

        if (duplicatesInDB.length > 0) {
            resultHtml += `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 10px; max-height: 200px; overflow-y: auto;">
                    <h5 style="color: #dc3545; margin: 0 0 5px 0;">❌ تم تجاهل ${duplicatesInDB.length} رقماً مكرراً</h5>
                    <div style="font-size: 12px; color: #6c757d;">(موجودة مسبقاً في قاعدة البيانات)</div>
                    <div style="font-size: 11px; margin-top: 8px; color: #495057;">${duplicatesInDB.slice(0, 10).join(', ')}${duplicatesInDB.length > 10 ? '...' : ''}</div>
                </div>`;
        }

        resultHtml += `</div>`;

        await Swal.fire({
            icon: addedCount > 0 ? "success" : "info",
            title: addedCount > 0 ? "🎉 تمت المعالجة بنجاح" : "📋 ملاحظة",
            html: resultHtml,
            confirmButtonText: "حسناً",
            width: 550
        });

        // Refresh data
        await loadDataForModal();

    } catch (error) {
        console.error("Excel upload error:", error);
        await Swal.fire("خطأ", error.message || "حدث خطأ أثناء معالجة الملف", "error");
    } finally {
        document.getElementById("excelFile").value = "";
    }
});

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

window.showData = async () => {
    Swal.fire({
        title: "📋 سجل البيانات",
        html: document.getElementById("tableTemplate")?.innerHTML || "",
        width: "98%",
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => loadDataForModal()
    });
};

// Initialize cache on page load
document.addEventListener("DOMContentLoaded", async () => {
    const enterDateInput = document.getElementById("enter_date");
    if (enterDateInput && !enterDateInput.value) {
        enterDateInput.value = new Date().toISOString().split('T')[0];
    }
    await updateMeterNumberCache();
});

console.log("Ayat.js loaded successfully - with DD/MM/YYYY date conversion");