import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-app.js";
import { getDatabase, ref, get, set, update, remove, child } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-database.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyAnKRhT5xJTBvsQKpW7e9w-hGSbAQJWTSo",
    authDomain: "production1-ae85.firebaseapp.com",
    projectId: "production1-ae85",
    storageBucket: "production1-ae85.firebasestorage.app",
    messagingSenderId: "490438031865",
    appId: "1:490438031865:web:a4a69335989f30cd13a528",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Elements
const displayDate = document.getElementById("currentDateDisplay");
if (displayDate) displayDate.innerText = new Date().toLocaleDateString("ar-EG");

let allArchiveData = [];

// Storage for custom options (saved in localStorage)
let customRemovingReasons = JSON.parse(localStorage.getItem("customRemovingReasons") || "[]");
let customMremovingReports = JSON.parse(localStorage.getItem("customMremovingReports") || "[]");
let customTakheenReasons = JSON.parse(localStorage.getItem("customTakheenReasons") || "[]");

// Store unique values from database for report filters
let uniqueRemovingReasonsFromDB = [];
let uniqueMremovingReportsFromDB = [];
let uniqueTakheenReasonsFromDB = [];
let uniqueMtypesFromDB = [];
let uniqueMconnFromDB = [];
let uniqueKeta3FromDB = [];
let uniqueHandsaFromDB = [];

function formatDate(dateStr) {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    } catch (e) { return dateStr; }
}

// Extract unique values from database records
function extractUniqueValuesFromData() {
    const removingReasonsSet = new Set();
    const mremovingReportsSet = new Set();
    const takheenReasonsSet = new Set();
    const mtypesSet = new Set();
    const mconnSet = new Set();
    const keta3Set = new Set();
    const handsaSet = new Set();

    allArchiveData.forEach(record => {
        if (record.removingfor && record.removingfor.trim()) removingReasonsSet.add(record.removingfor);
        if (record.mremovingfor && record.mremovingfor.trim()) mremovingReportsSet.add(record.mremovingfor);
        if (record.takheenfor && record.takheenfor.trim()) takheenReasonsSet.add(record.takheenfor);
        if (record.mtype && record.mtype.trim()) mtypesSet.add(record.mtype);
        if (record.connection && record.connection.trim()) mconnSet.add(record.connection);
        if (record.keta3 && record.keta3.trim()) keta3Set.add(record.keta3);
        if (record.handsa && record.handsa.trim()) handsaSet.add(record.handsa);
    });

    uniqueRemovingReasonsFromDB = Array.from(removingReasonsSet).sort();
    uniqueMremovingReportsFromDB = Array.from(mremovingReportsSet).sort();
    uniqueTakheenReasonsFromDB = Array.from(takheenReasonsSet).sort();
    uniqueMtypesFromDB = Array.from(mtypesSet).sort();
    uniqueMconnFromDB = Array.from(mconnSet).sort();
    uniqueKeta3FromDB = Array.from(keta3Set).sort();
    uniqueHandsaFromDB = Array.from(handsaSet).sort();
}

