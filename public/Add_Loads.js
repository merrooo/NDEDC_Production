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
let allLoads = [];
let filteredLoads = [];
let isLoading = false;

// DOM Elements
const loadsTableBody = document.getElementById("loadsTableBody");
const searchInput = document.getElementById("searchLoad");

// ========== Electrical Calculation Functions ==========
function calculateFromWatt(watts, sourceType = "3-PH-380v") {
  const isThreePhase = sourceType === "3-PH-380v";
  const pf = 0.8;
  const V = isThreePhase ? 380 : 220;
  const factor = isThreePhase ? Math.sqrt(3) : 1;

  let power = parseFloat(watts) || 0;
  if (power === 0) return { hp: 0, amps: 0 };

  const hp = power / 746;
  const amps = power / (factor * V * pf);

  return { hp: hp.toFixed(3), amps: amps.toFixed(2) };
}

function calculateFromHP(hp, sourceType = "3-PH-380v") {
  const isThreePhase = sourceType === "3-PH-380v";
  const pf = 0.8;
  const V = isThreePhase ? 380 : 220;
  const factor = isThreePhase ? Math.sqrt(3) : 1;

  let power = parseFloat(hp) * 746 || 0;
  if (power === 0) return { watts: 0, amps: 0 };

  const watts = power;
  const amps = power / (factor * V * pf);

  return { watts: watts.toFixed(0), amps: amps.toFixed(2) };
}

function calculateFromAmps(amps, sourceType = "3-PH-380v") {
  const isThreePhase = sourceType === "3-PH-380v";
  const pf = 0.8;
  const V = isThreePhase ? 380 : 220;
  const factor = isThreePhase ? Math.sqrt(3) : 1;

  let current = parseFloat(amps) || 0;
  if (current === 0) return { watts: 0, hp: 0 };

  const watts = factor * V * current * pf;
  const hp = watts / 746;

  return { watts: watts.toFixed(0), hp: hp.toFixed(3) };
}

function getVoltage(sourceType) {
  return sourceType === "3-PH-380v" ? "380V" : "220V";
}

function getSourceBadge(sourceType) {
  if (sourceType === "3-PH-380v") {
    return '<span class="source-badge source-3phase"><i class="fas fa-bolt"></i> 3 فاز - 380V</span>';
  }
  return '<span class="source-badge source-1phase"><i class="fas fa-plug"></i> 1 فاز - 220V</span>';
}

// ========== Image Compression (High Compression) ==========
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDimension = 400;

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

        // Start with lower quality for better compression
        let quality = 0.6;
        let base64 = canvas.toDataURL("image/jpeg", quality);
        const targetSize = 60 * 1024; // 60KB target

        // Reduce quality until under target size
        while (base64.length > targetSize && quality > 0.25) {
          quality -= 0.05;
          base64 = canvas.toDataURL("image/jpeg", quality);
        }

        console.log(
          `📸 Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(base64.length / 1024).toFixed(1)}KB`,
        );
        resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ========== Loading Functions ==========
function showLoading(message = "جاري المعالجة...") {
  if (isLoading) return;
  isLoading = true;
  Swal.fire({
    title: message,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
    showConfirmButton: false,
  });
}

function hideLoading() {
  if (!isLoading) return;
  isLoading = false;
  Swal.close();
}

