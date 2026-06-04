import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, get, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnKRhT5xJTBvsQKpW7e9w-hGSbAQJWTSo",
    authDomain: "production1-ae85.firebaseapp.com",
    projectId: "production1-ae85",
    storageBucket: "production1-ae85.firebasestorage.app",
    messagingSenderId: "490438031865",
    appId: "1:490438031865:web:a4a69335989f30cd13a528"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let allData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 10;

// Load data from Firebase (using meter number as key)
async function loadData() {
    const snapshot = await get(ref(db, 'Ayat_Enter'));
    allData = [];
    if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach(key => {
            allData.push({ ...data[key], id: key });
        });
        allData.sort((a, b) => (b.enter_date || '').localeCompare(a.enter_date || ''));
    }
    filteredData = [...allData];
    currentPage = 1;
    renderTable();
    updateStats();
}

// Save direct input using meter number as key
window.saveDirectInput = async function () {
    const mno = document.getElementById('inputMno').value.trim();
    if (!mno) {
        Swal.fire("خطأ", "رقم العداد مطلوب", "error");
        return;
    }

    // Check if meter number already exists
    if (allData.some(item => item.mno === mno)) {
        Swal.fire("تنبيه", "رقم العداد موجود بالفعل", "warning");
        return;
    }

    const newRecord = {
        mno: mno,
        enter_date: document.getElementById('inputDate').value,
        keta3: document.getElementById('inputKeta3').value,
        handsa: document.getElementById('inputHandsa').value,
        nashattype: document.getElementById('inputNashat').value,
        mtype: document.getElementById('inputMtype').value,
        status: document.getElementById('inputStatus').value,
        notes: document.getElementById('inputNotes').value
        addnotes: document.getElementById('inputaddNotes').value
    };

    try {
        await set(ref(db, `Ayat_Enter/${mno}`), newRecord);
        Swal.fire("تم", "تم إضافة العداد بنجاح", "success");

        // Clear input row
        document.getElementById('inputMno').value = '';
        document.getElementById('inputKeta3').value = '';
        document.getElementById('inputHandsa').value = '';
        document.getElementById('inputNashat').value = '';
        document.getElementById('inputMtype').value = '';
        document.getElementById('inputStatus').value = '';
        document.getElementById('inputNotes').value = '';
        document.getElementById('inputDate').value = new Date().toISOString().slice(0, 10);

        await loadData();
    } catch (error) {
        Swal.fire("خطأ", "فشل في حفظ البيانات", "error");
    }
};

// Add new option to dropdown (local only)
window.addNewOption = async function (selectId, optionName) {
    const { value: newValue } = await Swal.fire({
        title: `إضافة ${optionName} جديد`,
        input: 'text',
        inputPlaceholder: `أدخل ${optionName} الجديد`,
        showCancelButton: true,
        confirmButtonText: 'إضافة',
        cancelButtonText: 'إلغاء',
        inputValidator: (value) => {
            if (!value) return 'الرجاء إدخال قيمة!';
            return null;
        }
    });

    if (newValue) {
        const select = document.getElementById(selectId);
        const option = document.createElement('option');
        option.value = newValue;
        option.textContent = newValue;
        select.appendChild(option);
        select.value = newValue;
        Swal.fire('تم', `تم إضافة ${optionName} بنجاح`, 'success');
    }
};