// Populate report filters with database values
function populateReportFilters() {
    // Populate نوع العداد filter
    const reportMtype = document.getElementById("report_mtype");
    if (reportMtype) {
        const currentValue = reportMtype.value;
        reportMtype.innerHTML = '<option value="">نوع العداد</option>';
        uniqueMtypesFromDB.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            reportMtype.appendChild(option);
        });
        if (currentValue && uniqueMtypesFromDB.includes(currentValue)) reportMtype.value = currentValue;
    }

    // Populate نوع التوصيل filter
    const reportMconn = document.getElementById("report_mconn");
    if (reportMconn) {
        const currentValue = reportMconn.value;
        reportMconn.innerHTML = '<option value="">نوع التوصيل</option>';
        uniqueMconnFromDB.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            reportMconn.appendChild(option);
        });
        if (currentValue && uniqueMconnFromDB.includes(currentValue)) reportMconn.value = currentValue;
    }

    // Populate القطاع filter
    const reportKeta3 = document.getElementById("report_keta3");
    if (reportKeta3) {
        const currentValue = reportKeta3.value;
        reportKeta3.innerHTML = '<option value="">القطاع</option>';
        uniqueKeta3FromDB.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            reportKeta3.appendChild(option);
        });
        if (currentValue && uniqueKeta3FromDB.includes(currentValue)) reportKeta3.value = currentValue;
    }

    // Populate الهندسة filter - FROM DATABASE ONLY
    const reportHandsa = document.getElementById("report_handsa");
    if (reportHandsa) {
        const currentValue = reportHandsa.value;
        reportHandsa.innerHTML = '<option value="">الهندسة</option>';
        uniqueHandsaFromDB.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            reportHandsa.appendChild(option);
        });
        if (currentValue && uniqueHandsaFromDB.includes(currentValue)) reportHandsa.value = currentValue;
    }

    // Populate سبب الرفع filter - FROM DATABASE ONLY (same as الهندسة)
    const reportRemovingfor = document.getElementById("report_removingfor");
    if (reportRemovingfor) {
        const currentValue = reportRemovingfor.value;
        reportRemovingfor.innerHTML = '<option value="">سبب الرفع</option>';
        uniqueRemovingReasonsFromDB.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            reportRemovingfor.appendChild(option);
        });
        if (currentValue && uniqueRemovingReasonsFromDB.includes(currentValue)) reportRemovingfor.value = currentValue;
    }

    // Populate تقرير فحص الهندسة filter
    const reportMremovingfor = document.getElementById("report_mremovingfor");
    if (reportMremovingfor) {
        const currentValue = reportMremovingfor.value;
        reportMremovingfor.innerHTML = '<option value="">تقرير فحص الهندسة</option>';
        uniqueMremovingReportsFromDB.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            reportMremovingfor.appendChild(option);
        });
        if (currentValue && uniqueMremovingReportsFromDB.includes(currentValue)) reportMremovingfor.value = currentValue;
    }

    // Populate سبب التكهين filter - FROM DATABASE ONLY (same as الهندسة)
    const reportTakheenfor = document.getElementById("report_takheenfor");
    if (reportTakheenfor) {
        const currentValue = reportTakheenfor.value;
        reportTakheenfor.innerHTML = '<option value="">سبب التكهين</option>';
        uniqueTakheenReasonsFromDB.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            reportTakheenfor.appendChild(option);
        });
        if (currentValue && uniqueTakheenReasonsFromDB.includes(currentValue)) reportTakheenfor.value = currentValue;
    }
}

// ========== Helper: Populate dynamic selects ==========
function populateDynamicSelect(selectElement, defaultOptions, customOptions, selectId) {
    if (!selectElement) return;
    const currentValue = selectElement.value;
    selectElement.innerHTML = '<option value="">اختر</option>';

    // Add default options
    defaultOptions.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        selectElement.appendChild(option);
    });

    // Add custom options
    customOptions.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        selectElement.appendChild(option);
    });

    // Add "Add New" option
    const addOption = document.createElement("option");
    addOption.value = "__ADD_NEW__";
    addOption.textContent = "➕ إضافة جديد...";
    addOption.style.background = "#f0f0f0";
    addOption.style.color = "#2c6e9e";
    selectElement.appendChild(addOption);

    if (currentValue && (defaultOptions.includes(currentValue) || customOptions.includes(currentValue))) {
        selectElement.value = currentValue;
    }
}

