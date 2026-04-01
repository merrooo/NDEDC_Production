// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
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
let selectedFiles = [];
let isEditMode = false;
let editKey = null;
let isLoading = false;

// DOM Elements
const mnameInput = document.getElementById("mname");
const mnoInput = document.getElementById("mno");
const mcoInput = document.getElementById("mco");
const notesInput = document.getElementById("notes");
const tableBody = document.getElementById("tableBody");
const photoInput = document.getElementById("photoInput");
const frontPhotoGrid = document.getElementById("frontPhotoGrid");
const phaseMode = document.getElementById("phase_mode");
const pfInput = document.getElementById("newItemPF");
const ampInput = document.getElementById("newItemA");
const wattInput = document.getElementById("newItemW");
const hpInput = document.getElementById("newItemHP");
const loadNameInput = document.getElementById("newItemName");
const btnSave = document.getElementById("btnSave");
const btnSearch = document.getElementById("searchMainBtn");
const btnReport = document.getElementById("reportMainBtn");
const photoTriggerBtn = document.getElementById("photoTriggerBtn");
const btnAddLoad = document.getElementById("btnAddLoad");

// ========== Loading Overlay Functions ==========

// Show loading overlay with simplified message
function showLoading(message = "جاري المعالجة...") {
  if (isLoading) return;
  isLoading = true;

  // Disable all buttons and inputs
  const allButtons = [
    btnSave,
    btnSearch,
    btnReport,
    photoTriggerBtn,
    btnAddLoad,
  ];
  const allInputs = [
    mnameInput,
    mnoInput,
    mcoInput,
    notesInput,
    phaseMode,
    pfInput,
    ampInput,
    wattInput,
    hpInput,
    loadNameInput,
  ];

  allButtons.forEach((btn) => {
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = "0.6";
      btn.style.cursor = "not-allowed";
    }
  });

  allInputs.forEach((input) => {
    if (input) {
      input.disabled = true;
      input.style.opacity = "0.6";
      input.style.cursor = "not-allowed";
    }
  });

  // Disable photo deletion buttons
  document.querySelectorAll(".del-photo").forEach((btn) => {
    btn.style.pointerEvents = "none";
    btn.style.opacity = "0.5";
  });

  // Show SweetAlert loading
  Swal.fire({
    title: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
    backdrop: true,
    showConfirmButton: false,
  });
}

// Hide loading overlay
function hideLoading() {
  if (!isLoading) return;
  isLoading = false;

  // Enable all buttons and inputs
  const allButtons = [
    btnSave,
    btnSearch,
    btnReport,
    photoTriggerBtn,
    btnAddLoad,
  ];
  const allInputs = [
    mnameInput,
    mnoInput,
    mcoInput,
    notesInput,
    phaseMode,
    pfInput,
    ampInput,
    wattInput,
    hpInput,
    loadNameInput,
  ];

  allButtons.forEach((btn) => {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    }
  });

  allInputs.forEach((input) => {
    if (input) {
      input.disabled = false;
      input.style.opacity = "1";
      input.style.cursor = "text";
    }
  });

  // Enable photo deletion buttons
  document.querySelectorAll(".del-photo").forEach((btn) => {
    btn.style.pointerEvents = "auto";
    btn.style.opacity = "1";
  });

  // Close SweetAlert if it's still open
  Swal.close();
}

// ========== HIGH COMPRESSION Image Processing ==========