// ========== Load Data from Firebase ==========
async function loadLoads() {
  try {
    const snap = await get(ref(db, "Loads_Management"));
    let loads = snap.exists() && snap.val().loads ? snap.val().loads : [];

    // Update existing loads to include missing fields
    let needsUpdate = false;
    const updatedLoads = loads.map((load) => {
      let updated = false;
      const newLoad = { ...load };

      // Convert old sourceType format to new format
      if (newLoad.sourceType === "3") {
        newLoad.sourceType = "3-PH-380v";
        updated = true;
      } else if (newLoad.sourceType === "1") {
        newLoad.sourceType = "1-PH-220v";
        updated = true;
      } else if (!newLoad.sourceType) {
        newLoad.sourceType = "3-PH-380v";
        updated = true;
      }

      // Calculate missing amp
      if (!newLoad.amp || newLoad.amp === "0") {
        const watts = parseFloat(newLoad.watts) || 0;
        const hp = parseFloat(newLoad.hp) || 0;
        if (watts > 0 || hp > 0) {
          const power = watts > 0 ? watts : hp * 746;
          const isThreePhase = newLoad.sourceType === "3-PH-380v";
          const pf = 0.8;
          const V = isThreePhase ? 380 : 220;
          const factor = isThreePhase ? Math.sqrt(3) : 1;
          newLoad.amp = (power / (factor * V * pf)).toFixed(2);
          updated = true;
        } else {
          newLoad.amp = "0";
          updated = true;
        }
      }

      // Remove unnecessary fields
      delete newLoad.createdAt;
      delete newLoad.lastUpdated;
      delete newLoad.photoUpdated;

      if (updated) needsUpdate = true;
      return newLoad;
    });

    if (needsUpdate) {
      await set(ref(db, "Loads_Management"), { loads: updatedLoads });
    }

    allLoads = updatedLoads;
    filteredLoads = [...allLoads];
    displayLoads();
  } catch (error) {
    console.error("Error loading loads:", error);
    Swal.fire("خطأ", "فشل تحميل البيانات", "error");
  }
}

// ========== Display Loads in Table ==========
function displayLoads() {
  if (!loadsTableBody) return;

  if (filteredLoads.length === 0) {
    loadsTableBody.innerHTML =
      '<td colspan="8" style="text-align: center;">لا توجد أحمال مضافة بعد</td>';
    return;
  }

  loadsTableBody.innerHTML = "";
  filteredLoads.forEach((load) => {
    const row = loadsTableBody.insertRow();

    // Photo cell
    const photoCell = row.insertCell(0);
    if (load.photo) {
      photoCell.innerHTML = `<img src="${load.photo}" class="load-photo" onclick="window.previewImage('${load.photo}', '${escapeHtml(load.item)}')">`;
    } else {
      photoCell.innerHTML = `<div class="no-photo" onclick="window.addPhotoToLoad('${load.id}')"><i class="fas fa-camera"></i></div>`;
    }

    // Description cell
    row.insertCell(1).innerHTML = `<strong>${escapeHtml(load.item)}</strong>`;

    // Watts cell
    row.insertCell(2).innerHTML = `${load.watts || "0"} W`;

    // HP cell
    row.insertCell(3).innerHTML = `${load.hp || "0"} HP`;

    // Amps cell
    row.insertCell(4).innerHTML = `${load.amp || "0"} A`;

    // Source Type cell
    row.insertCell(5).innerHTML = getSourceBadge(
      load.sourceType || "3-PH-380v",
    );

    // Voltage cell
    row.insertCell(6).innerHTML = getVoltage(load.sourceType || "3-PH-380v");

    // Actions cell
    const actionsCell = row.insertCell(7);
    actionsCell.className = "action-buttons";
    actionsCell.innerHTML = `
            <button class="edit-row-btn" onclick="window.editLoad('${load.id}')">
                <i class="fas fa-edit"></i> تعديل
            </button>
            <button class="photo-row-btn" onclick="window.addPhotoToLoad('${load.id}')">
                <i class="fas fa-camera"></i> ${load.photo ? "تغيير" : "إضافة"} صورة
            </button>
            <button class="delete-row-btn" onclick="window.deleteLoad('${load.id}')">
                <i class="fas fa-trash"></i> حذف
            </button>
        `;
  });
}

// ========== Filter Loads ==========
window.filterLoads = function () {
  const term = searchInput.value.toLowerCase();
  filteredLoads = allLoads.filter(
    (load) =>
      load.item.toLowerCase().includes(term) ||
      (load.watts && load.watts.toString().includes(term)) ||
      (load.hp && load.hp.toString().includes(term)),
  );
  displayLoads();
};