// Initialize all dynamic selects
function initDynamicSelects() {
    // New form selects
    const removingForNew = document.getElementById("removingfor_new");
    const mremovingForNew = document.getElementById("mremovingfor_new");
    const takheenForNew = document.getElementById("takheenfor_new");

    const defaultRemoving = ["الفحص", "الصيانة", "الهدم والبناء", "تصفية مشترك", "زيادة قدرة", "احلال رباعي", "تنازل", "خطة احلال"];
    const defaultMremoving = ["عطل بالبطارية", "العداد لا يعمل", "تلف بجسم العداد", "قارىء الكروت لا يعمل", "العداد لا يقبل الشحن", "الشاشة عاطلة", "العداد محترق", "لمبة التلاعب تعمل"];
    const defaultTakheen = ["عاطل", "التقادم", "تلاعب", "زيادة قدرة"];

    populateDynamicSelect(removingForNew, defaultRemoving, customRemovingReasons, "removingfor_new");
    populateDynamicSelect(mremovingForNew, defaultMremoving, customMremovingReports, "mremovingfor_new");
    populateDynamicSelect(takheenForNew, defaultTakheen, customTakheenReasons, "takheenfor_new");

    // Edit form selects
    const editRemoving = document.getElementById("edit_removingfor");
    const editMremoving = document.getElementById("edit_mremovingfor");
    const editTakheen = document.getElementById("edit_takheenfor");

    populateDynamicSelect(editRemoving, defaultRemoving, customRemovingReasons, "edit_removingfor");
    populateDynamicSelect(editMremoving, defaultMremoving, customMremovingReports, "edit_mremovingfor");
    populateDynamicSelect(editTakheen, defaultTakheen, customTakheenReasons, "edit_takheenfor");
}

// Handle "Add New" selection
function handleAddNewSelection(selectElement, customArray, storageKey, callback) {
    if (selectElement.value === "__ADD_NEW__") {
        Swal.fire({
            title: "إضافة خيار جديد",
            text: "أدخل القيمة الجديدة",
            input: "text",
            inputPlaceholder: "اكتب الخيار الجديد",
            showCancelButton: true,
            confirmButtonText: "إضافة",
            cancelButtonText: "إلغاء",
            inputValidator: (value) => {
                if (!value || !value.trim()) return "الرجاء إدخال قيمة صحيحة";
                return null;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const newValue = result.value.trim();
                customArray.push(newValue);
                localStorage.setItem(storageKey, JSON.stringify(customArray));
                initDynamicSelects();
                // Reload data to refresh report filters with new values
                loadArchiveData();
                selectElement.value = newValue;
                Swal.fire("تم الإضافة", `تم إضافة "${newValue}" بنجاح`, "success");
            } else {
                selectElement.value = "";
            }
        });
    }
}

// Load Archive Data
async function loadArchiveData() {
    const snapshot = await get(child(ref(db), "Archive_Takheen"));
    const records = [];
    if (snapshot.exists()) {
        snapshot.forEach(childSnap => {
            const raw = childSnap.val();
            const data = raw.otherdata || raw;
            records.push({
                key: childSnap.key,
                mno: data.MNO || "",
                mname: data.MNAME || "",
                type: data.Type || "",
                mtype: data.Mtype || "",
                connection: data.Connection || "",
                year: data.YEAR || "",
                keta3: data.Keta3 || "",
                handsa: data.Handsa || "",
                removingfor: data.Removingfor || "",
                uploaddate: data.Uploaddate || "",
                mremovingfor: data.Mremovingfor || "",
                takheenfor: data.Takheenfor || "",
                takheendate: data.Takheendate || "",
                notes: data.Notes || ""
            });
        });
    }
    allArchiveData = records;

    // Extract unique values from database
    extractUniqueValuesFromData();

    // Populate report filters with database values
    populateReportFilters();

    renderMainTable();
    renderEditTable();
    renderReportTable();
}