// Edit record with all dropdowns
window.editRecord = async function (mno) {
    const record = allData.find(r => r.mno === mno);
    if (!record) return;

    // Get current select options
    const keta3Options = Array.from(document.getElementById('inputKeta3').options).map(opt => opt.value).filter(v => v);
    const handsaOptions = Array.from(document.getElementById('inputHandsa').options).map(opt => opt.value).filter(v => v);
    const nashatOptions = Array.from(document.getElementById('inputNashat').options).map(opt => opt.value).filter(v => v);
    const mtypeOptions = Array.from(document.getElementById('inputMtype').options).map(opt => opt.value).filter(v => v);
    const statusOptions = Array.from(document.getElementById('inputStatus').options).map(opt => opt.value).filter(v => v);
    const notesOptions = Array.from(document.getElementById('inputNotes').options).map(opt => opt.value).filter(v => v);

    const result = await Swal.fire({
        title: 'تعديل البيانات',
        html: `
            <input id="swal-mno" class="swal2-input" placeholder="رقم العداد" value="${record.mno || ''}" readonly style="background:#f0f0f0">
            <input id="swal-date" type="date" class="swal2-input" value="${record.enter_date || ''}">
            <select id="swal-keta3" class="swal2-select">
                <option value="">اختر القطاع</option>
                ${keta3Options.map(opt => `<option value="${opt}" ${record.keta3 === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
            <select id="swal-handsa" class="swal2-select">
                <option value="">اختر الهندسة</option>
                ${handsaOptions.map(opt => `<option value="${opt}" ${record.handsa === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
            <select id="swal-nashat" class="swal2-select">
                <option value="">اختر النشاط</option>
                ${nashatOptions.map(opt => `<option value="${opt}" ${record.nashattype === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
            <select id="swal-mtype" class="swal2-select">
                <option value="">اختر نوع العداد</option>
                ${mtypeOptions.map(opt => `<option value="${opt}" ${record.mtype === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
            <select id="swal-status" class="swal2-select">
                <option value="">اختر حالة العداد</option>
                ${statusOptions.map(opt => `<option value="${opt}" ${record.status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
            <select id="swal-notes" class="swal2-select">
                <option value="">اختر ملاحظة</option>
                ${notesOptions.map(opt => `<option value="${opt}" ${record.notes === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'حفظ',
        cancelButtonText: 'إلغاء',
        preConfirm: () => {
            return {
                mno: document.getElementById('swal-mno').value,
                enter_date: document.getElementById('swal-date').value,
                keta3: document.getElementById('swal-keta3').value,
                handsa: document.getElementById('swal-handsa').value,
                nashattype: document.getElementById('swal-nashat').value,
                mtype: document.getElementById('swal-mtype').value,
                status: document.getElementById('swal-status').value,
                notes: document.getElementById('swal-notes').value
            };
        }
    });

    if (result.isConfirmed) {
        const updatedData = result.value;
        try {
            await set(ref(db, `Ayat_Enter/${mno}`), updatedData);
            Swal.fire("تم", "تم تحديث البيانات بنجاح", "success");
            await loadData();
        } catch (error) {
            Swal.fire("خطأ", "فشل في تحديث البيانات", "error");
        }
    }
};

// Delete record
window.deleteRecord = async function (mno) {
    const result = await Swal.fire({
        title: 'حذف السجل',
        text: `هل تريد حذف العداد رقم ${mno}؟`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'نعم، حذف',
        cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
        try {
            await remove(ref(db, `Ayat_Enter/${mno}`));
            Swal.fire('تم الحذف', 'تم حذف السجل بنجاح', 'success');
            await loadData();
        } catch (error) {
            Swal.fire("خطأ", "فشل في حذف البيانات", "error");
        }
    }
};

// Render table with icon buttons
function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const inputRow = document.getElementById('inputRow');
    tbody.innerHTML = '';
    if (inputRow) {
        tbody.appendChild(inputRow);
    }

    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filteredData.slice(start, start + itemsPerPage);

    pageItems.forEach(item => {
        const row = tbody.insertRow();

        const fields = ['mno', 'enter_date', 'keta3', 'handsa', 'nashattype', 'mtype', 'status', 'notes'];
        fields.forEach(field => {
            const cell = row.insertCell();
            if (field === 'enter_date') {
                cell.textContent = item[field] ? formatDateDisplay(item[field]) : '—';
            } else {
                cell.textContent = item[field] || '—';
            }
        });

        const actionCell = row.insertCell();
        actionCell.className = 'action-buttons-container';
        actionCell.innerHTML = `
            <button class="btn-icon-edit" onclick="editRecord('${item.mno}')" title="تعديل">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon-delete" onclick="deleteRecord('${item.mno}')" title="حذف">
                <i class="fas fa-trash"></i>
            </button>
        `;
    });

    updatePagination();
}

function formatDateDisplay(iso) {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return iso;
}

// Filter table with date range
window.filterTable = function () {
    const mnoSearch = document.getElementById('searchMno')?.value.toLowerCase() || '';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const keta3Search = document.getElementById('searchKeta3')?.value.toLowerCase() || '';
    const handsaSearch = document.getElementById('searchHandsa')?.value.toLowerCase() || '';
    const nashatSearch = document.getElementById('searchNashat')?.value.toLowerCase() || '';
    const mtypeSearch = document.getElementById('searchMtype')?.value.toLowerCase() || '';
    const statusSearch = document.getElementById('searchStatus')?.value.toLowerCase() || '';
    const statusSearch = document.getElementById('searchStatus')?.value.toLowerCase() || '';
    const notesVal = document.getElementById('searchNotes')?.value || '';

    filteredData = allData.filter(item => {
        if (mnoSearch && !item.mno?.toLowerCase().includes(mnoSearch)) return false;
        if (keta3Search && !item.keta3?.toLowerCase().includes(keta3Search)) return false;
        if (handsaSearch && !item.handsa?.toLowerCase().includes(handsaSearch)) return false;
        if (nashatSearch && !item.nashattype?.toLowerCase().includes(nashatSearch)) return false;
        if (mtypeSearch && !item.mtype?.toLowerCase().includes(mtypeSearch)) return false;
        if (statusSearch && !item.status?.toLowerCase().includes(statusSearch)) return false;
        if (notesVal && item.notes !== notesVal) return false;

        const itemDate = item.enter_date || '';
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;

        return true;
    });

    currentPage = 1;
    renderTable();
    updateStats();
};

function updateStats() {
    const summary = document.getElementById('totalSummary');
    if (summary) {
        summary.innerHTML = `<i class="fas fa-database"></i> إجمالي السجلات: ${allData.length} | <i class="fas fa-search"></i> نتائج البحث: ${filteredData.length}`;
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (pageInfo) pageInfo.textContent = `الصفحة ${currentPage} من ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

window.prevPage = function () {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
};

window.nextPage = function () {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
};

window.refreshDatabase = async function () {
    await loadData();
    Swal.fire('تم التحديث', 'تم تحديث البيانات بنجاح', 'success');
};

window.exportExcel = function () {
    const exportData = filteredData.map(item => ({
        'رقم العداد': item.mno,
        'تاريخ الفحص': formatDateDisplay(item.enter_date),
        'القطاع': item.keta3 || '',
        'الهندسة': item.handsa || '',
        'النشاط': item.nashattype || '',
        'نوع العداد': item.mtype || '',
        'حالة العداد': item.status || '',
        'ملاحظات': item.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "العدادات");
    XLSX.writeFile(wb, `تقرير_العدادات_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
};

window.toggleDarkMode = function () {
    const checkbox = document.getElementById('darkModeToggle');
    if (checkbox.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    }
};

function checkDarkModePreference() {
    const darkMode = localStorage.getItem('darkMode');
    const checkbox = document.getElementById('darkModeToggle');
    if (darkMode === 'enabled' && checkbox) {
        document.body.classList.add('dark-mode');
        checkbox.checked = true;
    }
}

// Initialize
window.onload = async () => {
    checkDarkModePreference();
    await loadData();
};