// ========== Show Add Load Modal with Auto Calculations ==========
window.showAddLoadModal = function () {
  Swal.fire({
    title: "إضافة حمل جديد",
    html: `
            <input type="text" id="loadName" class="swal2-input" placeholder="وصف الحمل (مكيف، محرك، مضخة...)" style="width: 90%; margin: 10px auto;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 90%; margin: 10px auto;">
                <input type="number" id="loadWatts" class="swal2-input" placeholder="Watts (W)" style="width: 100%;">
                <input type="number" id="loadHP" class="swal2-input" placeholder="HP (حصان)" style="width: 100%;">
            </div>
            <div style="display: flex; gap: 10px; width: 90%; margin: 10px auto; align-items: center;">
                <input type="number" id="loadAmps" class="swal2-input" placeholder="Amps (A)" style="flex: 1;">
                <span style="color: var(--text-muted);">أو</span>
                <select id="loadSource" class="source-select" style="flex: 1;">
                    <option value="1-PH-220v">1 فاز - 220 فولت (Single Phase)</option>
                    <option value="3-PH-380v">3 فاز - 380 فولت (Three Phase)</option>
                </select>
            </div>
            <div class="photo-upload-area" id="photoUploadArea" style="width: 90%; margin: 10px auto;">
                <i class="fas fa-camera" style="font-size: 32px; color: var(--accent);"></i>
                <p>اضغط لإضافة صورة (اختياري)</p>
                <input type="file" id="photoFile" accept="image/*" style="display: none;">
            </div>
            <div id="photoPreview" style="text-align: center; margin-top: 10px;"></div>
        `,
    showCancelButton: true,
    confirmButtonText: "إضافة",
    cancelButtonText: "إلغاء",
    width: "600px",
    customClass: { popup: "swal-modal-large" },
    didOpen: () => {
      const wattsInput = document.getElementById("loadWatts");
      const hpInput = document.getElementById("loadHP");
      const ampsInput = document.getElementById("loadAmps");
      const sourceSelect = document.getElementById("loadSource");
      const uploadArea = document.getElementById("photoUploadArea");
      const photoFile = document.getElementById("photoFile");
      let selectedPhoto = null;

      // Auto calculation functions
      function updateFromWatts() {
        const watts = wattsInput.value;
        if (watts) {
          const sourceType = sourceSelect.value;
          const result = calculateFromWatt(watts, sourceType);
          hpInput.value = result.hp;
          ampsInput.value = result.amps;
        }
      }

      function updateFromHP() {
        const hp = hpInput.value;
        if (hp) {
          const sourceType = sourceSelect.value;
          const result = calculateFromHP(hp, sourceType);
          wattsInput.value = result.watts;
          ampsInput.value = result.amps;
        }
      }

      function updateFromAmps() {
        const amps = ampsInput.value;
        if (amps) {
          const sourceType = sourceSelect.value;
          const result = calculateFromAmps(amps, sourceType);
          wattsInput.value = result.watts;
          hpInput.value = result.hp;
        }
      }

      function updateOnSourceChange() {
        if (wattsInput.value) updateFromWatts();
        else if (hpInput.value) updateFromHP();
        else if (ampsInput.value) updateFromAmps();
      }

      wattsInput.oninput = updateFromWatts;
      hpInput.oninput = updateFromHP;
      ampsInput.oninput = updateFromAmps;
      sourceSelect.onchange = updateOnSourceChange;

      uploadArea.onclick = () => photoFile.click();

      photoFile.onchange = (e) => {
        if (e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            selectedPhoto = ev.target.result;
            document.getElementById("photoPreview").innerHTML = `
                            <img src="${ev.target.result}" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 2px solid var(--accent);">
                        `;
          };
          reader.readAsDataURL(e.target.files[0]);
        }
      };

      window.currentSelectedPhoto = () => selectedPhoto;
    },
    preConfirm: () => {
      const name = document.getElementById("loadName").value;
      const watts = document.getElementById("loadWatts").value;
      const hp = document.getElementById("loadHP").value;
      const amps = document.getElementById("loadAmps").value;
      const sourceType = document.getElementById("loadSource").value;
      const photo = window.currentSelectedPhoto
        ? window.currentSelectedPhoto()
        : null;

      if (!name) {
        Swal.showValidationMessage("يرجى إدخال وصف الحمل");
        return false;
      }

      if (!watts && !hp && !amps) {
        Swal.showValidationMessage("يرجى إدخال الوات أو الحصان أو الأمبير");
        return false;
      }

      // Calculate missing values
      let finalWatts = watts || "0";
      let finalHP = hp || "0";
      let finalAmps = amps || "0";

      if (watts && !hp) {
        const result = calculateFromWatt(watts, sourceType);
        finalHP = result.hp;
        finalAmps = result.amps;
      } else if (hp && !watts) {
        const result = calculateFromHP(hp, sourceType);
        finalWatts = result.watts;
        finalAmps = result.amps;
      } else if (amps && !watts && !hp) {
        const result = calculateFromAmps(amps, sourceType);
        finalWatts = result.watts;
        finalHP = result.hp;
      }

      return {
        name,
        watts: finalWatts,
        hp: finalHP,
        amps: finalAmps,
        sourceType,
        photo,
      };
    },
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading("جاري الحفظ...");

      try {
        const newLoad = {
          id: Date.now().toString(),
          item: result.value.name,
          watts: result.value.watts,
          hp: result.value.hp,
          amp: result.value.amps,
          sourceType: result.value.sourceType,
          photo: result.value.photo || null,
        };

        allLoads.push(newLoad);
        await set(ref(db, "Loads_Management"), { loads: allLoads });
        filteredLoads = [...allLoads];
        displayLoads();

        hideLoading();
        Swal.fire("تم الإضافة", "", "success", {
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        hideLoading();
        Swal.fire("خطأ", "فشل حفظ البيانات", "error");
      }
    }
  });
};