// ---------- Main Table ----------
function renderMainTable() {
    const tbody = document.getElementById("mainTableBody");
    if (!tbody) return;
    const search = document.getElementById("searchMain")?.value.toLowerCase() || "";
    let filtered = allArchiveData.filter(r => r.mno.includes(search) || r.mname.toLowerCase().includes(search));
    if (filtered.length === 0) {
        tbody.innerHTML = "<tr><td colspan='15' class='empty-row'>لا توجد سجلات</td></tr>";
        document.getElementById("rowCountMain").innerText = "0";
        return;
    }
    tbody.innerHTML = filtered.map(r => `
    <tr onclick="window.selectForEditFromMain('${r.key}')" style="cursor:pointer">
      <td>${r.type || "-"}</td><td>${r.mno}</td><td>${r.mname}</td><td>${r.mtype || "-"}</td><td>${r.connection || "-"}</td>
      <td>${r.year || "-"}</td><td>${r.keta3 || "-"}</td><td>${r.handsa || "-"}</td><td>${r.removingfor || "-"}</td>
      <td>${formatDate(r.uploaddate)}</td><td>${r.mremovingfor || "-"}</td><td>${r.takheenfor || "-"}</td>
      <td>${formatDate(r.takheendate)}</td><td>${r.notes || "-"}</td>
      <td><span class="status-badge">مكهَن</span></td>
    </tr>
  `).join("");
    document.getElementById("rowCountMain").innerText = filtered.length;
}

window.selectForEditFromMain = (key) => {
    const rec = allArchiveData.find(r => r.key === key);
    if (rec) fillEditForm(rec);
    document.querySelector(".tab-btn[data-tab='tab-edit']").click();
};

// Save new condemnation
document.getElementById("saveNewBtn")?.addEventListener("click", async () => {
    const mno = document.getElementById("mno_new").value.trim();
    if (!mno) return Swal.fire("تحذير", "رقم العداد مطلوب", "warning");
    const takheendate = document.getElementById("takheendate_new").value || new Date().toISOString().split("T")[0];
    const newRecord = {
        MNO: mno, MNAME: document.getElementById("mname_new").value, Type: document.getElementById("type_new").value,
        Mtype: document.getElementById("mtype_new").value, Connection: document.getElementById("mconn_new").value,
        YEAR: document.getElementById("year_new").value, Keta3: document.getElementById("keta3_new").value,
        Handsa: document.getElementById("handsa_new").value, Removingfor: document.getElementById("removingfor_new").value,
        Uploaddate: document.getElementById("uploaddate_new").value, Mremovingfor: document.getElementById("mremovingfor_new").value,
        Takheenfor: document.getElementById("takheenfor_new").value, Takheendate: takheendate,
        Notes: document.getElementById("notes_new").value, Status: "تم التكهين", ArchivedAt: new Date().toISOString()
    };
    Swal.fire({ title: "جاري الحفظ", didOpen: () => Swal.showLoading() });
    try {
        const safeKey = mno.replace(/[.#$[\]]/g, "_");
        await set(ref(db, `Archive_Takheen/${safeKey}`), { otherdata: newRecord });
        Swal.fire("تم", "تم إضافة العداد إلى أرشيف التكهين", "success");
        clearAddForm();
        await loadArchiveData();
    } catch (err) { Swal.fire("خطأ", err.message, "error"); }
});

function clearAddForm() {
    const ids = ["mno_new", "mname_new", "type_new", "mtype_new", "mconn_new", "year_new", "keta3_new", "handsa_new", "removingfor_new", "uploaddate_new", "mremovingfor_new", "takheenfor_new", "takheendate_new", "notes_new"];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    document.getElementById("takheendate_new").value = new Date().toISOString().split("T")[0];
    initDynamicSelects();
}

document.getElementById("clearFormBtn")?.addEventListener("click", clearAddForm);

// -------------- Edit Tab --------------
let currentEditKey = null;
let isMnoUnlocked = false;
let originalMno = "";

function renderEditTable() {
    const tbody = document.getElementById("editTableBody");
    if (!tbody) return;
    const searchVal = document.getElementById("searchEdit")?.value.toLowerCase() || "";
    let filtered = allArchiveData.filter(r => r.mno.includes(searchVal) || r.mname.toLowerCase().includes(searchVal));
    if (filtered.length === 0) { tbody.innerHTML = "<tr><td colspan='14' class='empty-row'>لا توجد بيانات</td></tr>"; return; }
    tbody.innerHTML = filtered.map(r => `
    <tr data-key="${r.key}" style="cursor:pointer">
      <td>${r.type || "-"}</td><td>${r.mno}</td><td>${r.mname}</td><td>${r.mtype || "-"}</td><td>${r.connection || "-"}</td>
      <td>${r.year || "-"}</td><td>${r.keta3 || "-"}</td><td>${r.handsa || "-"}</td><td>${r.removingfor || "-"}</td>
      <td>${formatDate(r.uploaddate)}</td><td>${r.mremovingfor || "-"}</td><td>${r.takheenfor || "-"}</td>
      <td>${formatDate(r.takheendate)}</td>
      <td><button class="select-edit-btn" data-key="${r.key}" style="background:#3498db; border:none; border-radius:30px; padding:4px 12px; color:white;">تعديل</button></td>
    </tr>
  `).join("");
    document.querySelectorAll(".select-edit-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const key = btn.dataset.key;
            const record = allArchiveData.find(r => r.key === key);
            if (record) fillEditForm(record);
        });
    });
}