async function highCompressImage(file, loadDescription = "", meterNumber = "") {
  return new Promise((resolve, reject) => {
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

        let quality = 0.6;
        let base64 = canvas.toDataURL("image/jpeg", quality);
        const targetSize = 80 * 1024;

        while (base64.length > targetSize && quality > 0.25) {
          quality -= 0.05;
          base64 = canvas.toDataURL("image/jpeg", quality);
        }

        const timestamp = Date.now();
        const safeDescription = loadDescription.replace(
          /[^a-zA-Z0-9\u0600-\u06FF]/g,
          "_",
        );
        const fileName = meterNumber
          ? `${meterNumber}_${safeDescription}_${timestamp}.jpg`
          : `${safeDescription}_${timestamp}.jpg`;

        console.log(
          `📸 ${file.name}: ${(file.size / 1024).toFixed(1)}KB → ${(base64.length / 1024).toFixed(1)}KB`,
        );

        resolve({
          base64: base64,
          fileName: fileName,
          originalName: file.name,
          originalSize: file.size,
          compressedSize: base64.length,
          dimensions: `${width}x${height}`,
          quality: quality,
          uploadDate: new Date().toISOString(),
          loadDescription: loadDescription || "بدون وصف",
          meterNumber: meterNumber,
        });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function processImagesFast(filesWithDescriptions, meterNumber) {
  const processedImages = [];
  const errors = [];

  const batchSize = 3;
  for (let i = 0; i < filesWithDescriptions.length; i += batchSize) {
    const batch = filesWithDescriptions.slice(i, i + batchSize);
    const batchPromises = batch.map(async (item) => {
      try {
        const { file, description } = item;
        const optimized = await highCompressImage(
          file,
          description,
          meterNumber,
        );
        return { success: true, data: optimized };
      } catch (error) {
        return { success: false, error, file: item.file.name };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach((result) => {
      if (result.success) {
        processedImages.push(result.data);
      } else {
        errors.push({ file: result.file, error: result.error.message });
      }
    });
  }

  return { processedImages, errors };
}

// ========== Electrical Logic ==========
function updateFromWatt() {
  let watts = parseFloat(wattInput.value) || 0;
  let pf = parseFloat(pfInput.value) || 0.8;
  let mode = phaseMode.value;
  let V = mode === "3" ? 380 : 220;
  let factor = mode === "3" ? Math.sqrt(3) : 1;
  if (pf <= 0) pf = 0.8;
  let amps = watts / (factor * V * pf);
  let hpVal = watts / 746;
  hpInput.value = hpVal.toFixed(3);
  ampInput.value = amps.toFixed(2);
}

function updateFromHP() {
  let hpVal = parseFloat(hpInput.value) || 0;
  let watts = hpVal * 746;
  wattInput.value = watts.toFixed(0);
  updateFromWatt();
}

function updateFromAmpere() {
  let amps = parseFloat(ampInput.value) || 0;
  let pf = parseFloat(pfInput.value) || 0.8;
  let mode = phaseMode.value;
  let V = mode === "3" ? 380 : 220;
  let factor = mode === "3" ? Math.sqrt(3) : 1;
  let watts = factor * V * amps * pf;
  wattInput.value = watts.toFixed(0);
  let hpVal = watts / 746;
  hpInput.value = hpVal.toFixed(3);
}

wattInput.addEventListener("input", updateFromWatt);
hpInput.addEventListener("input", updateFromHP);
ampInput.addEventListener("input", updateFromAmpere);
phaseMode.addEventListener("change", () => {
  if (wattInput.value) updateFromWatt();
  else if (ampInput.value) updateFromAmpere();
});
pfInput.addEventListener("input", () => {
  if (wattInput.value) updateFromWatt();
  else if (ampInput.value) updateFromAmpere();
});

// ========== Photo Handling ==========
photoTriggerBtn.onclick = () => photoInput.click();

photoInput.onchange = async (e) => {
  const loads = getCurrentLoads();

  if (loads.length === 0) {
    Swal.fire("تنبيه", "الرجاء إضافة أحمال أولاً قبل رفع الصور", "warning");
    photoInput.value = "";
    return;
  }

  for (const file of Array.from(e.target.files)) {
    const loadOptions = loads.map((load, idx) => ({
      name: load.item,
      index: idx,
    }));

    const result = await Swal.fire({
      title: `اختر الحمولة للصورة: ${file.name}`,
      html: `
        <div style="text-align: right; max-height: 400px; overflow-y: auto;">
          ${loadOptions
            .map(
              (load) => `
            <div class="load-option" data-load="${load.name}" style="
              padding: 12px;
              margin: 8px 0;
              border: 1px solid #ddd;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s;
              background: white;
            ">
              <strong>${escapeHtml(load.name)}</strong>
            </div>
          `,
            )
            .join("")}
          <div class="load-option" data-load="new" style="
            padding: 12px;
            margin: 8px 0;
            border: 2px dashed var(--accent);
            border-radius: 8px;
            cursor: pointer;
            text-align: center;
            background: #f0f9ff;
          ">
            ➕ إضافة حمولة جديدة
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "إلغاء",
      width: "500px",
      didOpen: () => {
        document.querySelectorAll(".load-option").forEach((option) => {
          option.onclick = async () => {
            const loadName = option.getAttribute("data-load");
            if (loadName === "new") {
              const { value: newLoadName } = await Swal.fire({
                title: "إضافة حمولة جديدة",
                input: "text",
                inputPlaceholder: "أدخل اسم الحمولة",
                showCancelButton: true,
                confirmButtonText: "إضافة",
                cancelButtonText: "إلغاء",
              });

              if (newLoadName) {
                const newRow = tableBody.insertRow();
                newRow.insertCell(0).innerText = newLoadName;
                newRow.insertCell(1).innerText = "0";
                newRow.insertCell(2).innerText = "0";
                newRow.insertCell(3).innerText = "0";
                const delCell = newRow.insertCell(4);
                delCell.innerHTML = '<i class="fas fa-trash-alt"></i>';
                delCell.className = "btn-delete-row";
                delCell.onclick = () => newRow.remove();

                addPhotoWithLoad(file, newLoadName);
                Swal.close();
              }
            } else {
              addPhotoWithLoad(file, loadName);
              Swal.close();
            }
          };
        });
      },
    });

    if (result.dismiss === Swal.DismissReason.cancel) {
      continue;
    }
  }
  photoInput.value = "";
};

function addPhotoWithLoad(file, description) {
  selectedFiles.push({
    file: file,
    description: description,
    id: Date.now() + "_" + Math.random(),
  });

  const reader = new FileReader();
  reader.onload = (ev) => {
    const div = document.createElement("div");
    div.className = "photo-box";
    div.setAttribute(
      "data-photo-id",
      selectedFiles[selectedFiles.length - 1].id,
    );
    div.innerHTML = `
      <img src="${ev.target.result}" alt="preview" onclick="previewImage('${ev.target.result}', '${description.replace(/'/g, "\\'")}')">
      <div class="photo-label">${escapeHtml(description)}</div>
      <div class="del-photo" onclick="removePhoto(this)">✕</div>
    `;
    frontPhotoGrid.appendChild(div);
  };
  reader.readAsDataURL(file);
}

function getCurrentLoads() {
  const loads = [];
  for (let row of tableBody.rows) {
    const description = row.cells[0].innerText.trim();
    const watts = parseFloat(row.cells[1].innerText) || 0;
    const hp = parseFloat(row.cells[2].innerText) || 0;
    const amp = parseFloat(row.cells[3].innerText) || 0;

    if (description && (watts > 0 || hp > 0 || amp > 0)) {
      loads.push({
        item: description,
        watts: watts.toString(),
        hp: hp.toString(),
        amp: amp.toString(),
      });
    }
  }
  return loads;
}

window.removePhoto = (el) => {
  const boxDiv = el.parentElement;
  const photoId = boxDiv.getAttribute("data-photo-id");
  if (photoId) {
    const index = selectedFiles.findIndex((f) => f.id === photoId);
    if (index !== -1) selectedFiles.splice(index, 1);
  }
  boxDiv.remove();
};

window.previewImage = (imageSrc, description) => {
  Swal.fire({
    title: description || "معاينة الصورة",
    html: `
      <img src="${imageSrc}" style="max-width: 100%; max-height: 80vh; border-radius: 8px; cursor: pointer;" onclick="window.open('${imageSrc}', '_blank')">
      <div style="margin-top: 15px;">
        <button onclick="downloadImage('${imageSrc}')" class="swal2-confirm swal2-styled" style="background: #2c9cd4;">
          <i class="fas fa-download"></i> تحميل الصورة
        </button>
      </div>
    `,
    showConfirmButton: true,
    confirmButtonText: "إغلاق",
    width: "auto",
    padding: "20px",
  });
};

window.downloadImage = (imageSrc) => {
  const link = document.createElement("a");
  link.href = imageSrc;
  link.download = "image.jpg";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ========== Add Load Row ==========
btnAddLoad.onclick = async () => {
  if (isLoading) return;

  const desc = loadNameInput.value.trim();
  const watts = wattInput.value;
  const hp = hpInput.value;
  const amps = ampInput.value;

  if (!desc) {
    Swal.fire("تنبيه", "يرجى إدخال وصف الحمل", "warning");
    return;
  }
  if ((!watts || watts === "0") && (!amps || amps === "0")) {
    Swal.fire("تنبيه", "أدخل الوات أو الأمبير (لا يمكن أن يكون صفر)", "info");
    return;
  }

  const row = tableBody.insertRow();
  row.insertCell(0).innerText = desc;
  row.insertCell(1).innerText = watts || "0";
  row.insertCell(2).innerText = hp || "0";
  row.insertCell(3).innerText = amps || "0";
  const delCell = row.insertCell(4);
  delCell.innerHTML = '<i class="fas fa-trash-alt"></i>';
  delCell.className = "btn-delete-row";
  delCell.onclick = () => row.remove();

  loadNameInput.value = "";
  wattInput.value = "";
  hpInput.value = "";
  ampInput.value = "";

  const uploadPhoto = await Swal.fire({
    title: "هل تريد إضافة صورة لهذا الحمل؟",
    text: desc,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "نعم، أضف صورة",
    cancelButtonText: "لا، شكراً",
  });

  if (uploadPhoto.isConfirmed) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      if (e.target.files[0]) {
        addPhotoWithLoad(e.target.files[0], desc);
      }
    };
    input.click();
  }
};

// ========== Save to Firebase ==========
btnSave.onclick = async () => {
  if (isLoading) return;

  const code = mcoInput.value.trim();
  const meterNo = mnoInput.value.trim();

  if (!code) {
    Swal.fire("خطأ", "كود المشترك (ID) مطلوب", "error");
    return;
  }

  showLoading(isEditMode ? "جاري التحديث..." : "جاري الحفظ...");

  try {
    const loads = getCurrentLoads();
    let photoData = [];

    if (selectedFiles.length > 0) {
      const newFiles = selectedFiles.filter((f) => !f.isExisting);
      if (newFiles.length > 0) {
        const { processedImages, errors } = await processImagesFast(
          newFiles,
          meterNo,
        );
        photoData = processedImages;

        if (errors.length > 0) {
          hideLoading();
          Swal.fire({
            title: "تنبيه",
            html: `تم ضغط ${processedImages.length} صورة بنجاح<br>فشل: ${errors.length}`,
            icon: "warning",
          });
          showLoading(isEditMode ? "جاري التحديث..." : "جاري الحفظ...");
        }
      }

      const existingPhotos = selectedFiles
        .filter((f) => f.isExisting)
        .map((f) => f.photoData);
      photoData = [...existingPhotos, ...photoData];
    }

    const totalSizeKB = (
      photoData.reduce((sum, img) => sum + (img.compressedSize || 0), 0) / 1024
    ).toFixed(1);

    const dataToSave = {
      name: mnameInput.value,
      meter_no: meterNo,
      description: notesInput.value,
      loads: loads,
      photos: photoData,
      photoCount: photoData.length,
      totalImagesSizeKB: totalSizeKB,
      lastUpdated: new Date().toISOString(),
    };

    if (isEditMode && editKey) {
      await update(ref(db, "Munipilation/" + editKey), dataToSave);
      isEditMode = false;
      editKey = null;
    } else {
      await set(ref(db, "Munipilation/" + code), dataToSave);
    }

    hideLoading();
    Swal.fire({
      title: "تم الحفظ",
      text: `تم حفظ ${photoData.length} صورة`,
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      resetForm();
    });
  } catch (e) {
    hideLoading();
    Swal.fire("خطأ", e.message, "error");
  }
};

function resetForm() {
  mnameInput.value = "";
  mnoInput.value = "";
  mcoInput.value = "";
  notesInput.value = "";
  tableBody.innerHTML = "";
  frontPhotoGrid.innerHTML = "";
  selectedFiles = [];
  isEditMode = false;
  editKey = null;
  btnSave.innerHTML = '<i class="fas fa-save"></i> حفظ البيانات';
}

// ========== Search & Redirect to Main Page for Editing ==========
btnSearch.onclick = () => {
  if (isLoading) return;

  Swal.fire({
    title: "البحث عن مشترك",
    html: `
      <input type="text" id="searchMeterEdit" class="swal2-input" placeholder="رقم العداد..." style="width:90%">
      <div id="searchResultsEdit" style="margin-top:15px; max-height:300px; overflow-y:auto;"></div>
    `,
    showConfirmButton: false,
    width: "700px",
  });

  const searchInput = document.getElementById("searchMeterEdit");
  if (searchInput) {
    searchInput.addEventListener("keyup", async (e) => {
      const term = e.target.value;
      if (term.length < 1) return;
      const snap = await get(ref(db, "Munipilation"));
      const resultsDiv = document.getElementById("searchResultsEdit");
      resultsDiv.innerHTML = "";
      snap.forEach((child) => {
        const data = child.val();
        if (data.meter_no && data.meter_no.includes(term)) {
          const div = document.createElement("div");
          div.className = "search-row";
          div.innerHTML = `
            <span><strong>${escapeHtml(data.name)}</strong> | ${escapeHtml(data.meter_no)}</span>
            <button onclick="loadDataForEdit('${child.key}')" style="background:#2c9cd4;">تعديل</button>
          `;
          resultsDiv.appendChild(div);
        }
      });
    });
  }
};

window.loadDataForEdit = async (key) => {
  if (isLoading) return;

  Swal.close();
  showLoading("جاري التحميل...");

  try {
    const snap = await get(ref(db, "Munipilation/" + key));
    const data = snap.val();

    if (data) {
      resetForm();

      isEditMode = true;
      editKey = key;
      btnSave.innerHTML = '<i class="fas fa-save"></i> تحديث';

      mnameInput.value = data.name || "";
      mnoInput.value = data.meter_no || "";
      mcoInput.value = key;
      notesInput.value = data.description || "";

      if (data.loads && data.loads.length > 0) {
        data.loads.forEach((load) => {
          const row = tableBody.insertRow();
          row.insertCell(0).innerText = load.item || "";
          row.insertCell(1).innerText = load.watts || "0";
          row.insertCell(2).innerText = load.hp || "0";
          row.insertCell(3).innerText = load.amp || "0";
          const delCell = row.insertCell(4);
          delCell.innerHTML = '<i class="fas fa-trash-alt"></i>';
          delCell.className = "btn-delete-row";
          delCell.onclick = () => row.remove();
        });
      }

      if (data.photos && data.photos.length > 0) {
        selectedFiles = [];
        frontPhotoGrid.innerHTML = "";

        data.photos.forEach((photo, index) => {
          const photoBase64 = photo.base64 || "";
          const photoDescription = photo.loadDescription || "بدون وصف";
          const photoFileName = photo.fileName || `image_${index}`;

          const div = document.createElement("div");
          div.className = "photo-box";
          div.innerHTML = `
            <img src="${photoBase64}" alt="preview" onclick="previewImage('${photoBase64}', '${escapeHtml(photoDescription)}')">
            <div class="photo-label">${escapeHtml(photoDescription)}</div>
            <div class="del-photo" onclick="removeExistingPhoto('${key}', ${index})">✕</div>
          `;
          frontPhotoGrid.appendChild(div);

          selectedFiles.push({
            id: photoFileName,
            isExisting: true,
            photoData: photo,
          });
        });
      }

      hideLoading();
      Swal.fire({
        title: "تم",
        text: "البيانات جاهزة للتعديل",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
    } else {
      hideLoading();
      Swal.fire("خطأ", "لم يتم العثور على البيانات", "error");
    }
  } catch (error) {
    hideLoading();
    console.error("Error loading data:", error);
    Swal.fire("خطأ", "فشل تحميل البيانات", "error");
  }
};

window.removeExistingPhoto = async (key, photoIndex) => {
  if (isLoading) return;

  const result = await Swal.fire({
    title: "تأكيد الحذف",
    text: "هل أنت متأكد من حذف هذه الصورة؟",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "حذف",
    cancelButtonText: "إلغاء",
  });

  if (result.isConfirmed) {
    showLoading("جاري الحذف...");

    try {
      const snap = await get(ref(db, "Munipilation/" + key));
      const data = snap.val();

      if (data && data.photos && data.photos[photoIndex]) {
        data.photos.splice(photoIndex, 1);

        await update(ref(db, "Munipilation/" + key), {
          photos: data.photos,
          photoCount: data.photos.length,
          totalImagesSizeKB: (
            data.photos.reduce(
              (sum, img) => sum + (img.compressedSize || 0),
              0,
            ) / 1024
          ).toFixed(1),
          lastUpdated: new Date().toISOString(),
        });

        hideLoading();
        Swal.fire("تم الحذف", "", "success", {
          timer: 1000,
          showConfirmButton: false,
        }).then(() => {
          loadDataForEdit(key);
        });
      } else {
        hideLoading();
        Swal.fire("خطأ", "الصورة غير موجودة", "error");
      }
    } catch (error) {
      hideLoading();
      Swal.fire("خطأ", "فشل حذف الصورة", "error");
    }
  }
};

// ========== Report with Lightbox Preview ==========
btnReport.onclick = () => {
  if (isLoading) return;

  Swal.fire({
    title: "عرض التقارير",
    html: `
      <input type="text" id="reportSearch" class="swal2-input" placeholder="بحث برقم العداد..." style="width:90%">
      <div id="reportResultsList" style="margin-top:15px; max-height:450px; overflow-y:auto;"></div>
    `,
    showConfirmButton: true,
    confirmButtonText: "إغلاق",
    showCancelButton: false,
    width: "800px",
    allowOutsideClick: false,
  });

  const searchInput = document.getElementById("reportSearch");
  if (searchInput) {
    searchInput.addEventListener("keyup", async (e) => {
      const term = e.target.value;
      if (term.length < 1) return;
      const snap = await get(ref(db, "Munipilation"));
      const resultsDiv = document.getElementById("reportResultsList");
      resultsDiv.innerHTML = "";
      snap.forEach((child) => {
        const data = child.val();
        if (data.meter_no && data.meter_no.includes(term)) {
          const div = document.createElement("div");
          div.className = "search-row";
          div.style.flexDirection = "column";
          div.style.alignItems = "stretch";
          div.style.gap = "12px";

          const photosByLoad = {};
          if (data.photos && data.photos.length > 0) {
            data.photos.forEach((photo) => {
              const loadDesc = photo.loadDescription || "صور عامة";
              if (!photosByLoad[loadDesc]) {
                photosByLoad[loadDesc] = [];
              }
              photosByLoad[loadDesc].push(photo);
            });
          }

          let photosHtml = "";
          if (Object.keys(photosByLoad).length > 0) {
            for (const [loadDesc, photos] of Object.entries(photosByLoad)) {
              photosHtml += `<div style="margin-top: 15px;"><strong>📸 ${escapeHtml(loadDesc)} (${photos.length}):</strong></div>`;
              photosHtml +=
                '<div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:5px;">';
              photos.forEach((photo) => {
                const imageSrc = photo.base64 || "";
                const sizeKB = (photo.compressedSize / 1024).toFixed(1);
                photosHtml += `
                  <div style="border:1px solid #ddd; border-radius:8px; padding:8px; width:120px; text-align:center; position: relative;">
                    <img src="${imageSrc}" style="width:100px; height:80px; object-fit:cover; border-radius:5px; cursor:pointer;" 
                         onclick="openLightbox('${imageSrc}', '${escapeHtml(photo.loadDescription || "صورة")}')">
                    <div style="font-size:9px; color:#666; margin-top:5px;">${sizeKB}KB</div>
                  </div>
                `;
              });
              photosHtml += "</div>";
            }
          } else {
            photosHtml = '<div style="color:#888;">📷 لا توجد صور</div>';
          }

          div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span><strong>${escapeHtml(data.name)}</strong> | ${escapeHtml(data.meter_no)} | ${data.photoCount || 0} صورة</span>
              <button onclick="exportToExcel('${child.key}')" style="background:#2c9cd4;"><i class="fas fa-file-excel"></i> Excel</button>
            </div>
            ${photosHtml}
          `;
          resultsDiv.appendChild(div);
        }
      });
    });
  }
};

// Lightbox function for report modal - keeps the report open
window.openLightbox = (imageSrc, description) => {
  const lightbox = document.createElement("div");
  lightbox.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.9);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `;

  lightbox.onclick = () => {
    document.body.removeChild(lightbox);
  };

  const imgContainer = document.createElement("div");
  imgContainer.style.cssText = `
    max-width: 90%;
    max-height: 90%;
    text-align: center;
    position: relative;
  `;

  const img = document.createElement("img");
  img.src = imageSrc;
  img.style.cssText = `
    max-width: 100%;
    max-height: 85vh;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
  `;

  const caption = document.createElement("div");
  caption.style.cssText = `
    color: white;
    margin-top: 15px;
    font-size: 14px;
    text-align: center;
  `;
  caption.innerHTML = description || "معاينة الصورة";

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "✕";
  closeBtn.style.cssText = `
    position: absolute;
    top: -40px;
    right: -40px;
    background: #e1573c;
    color: white;
    border: none;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    document.body.removeChild(lightbox);
  };

  const downloadBtn = document.createElement("button");
  downloadBtn.innerHTML = '<i class="fas fa-download"></i> تحميل';
  downloadBtn.style.cssText = `
    margin-top: 15px;
    background: #2c9cd4;
    color: white;
    border: none;
    padding: 8px 20px;
    border-radius: 25px;
    cursor: pointer;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  `;
  downloadBtn.onclick = (e) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = imageSrc;
    link.download = "image.jpg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  imgContainer.appendChild(img);
  imgContainer.appendChild(caption);
  imgContainer.appendChild(downloadBtn);
  imgContainer.appendChild(closeBtn);
  lightbox.appendChild(imgContainer);
  document.body.appendChild(lightbox);
};