// ========== Edit Load with Auto Calculations ==========
window.editLoad = function (loadId) {
  const load = allLoads.find((l) => l.id === loadId);
  if (!load) return;

  Swal.fire({
    title: "تعديل الحمل",
    html: `
            <input type="text" id="editLoadName" class="swal2-input" value="${escapeHtml(load.item)}" placeholder="وصف الحمل" style="width: 90%; margin: 10px auto;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 90%; margin: 10px auto;">
                <input type="number" id="editLoadWatts" class="swal2-input" value="${load.watts}" placeholder="Watts (W)" style="width: 100%;">
                <input type="number" id="editLoadHP" class="swal2-input" value="${load.hp}" placeholder="HP (حصان)" style="width: 100%;">
            </div>
            <div style="display: flex; gap: 10px; width: 90%; margin: 10px auto; align-items: center;">
                <input type="number" id="editLoadAmps" class="swal2-input" value="${load.amp}" placeholder="Amps (A)" style="flex: 1;">
                <span style="color: var(--text-muted);">أو</span>
                <select id="editLoadSource" class="source-select" style="flex: 1;">
                    <option value="3-PH-380v" ${load.sourceType === "3-PH-380v" ? "selected" : ""}>3 فاز - 380 فولت (Three Phase)</option>
                    <option value="1-PH-220v" ${load.sourceType === "1-PH-220v" ? "selected" : ""}>1 فاز - 220 فولت (Single Phase)</option>
                </select>
            </div>
        `,
    showCancelButton: true,
    confirmButtonText: "تحديث",
    cancelButtonText: "إلغاء",
    width: "600px",
    customClass: { popup: "swal-modal-large" },
    didOpen: () => {
      const wattsInput = document.getElementById("editLoadWatts");
      const hpInput = document.getElementById("editLoadHP");
      const ampsInput = document.getElementById("editLoadAmps");
      const sourceSelect = document.getElementById("editLoadSource");

      function updateFromWatts() {
        const watts = wattsInput.value;
        if (watts) {
          const sourceType = sourceSelect.value;
          const result = calculateFromWatt(watts, sourceType);
          hpInput.value = result.hp;
          ampsInput.value = result.amps;
        }
      }

      function updateFromHP() {
        const hp = hpInput.value;
        if (hp) {
          const sourceType = sourceSelect.value;
          const result = calculateFromHP(hp, sourceType);
          wattsInput.value = result.watts;
          ampsInput.value = result.amps;
        }
      }

      function updateFromAmps() {
        const amps = ampsInput.value;
        if (amps) {
          const sourceType = sourceSelect.value;
          const result = calculateFromAmps(amps, sourceType);
          wattsInput.value = result.watts;
          hpInput.value = result.hp;
        }
      }

      function updateOnSourceChange() {
        if (wattsInput.value) updateFromWatts();
        else if (hpInput.value) updateFromHP();
        else if (ampsInput.value) updateFromAmps();
      }

      wattsInput.oninput = updateFromWatts;
      hpInput.oninput = updateFromHP;
      ampsInput.oninput = updateFromAmps;
      sourceSelect.onchange = updateOnSourceChange;
    },
    preConfirm: () => {
      const name = document.getElementById("editLoadName").value;
      const watts = document.getElementById("editLoadWatts").value;
      const hp = document.getElementById("editLoadHP").value;
      const amps = document.getElementById("editLoadAmps").value;
      const sourceType = document.getElementById("editLoadSource").value;

      if (!name) {
        Swal.showValidationMessage("يرجى إدخال وصف الحمل");
        return false;
      }

      let finalWatts = watts || "0";
      let finalHP = hp || "0";
      let finalAmps = amps || "0";

      if (watts && !hp) {
        const result = calculateFromWatt(watts, sourceType);
        finalHP = result.hp;
        finalAmps = result.amps;
      } else if (hp && !watts) {
        const result = calculateFromHP(hp, sourceType);
        finalWatts = result.watts;
        finalAmps = result.amps;
      } else if (amps && !watts && !hp) {
        const result = calculateFromAmps(amps, sourceType);
        finalWatts = result.watts;
        finalHP = result.hp;
      }

      return {
        name,
        watts: finalWatts,
        hp: finalHP,
        amps: finalAmps,
        sourceType,
      };
    },
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading("جاري التحديث...");

      try {
        const loadIndex = allLoads.findIndex((l) => l.id === loadId);
        if (loadIndex !== -1) {
          allLoads[loadIndex].item = result.value.name;
          allLoads[loadIndex].watts = result.value.watts;
          allLoads[loadIndex].hp = result.value.hp;
          allLoads[loadIndex].amp = result.value.amps;
          allLoads[loadIndex].sourceType = result.value.sourceType;

          await set(ref(db, "Loads_Management"), { loads: allLoads });
          filteredLoads = [...allLoads];
          displayLoads();
        }

        hideLoading();
        Swal.fire("تم التحديث", "", "success", {
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        hideLoading();
        Swal.fire("خطأ", "فشل تحديث البيانات", "error");
      }
    }
  });
};

// ========== Add Photo to Load ==========
window.addPhotoToLoad = async function (loadId) {
  const load = allLoads.find((l) => l.id === loadId);
  if (!load) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async (e) => {
    if (e.target.files[0]) {
      showLoading("جاري ضغط الصورة...");

      try {
        const compressedPhoto = await compressImage(e.target.files[0]);
        load.photo = compressedPhoto;

        await set(ref(db, "Loads_Management"), { loads: allLoads });
        filteredLoads = [...allLoads];
        displayLoads();

        hideLoading();
        Swal.fire(
          `تم ${load.photo ? "تحديث" : "إضافة"} الصورة`,
          "",
          "success",
          { timer: 1500, showConfirmButton: false },
        );
      } catch (error) {
        hideLoading();
        Swal.fire("خطأ", "فشل إضافة الصورة", "error");
      }
    }
  };

  input.click();
};

// ========== Delete Load ==========
window.deleteLoad = async function (loadId) {
  const load = allLoads.find((l) => l.id === loadId);
  if (!load) return;

  const result = await Swal.fire({
    title: "تأكيد الحذف",
    text: `هل أنت متأكد من حذف "${load.item}"؟`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "نعم، احذف",
    cancelButtonText: "إلغاء",
  });

  if (result.isConfirmed) {
    showLoading("جاري الحذف...");

    try {
      const index = allLoads.findIndex((l) => l.id === loadId);
      if (index !== -1) {
        allLoads.splice(index, 1);
        await set(ref(db, "Loads_Management"), { loads: allLoads });
        filteredLoads = [...allLoads];
        displayLoads();
      }

      hideLoading();
      Swal.fire("تم الحذف", "", "success", {
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      hideLoading();
      Swal.fire("خطأ", "فشل حذف الحمل", "error");
    }
  }
};

// ========== Preview Image ==========
window.previewImage = (imageSrc, description) => {
  Swal.fire({
    title: description || "معاينة الصورة",
    html: `
            <img src="${imageSrc}" style="max-width: 100%; max-height: 70vh; border-radius: 8px;">
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
  link.download = "load_image.jpg";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ========== Import Excel ==========
window.importExcel = async function (input) {
  const file = input.files[0];
  if (!file) return;

  showLoading("جاري استيراد البيانات...");

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      const newItems = jsonData.map((row) => {
        let sourceType = "3-PH-380v";
        const sourceText = row["نوع المصدر"] || row["sourceType"] || "";
        if (
          sourceText.includes("1") ||
          sourceText.includes("Single") ||
          sourceText.includes("220")
        ) {
          sourceType = "1-PH-220v";
        }

        const watts = parseFloat(row["القدرة بالوات"] || row["watts"] || 0);
        const hp = parseFloat(row["القدرة بالحصان"] || row["hp"] || 0);
        const amps = row["الأمبير"] || row["amp"];

        let finalWatts = watts;
        let finalHP = hp;
        let finalAmps = amps;

        if (watts > 0 && !hp) {
          const result = calculateFromWatt(watts, sourceType);
          finalHP = parseFloat(result.hp);
          finalAmps = parseFloat(result.amps);
        } else if (hp > 0 && !watts) {
          const result = calculateFromHP(hp, sourceType);
          finalWatts = parseFloat(result.watts);
          finalAmps = parseFloat(result.amps);
        } else if (amps && !watts && !hp) {
          const result = calculateFromAmps(amps, sourceType);
          finalWatts = parseFloat(result.watts);
          finalHP = parseFloat(result.hp);
        }

        return {
          id: Date.now().toString() + Math.random(),
          item: row["وصف نوع الحمل"] || row["item"] || "غير معروف",
          watts: finalWatts.toString(),
          hp: finalHP.toString(),
          amp: finalAmps ? finalAmps.toString() : "0",
          sourceType: sourceType,
          photo: null,
        };
      });

      allLoads = [...allLoads, ...newItems];
      await set(ref(db, "Loads_Management"), { loads: allLoads });
      filteredLoads = [...allLoads];
      displayLoads();

      hideLoading();
      Swal.fire("نجاح", `تم استيراد ${newItems.length} حمل بنجاح`, "success");
      input.value = "";
    } catch (error) {
      hideLoading();
      Swal.fire("خطأ", "فشل استيراد الملف", "error");
    }
  };
  reader.readAsArrayBuffer(file);
};

// ========== Export to Excel ==========
window.exportToExcel = function () {
  if (filteredLoads.length === 0 && allLoads.length === 0) {
    Swal.fire("تنبيه", "لا توجد بيانات لتصديرها", "warning");
    return;
  }

  const dataToExport = filteredLoads.length > 0 ? filteredLoads : allLoads;
  const data = dataToExport.map((l) => ({
    "وصف نوع الحمل": l.item,
    "القدرة بالوات": l.watts,
    "القدرة بالحصان": l.hp,
    الأمبير: l.amp,
    "نوع المصدر":
      l.sourceType === "3-PH-380v" ? "3 فاز - 380V" : "1 فاز - 220V",
    الفولت: l.sourceType === "3-PH-380v" ? "380" : "220",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الأحمال");
  XLSX.writeFile(
    wb,
    `Loads_Data_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
  Swal.fire("تم التصدير", "تم إنشاء ملف Excel بنجاح", "success", {
    timer: 1500,
    showConfirmButton: false,
  });
};

// ========== Helper Functions ==========
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

// ========== Dark Mode ==========
window.toggleDarkMode = (on) => {
  document.body.classList.toggle("dark-mode", !!on);
  localStorage.setItem("darkMode", on ? "1" : "0");
};

if (localStorage.getItem("darkMode") === "1") {
  document.body.classList.add("dark-mode");
}

// ========== Initialize ==========
loadLoads();

console.log("✅ Add Loads page loaded successfully with auto calculations!");
