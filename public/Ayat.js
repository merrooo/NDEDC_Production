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

// ==================== HELPER FUNCTIONS ====================

// Clean numeric string (remove non-digits)
function cleanNumericString(value) {
    if (!value) return "";
    return String(value).replace(/\D/g, '').trim();
}

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
                    existingMcoCache.add(cleanNumericString(item.metercode));
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

// ==================== BULK EXCEL UPLOAD HANDLER ====================
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
                text: `تم رصد ${rows.length} سجل بالملف. جاري معالجة الكود الموحد والشاسيه...`,
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            // Get current data to determine next index
            const snap = await get(ref(db, "Ayat/meterdata"));
            let currentList = [];
            if (snap.exists()) {
                const val = snap.val();
                currentList = Array.isArray(val) ? val : Object.values(val);
            }
            
            let currentServerIndex = currentList.length;

            const finalBatchUpdates = {};
            let duplicateCount = 0;
            let successCount = 0;

            for (let row of rows) {
                // خريطة مطابقة ذكية تقرأ الأسماء من ملفك الأصلي بدقة متناهية
                const mcoVal = cleanNumericString(row["كود المشترك"] || row["metercode"] || row["الكود الرقمي الموحد"] || row["MCO"]);
                const mNumber = cleanNumericString(row["الشاسيه"] || row["meternumber"] || row["رقم العداد"]);
                
                if (!mNumber && !mcoVal) {
                    continue; 
                }

                // التحقق المزدوج اللحظي لمنع التكرار
                const isDuplicateMco = mcoVal && existingMcoCache.has(mcoVal);
                const isDuplicateNumber = mNumber && existingMeterNumbersCache.has(mNumber);

                if (isDuplicateMco || isDuplicateNumber) {
                    duplicateCount++;
                    console.log(`Duplicate skipped: MCO=${mcoVal}, Meter=${mNumber}`);
                    continue;
                }

                // إعداد وقراءة باقي الأعمدة العربية من ملف الـ Excel الخاص بك
                const preparedRecord = {
                    calibrationdate: row["تاريخ الفحص"] || row["تاريخ الفحص المعملي"] || row["calibrationdate"] ? String(row["تاريخ الفحص"] || row["تاريخ الفحص المعملي"] || row["calibrationdate"]) : "",
                    enterdate: row["تاريخ الإدخال"] || row["تاريخ التسجيل بالنظام"] || row["enterdate"] ? String(row["تاريخ الإدخال"] || row["تاريخ التسجيل بالنظام"] || row["enterdate"]) : new Date().toISOString().split('T')[0],
                    handsa: String(row["الهندسة"] || row["الهندسة / الفرع"] || row["handsa"] || ""),
                    keta3: String(row["القطاع"] || row["القطاع التابع له"] || row["keta3"] || ""),
                    metercode: mcoVal,
                    metername: String(row["اسم المشترك"] || row["اسم المشترك الثلاثي"] || row["metername"] || ""),
                    meternumber: mNumber,
                    metertype: String(row["نوع العداد"] || row["طراز ونوع العداد"] || row["metertype"] || ""),
                    nashattype: String(row["النشاط"] || row["نوع النشاط الحركي"] || row["nashattype"] || ""),
                    notes: String(row["ملاحظات"] || row["الملاحظات"] || row["notes"] || ""),
                    result: String(row["نتيجة الفحص"] || row["النتيجة"] || row["result"] || "")
                };

                finalBatchUpdates[currentServerIndex] = preparedRecord;
                
                // تحديث مؤقت للكاش لضمان عدم حدوث تكرار ذاتي في نفس الملف
                if (mcoVal) existingMcoCache.add(mcoVal);
                if (mNumber) existingMeterNumbersCache.add(mNumber);
                
                currentServerIndex++;
                successCount++;
            }

            if (successCount > 0) {
                // Get current list and merge
                const currentSnap = await get(ref(db, "Ayat/meterdata"));
                let existingList = [];
                if (currentSnap.exists()) {
                    const val = currentSnap.val();
                    existingList = Array.isArray(val) ? val : Object.values(val);
                }
                
                // Convert batch updates to array and merge
                const newRecords = Object.values(finalBatchUpdates);
                const updatedList = [...existingList, ...newRecords];
                
                // Save the entire updated list
                await set(ref(db, "Ayat/meterdata"), updatedList);
                
                Swal.fire({
                    icon: duplicateCount > 0 ? 'warning' : 'success',
                    title: 'اكتملت معالجة ورفع الملف السحابي',
                    html: `
                        <div style="text-align: right; direction: rtl; font-size: 14px; line-height: 1.6;">
                            <p style="color: #3fb950; font-weight: bold;"><i class="fa-solid fa-cloud-arrow-up"></i> تم بنجاح رفع: ${successCount} سجل جديد.</p>
                            ${duplicateCount > 0 ? `<p style="color: #f85149; font-weight: bold; margin-top: 8px;"><i class="fa-solid fa-triangle-exclamation"></i> تنبيه: تم رصد وتخطي ( ${duplicateCount} ) سجل مكرر مسبقاً بالسيرفر لحماية بياناتك.</p>` : ''}
                        </div>
                    `
                });
                
                // Reload data after successful upload
                await loadDataForModal();
                await updateCaches();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'البيانات مسجلة بالكامل',
                    text: `جميع الأكواد الموحدة (MCO) والعدادات بالملف (عددها: ${duplicateCount}) مسجلة مسبقاً بقاعدة البيانات الحالية!`
                });
            }

        } catch (err) {
            console.error("Bulk Upload Crash:", err);
            Swal.fire("فشل التحليل", "حدث خطأ أثناء معالجة ملف الـ Excel، تأكد من سلامة صياغة وتنسيق الملف.", "error");
        } finally {
            // Clear the file input
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
            // Create file input dynamically if it doesn't exist
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
        const cleanedMco = cleanNumericString(fields.metercode);

        // Use cache for faster duplicate checking
        if (currentEditOriginalIndex === null) {
            if (existingMeterNumbersCache.has(cleanedMeterNo)) {
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

        // Update caches
        existingMeterNumbersCache.clear();
        existingMcoCache.clear();
        filteredData.forEach(item => {
            if (item.meternumber) {
                existingMeterNumbersCache.add(cleanNumericString(item.meternumber));
            }
            if (item.metercode) {
                existingMcoCache.add(cleanNumericString(item.metercode));
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
            const clean = cleanNumericString(item.meternumber);
            if (clean) meterCounts[clean] = (meterCounts[clean] || 0) + 1;
        }
    });

    body.innerHTML = pageItems.map((d, idx) => {
        const isDuplicate = meterCounts[cleanNumericString(d.meternumber)] > 1;
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
    const meterNumbers = filteredData.map(item => cleanNumericString(item.meternumber)).filter(n => n);
    const counts = {};
    meterNumbers.forEach(num => counts[num] = (counts[num] || 0) + 1);
    const duplicates = Object.entries(counts).filter(([, c]) => c > 1);

    if (duplicates.length === 0) {
        return Swal.fire("لا توجد مكررات", "جميع الأرقام فريدة", "info");
    }

    let html = `<div dir="rtl"><h4 style="color:#dc3545">🔴 الأرقام المكررة (${duplicates.length})</h4>
              <table style="width:100%; border-collapse:collapse;">
              <thead><tr style="background:#f8f9fa"><th style="padding:8px">رقم العداد</th><th>التكرار</th></td></thead><tbody>`;
    duplicates.forEach(([num, count]) => {
        html += `<tr><td style="padding:8px; border-bottom:1px solid #ddd"><strong>${num}</strong></td>
             <td style="text-align:center">${count}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    Swal.fire({ title: "المكررات", html, width: 500, confirmButtonText: "حسناً" });
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

// ==================== INITIALIZATION ====================

// Initialize caches on page load
document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM loaded, initializing...");
    
    const enterDateInput = document.getElementById("enter_date");
    if (enterDateInput && !enterDateInput.value) {
        enterDateInput.value = new Date().toISOString().split('T')[0];
    }
    
    await updateCaches();
    console.log("Initialization complete");
});

console.log("Ayat.js loaded successfully - with fixed bulk Excel upload handler");