window.exportToExcel = async (key) => {
  if (isLoading) return;

  const snap = await get(ref(db, "Munipilation/" + key));
  const data = snap.val();
  if (!data) return;

  const rows = [
    ["تقرير المشترك", ""],
    ["الاسم", data.name || ""],
    ["رقم العداد", data.meter_no || ""],
    ["الكود", key],
    ["الملاحظات", data.description || ""],
    ["عدد الصور", data.photoCount || 0],
    ["حجم الصور", `${data.totalImagesSizeKB || 0}KB`],
    [],
    ["الأحمال", "", "", ""],
    ["وصف الحمل", "واط", "حصان", "أمبير"],
  ];

  (data.loads || []).forEach((load) => {
    rows.push([
      load.item || "",
      load.watts || "0",
      load.hp || "0",
      load.amp || "0",
    ]);
  });

  if (data.photos && data.photos.length > 0) {
    rows.push([], ["الصور المرفقة حسب الحمولة", "", "", ""]);
    const photosByLoad = {};
    data.photos.forEach((photo) => {
      const loadDesc = photo.loadDescription || "صور عامة";
      if (!photosByLoad[loadDesc]) {
        photosByLoad[loadDesc] = [];
      }
      photosByLoad[loadDesc].push(photo);
    });

    for (const [loadDesc, photos] of Object.entries(photosByLoad)) {
      rows.push([`الحمولة: ${loadDesc}`, "", "", ""]);
      photos.forEach((photo, idx) => {
        rows.push([
          `  صورة ${idx + 1}: ${photo.fileName || "صورة"}`,
          `الحجم: ${(photo.compressedSize / 1024).toFixed(1)}KB`,
          `الأبعاد: ${photo.dimensions || "غير محدد"}`,
          `الجودة: ${Math.round(photo.quality * 100)}%`,
        ]);
      });
      rows.push([]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "تقرير");
  XLSX.writeFile(wb, `تقرير_${data.meter_no || key}.xlsx`);
  Swal.fire("تم التصدير", "تم إنشاء ملف Excel", "success", {
    timer: 1500,
    showConfirmButton: false,
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

// Add CSS
const style = document.createElement("style");
style.textContent = `
  .photo-box {
    position: relative;
    display: inline-block;
    margin: 5px;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 5px;
    background: #f9f9f9;
    width: 120px;
  }
  .photo-box img {
    width: 100%;
    height: 90px;
    object-fit: cover;
    border-radius: 5px;
    cursor: pointer;
    transition: transform 0.2s;
  }
  .photo-box img:hover {
    transform: scale(1.02);
  }
  .photo-label {
    font-size: 10px;
    text-align: center;
    margin-top: 5px;
    color: #555;
    word-break: break-word;
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .del-photo {
    position: absolute;
    top: 2px;
    right: 2px;
    background: #e1573c;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    transition: all 0.2s;
    cursor: pointer;
    font-weight: bold;
    z-index: 10;
  }
  .del-photo:hover {
    background: #c0392b;
    transform: scale(1.1);
  }
  .search-row {
    padding: 12px;
    border: 1px solid #ddd;
    margin: 8px 0;
    border-radius: 8px;
    background: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
  }
  .edit-table-input {
    width: 100%;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  .btn-delete-row {
    cursor: pointer;
    color: #e1573c;
    text-align: center;
  }
  .load-option:hover {
    background: #f0f9ff !important;
    border-color: var(--accent) !important;
    transform: translateX(-5px);
  }
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  input:disabled, select:disabled, textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: #f5f5f5;
  }
`;
document.head.appendChild(style);

console.log("✅ Application loaded successfully!");