function fillEditForm(record) {
    currentEditKey = record.key;
    originalMno = record.mno;
    isMnoUnlocked = false;

    const mnoInput = document.getElementById("edit_mno");
    mnoInput.value = record.mno;
    mnoInput.disabled = true;
    mnoInput.readOnly = true;
    mnoInput.style.backgroundColor = "#f0f2f5";

    const unlockBtn = document.getElementById("unlockMnoBtn");
    if (unlockBtn) {
        unlockBtn.innerHTML = '<i class="fas fa-lock"></i> تعديل الرقم';
        unlockBtn.style.background = "#3498db";
    }

    document.getElementById("edit_mname").value = record.mname;
    document.getElementById("edit_type").value = record.type;
    document.getElementById("edit_mtype").value = record.mtype;
    document.getElementById("edit_mconn").value = record.connection;
    document.getElementById("edit_year").value = record.year;
    document.getElementById("edit_keta3").value = record.keta3;
    document.getElementById("edit_handsa").value = record.handsa;
    document.getElementById("edit_removingfor").value = record.removingfor;
    document.getElementById("edit_uploaddate").value = record.uploaddate;
    document.getElementById("edit_mremovingfor").value = record.mremovingfor;
    document.getElementById("edit_takheenfor").value = record.takheenfor;
    document.getElementById("edit_takheendate").value = record.takheendate;
    document.getElementById("edit_notes").value = record.notes;

    Swal.fire("تم التحديد", `العداد: ${record.mno}`, "info");
}

// Password-protected unlock for meter number
document.getElementById("unlockMnoBtn")?.addEventListener("click", async () => {
    if (!currentEditKey) {
        return Swal.fire("تنبيه", "الرجاء اختيار سجل أولاً", "warning");
    }

    const { value: password } = await Swal.fire({
        title: "تعديل رقم العداد",
        text: "أدخل كلمة المرور لتعديل رقم العداد",
        input: "password",
        inputPlaceholder: "كلمة المرور",
        showCancelButton: true,
        confirmButtonText: "تأكيد",
        cancelButtonText: "إلغاء",
        inputAttributes: {
            maxlength: 20,
            autocapitalize: "off"
        }
    });

    if (password === "1") {
        isMnoUnlocked = true;
        const mnoInput = document.getElementById("edit_mno");
        mnoInput.disabled = false;
        mnoInput.readOnly = false;
        mnoInput.style.backgroundColor = "#ffffff";
        mnoInput.style.border = "2px solid #27ae60";
        mnoInput.focus();

        const unlockBtn = document.getElementById("unlockMnoBtn");
        unlockBtn.innerHTML = '<i class="fas fa-unlock-alt"></i> تم الفتح (قابل للتعديل)';
        unlockBtn.style.background = "#27ae60";

        Swal.fire({
            title: "تم الفتح",
            text: "يمكنك الآن تعديل رقم العداد",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        });
    } else if (password) {
        Swal.fire("خطأ", "كلمة المرور غير صحيحة", "error");
    }
});

document.getElementById("updateEditBtn")?.addEventListener("click", async () => {
    if (!currentEditKey) return Swal.fire("تنبيه", "اختر سجلاً أولاً", "warning");

    let newMno = document.getElementById("edit_mno").value.trim();
    if (!newMno) return Swal.fire("تحذير", "رقم العداد مطلوب", "warning");

    if (newMno !== originalMno && !isMnoUnlocked) {
        return Swal.fire("تحذير", "لا يمكن تعديل رقم العداد. يرجى استخدام زر 'تعديل الرقم' وإدخال كلمة المرور أولاً", "warning");
    }

    const updated = {
        MNO: newMno, MNAME: document.getElementById("edit_mname").value,
        Type: document.getElementById("edit_type").value, Mtype: document.getElementById("edit_mtype").value,
        Connection: document.getElementById("edit_mconn").value, YEAR: document.getElementById("edit_year").value,
        Keta3: document.getElementById("edit_keta3").value, Handsa: document.getElementById("edit_handsa").value,
        Removingfor: document.getElementById("edit_removingfor").value, Uploaddate: document.getElementById("edit_uploaddate").value,
        Mremovingfor: document.getElementById("edit_mremovingfor").value, Takheenfor: document.getElementById("edit_takheenfor").value,
        Takheendate: document.getElementById("edit_takheendate").value, Notes: document.getElementById("edit_notes").value,
        LastModified: new Date().toISOString()
    };

    Swal.fire({ title: "تحديث...", didOpen: () => Swal.showLoading() });
    try {
        if (newMno !== originalMno) {
            await remove(ref(db, `Archive_Takheen/${currentEditKey}`));
            const newKey = newMno.replace(/[.#$[\]]/g, "_");
            await set(ref(db, `Archive_Takheen/${newKey}`), { otherdata: updated });
        } else {
            await update(ref(db, `Archive_Takheen/${currentEditKey}`), { otherdata: updated });
        }
        Swal.fire("نجاح", "تم تحديث السجل", "success");
        await loadArchiveData();
        currentEditKey = null;
        isMnoUnlocked = false;
        document.getElementById("clearEditBtn").click();
    } catch (err) { Swal.fire("خطأ", err.message, "error"); }
});

document.getElementById("deleteEditBtn")?.addEventListener("click", async () => {
    if (!currentEditKey) return Swal.fire("اختر سجل", "", "warning");
    const confirm = await Swal.fire({ title: "حذف دائم?", text: "لا يمكن التراجع", icon: "warning", showCancelButton: true });
    if (!confirm.isConfirmed) return;
    await remove(ref(db, `Archive_Takheen/${currentEditKey}`));
    Swal.fire("تم الحذف", "", "success");
    await loadArchiveData();
    currentEditKey = null;
    document.getElementById("clearEditBtn").click();
});

document.getElementById("clearEditBtn")?.addEventListener("click", () => {
    currentEditKey = null;
    isMnoUnlocked = false;

    const mnoInput = document.getElementById("edit_mno");
    mnoInput.disabled = true;
    mnoInput.readOnly = true;
    mnoInput.style.backgroundColor = "#f0f2f5";
    mnoInput.style.border = "1px solid #cbd5e6";

    const unlockBtn = document.getElementById("unlockMnoBtn");
    if (unlockBtn) {
        unlockBtn.innerHTML = '<i class="fas fa-lock"></i> تعديل الرقم';
        unlockBtn.style.background = "#3498db";
    }

    const ids = ["edit_mno", "edit_mname", "edit_type", "edit_mtype", "edit_mconn", "edit_year", "edit_keta3", "edit_handsa", "edit_removingfor", "edit_uploaddate", "edit_mremovingfor", "edit_takheenfor", "edit_takheendate", "edit_notes"];
    ids.forEach(id => { const el = document.getElementById(id); if (el && id !== "edit_mno") el.value = ""; });
    if (mnoInput) mnoInput.value = "";

    initDynamicSelects();
});

// -------------- Report Tab --------------
function renderReportTable() {
    const mtype = document.getElementById("report_mtype")?.value || "";
    const mconn = document.getElementById("report_mconn")?.value || "";
    const keta3 = document.getElementById("report_keta3")?.value || "";
    const handsa = document.getElementById("report_handsa")?.value || "";
    const removingfor = document.getElementById("report_removingfor")?.value || "";
    const mremovingfor = document.getElementById("report_mremovingfor")?.value || "";
    const reason = document.getElementById("report_takheenfor")?.value || "";
    const fromDate = document.getElementById("report_fromDate")?.value || "";
    const toDate = document.getElementById("report_toDate")?.value || "";

    let filtered = [...allArchiveData];
    if (mtype) filtered = filtered.filter(r => r.mtype === mtype);
    if (mconn) filtered = filtered.filter(r => r.connection === mconn);
    if (keta3) filtered = filtered.filter(r => r.keta3 === keta3);
    if (handsa) filtered = filtered.filter(r => r.handsa === handsa);
    if (removingfor) filtered = filtered.filter(r => r.removingfor === removingfor);
    if (mremovingfor) filtered = filtered.filter(r => r.mremovingfor === mremovingfor);
    if (reason) filtered = filtered.filter(r => r.takheenfor === reason);
    if (fromDate) filtered = filtered.filter(r => r.takheendate >= fromDate);
    if (toDate) filtered = filtered.filter(r => r.takheendate <= toDate);

    const tbody = document.getElementById("reportTableBody");
    if (filtered.length === 0) {
        tbody.innerHTML = "<tr><td colspan='15' class='empty-row'>لا توجد نتائج</td></tr>";
        document.getElementById("reportCount").innerText = "0";
        return;
    }
    tbody.innerHTML = filtered.map((r, idx) => `
    <tr>
      <td>${idx + 1}</td><td>${r.type || "-"}</td><td>${r.mno}</td><td>${r.mname}</td><td>${r.mtype || "-"}</td>
      <td>${r.connection || "-"}</td><td>${r.year || "-"}</td><td>${r.keta3 || "-"}</td><td>${r.handsa || "-"}</td>
      <td>${r.removingfor || "-"}</td><td>${formatDate(r.uploaddate)}</td><td>${r.mremovingfor || "-"}</td>
      <td>${r.takheenfor || "-"}</td><td>${formatDate(r.takheendate)}</td><td>${r.notes || "-"}</td>
    </tr>
  `).join("");
    document.getElementById("reportCount").innerText = filtered.length;
}

// Event listeners for report
document.getElementById("applyReportFilters")?.addEventListener("click", renderReportTable);
document.getElementById("resetReportFilters")?.addEventListener("click", () => {
    const ids = ["report_mtype", "report_mconn", "report_keta3", "report_handsa", "report_removingfor", "report_mremovingfor", "report_takheenfor", "report_fromDate", "report_toDate"];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    renderReportTable();
});

// Export functions
document.getElementById("exportMainExcel")?.addEventListener("click", () => {
    const rows = document.querySelectorAll("#mainTableBody tr");
    if (rows.length === 0 || rows[0]?.innerText.includes("لا توجد")) return Swal.fire("لا توجد بيانات", "", "info");
    const excelData = [];
    rows.forEach((row, idx) => {
        const cells = row.querySelectorAll("td");
        if (cells.length >= 14) {
            excelData.push({
                "نوع النظام": cells[0]?.innerText, "رقم العداد": cells[1]?.innerText, "اسم المشترك": cells[2]?.innerText,
                "نوع العداد": cells[3]?.innerText, "نوع التوصيل": cells[4]?.innerText, "سنة الصنع": cells[5]?.innerText,
                "القطاع": cells[6]?.innerText, "الهندسة": cells[7]?.innerText, "سبب الرفع": cells[8]?.innerText,
                "تاريخ الرفع": cells[9]?.innerText, "تقرير الفحص": cells[10]?.innerText, "سبب التكهين": cells[11]?.innerText,
                "تاريخ التكهين": cells[12]?.innerText, "ملاحظات": cells[13]?.innerText
            });
        }
    });
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ارشيف_التكهين");
    XLSX.writeFile(wb, `ارشيف_التكهين_${new Date().toISOString().slice(0, 10)}.xlsx`);
});

document.getElementById("exportReportExcel")?.addEventListener("click", () => {
    const rows = document.querySelectorAll("#reportTableBody tr");
    if (rows.length === 0 || rows[0]?.innerText.includes("لا توجد")) return Swal.fire("لا توجد بيانات", "", "info");
    const excelData = [];
    rows.forEach((row, idx) => {
        const cells = row.querySelectorAll("td");
        if (cells.length >= 14) {
            excelData.push({
                "م": cells[0]?.innerText, "نوع النظام": cells[1]?.innerText, "رقم العداد": cells[2]?.innerText,
                "اسم المشترك": cells[3]?.innerText, "نوع العداد": cells[4]?.innerText, "نوع التوصيل": cells[5]?.innerText,
                "سنة الصنع": cells[6]?.innerText, "القطاع": cells[7]?.innerText, "الهندسة": cells[8]?.innerText,
                "سبب الرفع": cells[9]?.innerText, "تاريخ الرفع": cells[10]?.innerText, "تقرير الفحص": cells[11]?.innerText,
                "سبب التكهين": cells[12]?.innerText, "تاريخ التكهين": cells[13]?.innerText, "ملاحظات": cells[14]?.innerText
            });
        }
    });
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير_التكهين");
    XLSX.writeFile(wb, `تقرير_التكهين_${new Date().toISOString().slice(0, 10)}.xlsx`);
});

// Search inputs
document.getElementById("searchMain")?.addEventListener("input", renderMainTable);
document.getElementById("searchEdit")?.addEventListener("input", renderEditTable);

// Tab switching
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tabId = btn.dataset.tab;
        document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
        document.getElementById(tabId).classList.add("active");
        if (tabId === "tab-edit") { renderEditTable(); initDynamicSelects(); }
        if (tabId === "tab-report") renderReportTable();
    });
});

// Handle Add New selection on change
function setupAddNewHandlers() {
    const removingSelect = document.getElementById("removingfor_new");
    const mremovingSelect = document.getElementById("mremovingfor_new");
    const takheenSelect = document.getElementById("takheenfor_new");

    if (removingSelect) {
        removingSelect.addEventListener("change", () => handleAddNewSelection(removingSelect, customRemovingReasons, "customRemovingReasons", null));
    }
    if (mremovingSelect) {
        mremovingSelect.addEventListener("change", () => handleAddNewSelection(mremovingSelect, customMremovingReports, "customMremovingReports", null));
    }
    if (takheenSelect) {
        takheenSelect.addEventListener("change", () => handleAddNewSelection(takheenSelect, customTakheenReasons, "customTakheenReasons", null));
    }

    // Edit form handlers
    const editRemoving = document.getElementById("edit_removingfor");
    const editMremoving = document.getElementById("edit_mremovingfor");
    const editTakheen = document.getElementById("edit_takheenfor");

    if (editRemoving) {
        editRemoving.addEventListener("change", () => handleAddNewSelection(editRemoving, customRemovingReasons, "customRemovingReasons", null));
    }
    if (editMremoving) {
        editMremoving.addEventListener("change", () => handleAddNewSelection(editMremoving, customMremovingReports, "customMremovingReports", null));
    }
    if (editTakheen) {
        editTakheen.addEventListener("change", () => handleAddNewSelection(editTakheen, customTakheenReasons, "customTakheenReasons", null));
    }
}

// Scroll buttons
document.getElementById("scrollUpBtn")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
document.getElementById("scrollDownBtn")?.addEventListener("click", () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));

// Initialize
document.getElementById("takheendate_new").value = new Date().toISOString().split("T")[0];
initDynamicSelects();
setupAddNewHandlers();
loadArchiveData();