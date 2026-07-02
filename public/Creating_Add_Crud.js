let allElements = [];
let logicalFields = [];
let actionElements = [];
let generatedBlocks = {
  functions: {},
  listeners: {},
};
let generatorBase = {
  firebaseSetup: "",
  baseSection: "",
};

// Firebase config (replace with your own or use the one from input)
const firebaseConfig = {
  apiKey: "AIzaSyBrwioR6w9GHIxVnHWriyYB4BaJbXZ8xlU",
  authDomain: "codeae-85.firebaseapp.com",
  projectId: "codeae-85",
  storageBucket: "codeae-85.firebasestorage.app",
  messagingSenderId: "855701949624",
  appId: "1:855701949624:web:2cf2ea8802a2d372f3384d",
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Helper functions
function extractElementMeta(element) {
  const tagName = element.tagName.toLowerCase();
  const inputType = (element.getAttribute("type") || "").toLowerCase();
  return {
    id: element.id,
    tagName,
    type: inputType,
    name: element.getAttribute("name") || "",
    text: (element.textContent || "").trim(),
  };
}

function getFieldAccessor(meta) {
  if (meta.tagName === "input" && meta.type === "checkbox") return "checkbox";
  if (meta.tagName === "input" && meta.type === "radio") return "radio";
  if (meta.tagName === "table") return "table";
  if (meta.tagName === "textarea" || meta.tagName === "select") return "value";
  if (meta.tagName === "input") return "value";
  return "content";
}

function isActionControl(meta) {
  return (
    meta.tagName === "button" ||
    ["button", "submit", "reset"].includes(meta.type)
  );
}

function isSupportedDataField(meta) {
  if (meta.tagName === "textarea" || meta.tagName === "select") return true;
  if (meta.tagName === "input")
    return !["button", "submit", "reset"].includes(meta.type);
  return false;
}

function isLikelyUtilityField(field) {
  const haystack =
    `${field.key} ${field.label} ${field.name} ${field.type}`.toLowerCase();
  return haystack.includes("search") || haystack.includes("filter");
}

function buildLogicalFieldsFromElements(elements) {
  const fields = [];
  const seenRadioGroups = new Set();

  elements.forEach((meta) => {
    if (meta.tagName === "input" && meta.type === "radio" && meta.name) {
      if (seenRadioGroups.has(meta.name)) return;
      const groupItems = elements.filter(
        (item) =>
          item.tagName === "input" &&
          item.type === "radio" &&
          item.name === meta.name,
      );
      seenRadioGroups.add(meta.name);
      fields.push({
        key: meta.name,
        label: `${meta.name} (radio)`,
        accessor: "radio",
        sourceId: groupItems[0]?.id || "",
        sourceIds: groupItems.map((item) => item.id),
        name: meta.name,
        tagName: "input",
        type: "radio",
      });
      return;
    }
    if (isActionControl(meta) || !isSupportedDataField(meta)) return;
    fields.push({
      key: meta.id,
      label: `${meta.id} (${meta.type || meta.tagName})`,
      accessor: getFieldAccessor(meta),
      sourceId: meta.id,
      sourceIds: [meta.id],
      name: meta.name,
      tagName: meta.tagName,
      type: meta.type,
    });
  });
  return fields;
}

function getDefaultKeyField() {
  const firstNonUtility = logicalFields.find(
    (field) => !isLikelyUtilityField(field),
  );
  return firstNonUtility?.key || logicalFields[0]?.key || "";
}

function normalizeActionText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findSuggestedActionId(keywords) {
  const normalizedKeywords = keywords.map((k) => k.toLowerCase());
  const matched = actionElements.find((el) => {
    const haystack = normalizeActionText(
      `${el.id} ${el.name} ${el.text} ${el.type}`,
    );
    return normalizedKeywords.some((kw) => haystack.includes(kw));
  });
  return matched ? matched.id : "";
}

function findSuggestedFieldId(keywords) {
  const normalizedKeywords = keywords.map((k) => k.toLowerCase());
  const matched = logicalFields.find((field) => {
    const haystack = normalizeActionText(
      `${field.key} ${field.label} ${field.name} ${field.type}`,
    );
    return normalizedKeywords.some((kw) => haystack.includes(kw));
  });
  return matched ? matched.sourceId : "";
}

function populateActionIdSuggestions() {
  const firstTableId =
    allElements.find((el) => el.tagName === "table")?.id || "";

  const suggestions = {
    addActionIdInput: findSuggestedActionId(["add", "save", "create"]),
    editActionIdInput: findSuggestedActionId(["edit", "update"]),
    loadActionIdInput: findSuggestedActionId(["load", "search", "fetch"]),
    deleteActionIdInput: findSuggestedActionId(["delete", "remove"]),
    deleteAllActionIdInput: findSuggestedActionId([
      "delete all",
      "remove all",
      "clear all",
    ]),
    fetchAllActionIdInput: findSuggestedActionId([
      "fetch all",
      "load all",
      "show all",
    ]),
    filterInputIdInput: findSuggestedFieldId(["search", "filter"]),
    tableBodySelectorInput: firstTableId ? `#${firstTableId} tbody` : "",
  };

  Object.entries(suggestions).forEach(([inputId, value]) => {
    const input = document.getElementById(inputId);
    if (input && !input.value.trim() && value) input.value = value;
  });
}

function getActionIdConfig() {
  return {
    addButtonId:
      document.getElementById("addActionIdInput")?.value.trim() || "",
    editButtonId:
      document.getElementById("editActionIdInput")?.value.trim() || "",
    loadButtonId:
      document.getElementById("loadActionIdInput")?.value.trim() || "",
    deleteButtonId:
      document.getElementById("deleteActionIdInput")?.value.trim() || "",
    deleteAllButtonId:
      document.getElementById("deleteAllActionIdInput")?.value.trim() || "",
    fetchAllButtonId:
      document.getElementById("fetchAllActionIdInput")?.value.trim() || "",
    filterInputId:
      document.getElementById("filterInputIdInput")?.value.trim() || "",
    tableBodySelector:
      document.getElementById("tableBodySelectorInput")?.value.trim() || "",
  };
}

function setActionIdConfig(config = {}) {
  const mapping = {
    addActionIdInput: config.addButtonId || "",
    editActionIdInput: config.editButtonId || "",
    loadActionIdInput: config.loadButtonId || "",
    deleteActionIdInput: config.deleteButtonId || "",
    deleteAllActionIdInput: config.deleteAllButtonId || "",
    fetchAllActionIdInput: config.fetchAllButtonId || "",
    filterInputIdInput: config.filterInputId || "",
    tableBodySelectorInput: config.tableBodySelector || "",
  };
  Object.entries(mapping).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
}

// Firebase project management
async function loadProjectsList() {
  try {
    const snapshot = await database.ref("Projects").once("value");
    const projects = snapshot.val();
    const select = document.getElementById("savedProjectsSelect");
    select.innerHTML = '<option value="">-- Load project --</option>';

    if (projects) {
      Object.keys(projects).forEach((key) => {
        const option = document.createElement("option");
        option.value = key;
        const date = projects[key].createdAt
          ? new Date(projects[key].createdAt).toLocaleString()
          : "unknown";
        option.textContent = `${key} (${date})`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Load list error:", error);
    alert("Error loading projects: " + error.message);
  }
}

async function saveProjectToFirebase() {
  const projectName = prompt("Enter project name:", "my_crud_project");
  if (!projectName) return;

  const state = {
    html: document.getElementById("htmlInput").value,
    firebaseConfig: document.getElementById("firebaseConfigInput").value,
    databasePath:
      document.getElementById("databasePathInput").value.trim() || "records",
    actionIds: getActionIdConfig(),
    createdAt: new Date().toISOString(),
  };

  try {
    await database.ref(`Projects/${projectName}`).set(state);
    alert(`✅ Project "${projectName}" saved!`);
    loadProjectsList();
  } catch (error) {
    alert("Save error: " + error.message);
  }
}

async function deleteProjectFromFirebase() {
  const projectName = document.getElementById("savedProjectsSelect").value;
  if (!projectName) {
    alert("Select a project to delete first.");
    return;
  }

  if (
    !confirm(
      `⚠️ Permanently delete project "${projectName}"? This cannot be undone.`,
    )
  )
    return;

  try {
    await database.ref(`Projects/${projectName}`).remove();
    alert(`🗑️ Project "${projectName}" deleted successfully.`);
    loadProjectsList();
    document.getElementById("savedProjectsSelect").value = "";
  } catch (error) {
    alert("Delete error: " + error.message);
  }
}

async function loadSelectedProject() {
  const projectName = document.getElementById("savedProjectsSelect").value;
  if (!projectName) {
    alert("Select a project to load.");
    return;
  }

  try {
    const snapshot = await database
      .ref(`Projects/${projectName}`)
      .once("value");
    const state = snapshot.val();
    if (!state) throw new Error("Project not found");

    document.getElementById("htmlInput").value = state.html || "";
    document.getElementById("firebaseConfigInput").value =
      state.firebaseConfig || "";
    document.getElementById("databasePathInput").value =
      state.databasePath || "records";
    setActionIdConfig(state.actionIds || {});

    generatedBlocks = { functions: {}, listeners: {} };
    generatorBase = { firebaseSetup: "", baseSection: "" };
    document.getElementById("jsOutput").value = "";
    document.getElementById("setupSection").style.display = "none";

    const msgDiv = document.getElementById("previewMsg");
    if (state.html?.trim()) {
      msgDiv.style.display = "block";
      msgDiv.innerHTML = `📁 Project "${projectName}" loaded. Click "Analyze Elements" to parse HTML.`;
    } else {
      msgDiv.style.display = "none";
    }

    alert(`✅ Project "${projectName}" loaded!`);
  } catch (error) {
    alert("Load error: " + error.message);
  }
}

// Analyze HTML
window.analyzeHTML = function () {
  const rawHtml = document.getElementById("htmlInput").value;
  if (!rawHtml.trim()) {
    alert("Paste HTML first!");
    return;
  }

  try {
    const parsed = new DOMParser().parseFromString(rawHtml, "text/html");
    allElements = Array.from(parsed.querySelectorAll("[id]")).map(
      extractElementMeta,
    );
    actionElements = allElements.filter((el) => isActionControl(el));
    logicalFields = buildLogicalFieldsFromElements(allElements);

    if (!logicalFields.length) {
      alert(
        "No usable input fields found. Add IDs to inputs, selects, or textareas.",
      );
      return;
    }

    document.getElementById("previewMsg").innerHTML =
      `✅ Found ${allElements.length} elements, ${logicalFields.length} usable fields.`;
    document.getElementById("previewMsg").style.display = "block";

    renderMappingUI();
    populateActionIdSuggestions();
    document.getElementById("setupSection").style.display = "block";
  } catch (error) {
    alert("Parse error: " + error.message);
  }
};

window.renderMappingUI = function () {
  const dataDiv = document.getElementById("dataFields");
  const actionDiv = document.getElementById("actionFields");
  const defaultKey = getDefaultKeyField();

  dataDiv.innerHTML = "";
  actionDiv.innerHTML = "";

  logicalFields.forEach((field) => {
    const isUtility = isLikelyUtilityField(field);
    dataDiv.innerHTML += `
            <div class="item">
                <input type="radio" name="keyField" value="${field.key}" ${field.key === defaultKey ? "checked" : ""}>
                <label>${field.label}</label>
            </div>`;
    actionDiv.innerHTML += `
            <div class="item">
                <input type="checkbox" data-field-key="${field.key}" class="payload-checkbox" ${!isUtility ? "checked" : ""}>
                <label>${field.label}</label>
            </div>`;
  });
};

// Code generation
function getGeneratedTemplates() {
  return {
    add: [
      `async function addRecord() {
    const id = getFieldValue(KEY_FIELD);
    if (!id) return alert("Primary key required.");
    await set(getRecordRef(id), buildPayload());
    alert("Record added.");
    clearForm();
}`,
      `if (ACTIONS.addBtn) ACTIONS.addBtn.onclick = addRecord;`,
    ],
    edit: [
      `async function editRecord() {
    const id = getFieldValue(KEY_FIELD);
    if (!id) return alert("Enter primary key.");
    await update(getRecordRef(id), buildPayload());
    alert("Record updated.");
    clearForm();
}`,
      `if (ACTIONS.editBtn) ACTIONS.editBtn.onclick = editRecord;`,
    ],
    load: [
      `async function loadRecord() {
    const id = getFieldValue(KEY_FIELD);
    if (!id) return alert("Enter primary key.");
    const snapshot = await get(getRecordRef(id));
    if (!snapshot.exists()) return alert("Not found.");
    loadDataIntoForm(id, snapshot.val());
    alert("Loaded.");
}`,
      `if (ACTIONS.loadBtn) ACTIONS.loadBtn.onclick = loadRecord;`,
    ],
    delete: [
      `async function deleteRecord() {
    const id = getFieldValue(KEY_FIELD);
    if (!id) return alert("Enter primary key.");
    if (!confirm("Delete?")) return;
    await remove(getRecordRef(id));
    alert("Deleted.");
    clearForm();
}`,
      `if (ACTIONS.deleteBtn) ACTIONS.deleteBtn.onclick = deleteRecord;`,
    ],
    deleteAll: [
      `async function deleteAllRecords() {
    if (!confirm("Delete ALL records?")) return;
    await remove(ref(db, DATABASE_PATH));
    alert("All deleted.");
    clearForm();
    renderEmptyTable("No data.");
}`,
      `if (ACTIONS.deleteAllBtn) ACTIONS.deleteAllBtn.onclick = deleteAllRecords;`,
    ],
    fetchAll: [
      `function fetchAll() {
    if (!ACTIONS.tableBody) return;
    if (stopRecordsListener) stopRecordsListener();
    stopRecordsListener = onValue(ref(db, DATABASE_PATH), (snapshot) => {
        ACTIONS.tableBody.innerHTML = "";
        if (!snapshot.exists()) return renderEmptyTable("No data.");
        snapshot.forEach(child => {
            const data = child.val() || {};
            const row = document.createElement("tr");
            TABLE_FIELDS.forEach(field => {
                const val = field === KEY_FIELD ? child.key : data[field];
                const td = document.createElement("td");
                td.textContent = val === undefined ? "-" : String(val);
                row.appendChild(td);
            });
            row.style.cursor = "pointer";
            row.onclick = () => loadDataIntoForm(child.key, data);
            ACTIONS.tableBody.appendChild(row);
        });
        if (typeof filterTable === "function") filterTable();
    });
}`,
      `if (ACTIONS.fetchAllBtn) ACTIONS.fetchAllBtn.onclick = fetchAll;`,
    ],
    search: [
      `function filterTable() {
    const query = ((ACTIONS.filterInput?.value) || "").toUpperCase();
    const rows = ACTIONS.tableBody?.querySelectorAll("tr") || [];
    rows.forEach(row => {
        row.style.display = row.innerText.toUpperCase().includes(query) ? "" : "none";
    });
}`,
      `if (ACTIONS.filterInput) ACTIONS.filterInput.oninput = filterTable;`,
    ],
  };
}

window.generateFirebaseJS = function () {
  const userCode = document.getElementById("firebaseConfigInput").value;
  const dbPath =
    document.getElementById("databasePathInput").value.trim() || "records";
  const action = document.getElementById("crudAction").value;
  const keyField = document.querySelector(
    'input[name="keyField"]:checked',
  )?.value;
  const actionIds = getActionIdConfig();
  const payloadFields = Array.from(
    document.querySelectorAll(".payload-checkbox:checked"),
  )
    .map((cb) => cb.dataset.fieldKey)
    .filter((f) => f !== keyField && f !== actionIds.filterInputId);

  if (!keyField) return alert("Select a primary key.");

  // Build setup
  let setup = userCode.trim();
  if (!setup) return alert("Paste Firebase config.");
  if (!setup.includes("firebaseConfig"))
    setup = `const firebaseConfig = ${setup}`;
  if (!setup.includes("initializeApp"))
    setup += `\nconst app = initializeApp(firebaseConfig);`;
  if (!setup.includes("getDatabase")) setup += `\nconst db = getDatabase(app);`;
  setup += `\nconst DATABASE_PATH = ${JSON.stringify(dbPath)};`;

  // Build base section
  const allIds = allElements.map((el) => el.id);
  const domEntries = allIds
    .map(
      (id) =>
        `    ${JSON.stringify(id)}: document.getElementById(${JSON.stringify(id)})`,
    )
    .join(",\n");
  const fieldConfig = {};
  [...new Set([keyField, ...payloadFields])].forEach((fk) => {
    const f = logicalFields.find((lf) => lf.key === fk);
    if (f)
      fieldConfig[fk] = {
        accessor: f.accessor,
        sourceId: f.sourceId,
        name: f.name,
      };
  });

  const baseSection = `const DOM = {\n${domEntries}\n};\nconst KEY_FIELD = ${JSON.stringify(keyField)};\nconst PAYLOAD_FIELDS = ${JSON.stringify(payloadFields)};\nconst TABLE_FIELDS = ${JSON.stringify([keyField, ...payloadFields])};\nconst FIELD_CONFIG = ${JSON.stringify(fieldConfig)};\nconst ACTION_CONFIG = ${JSON.stringify(actionIds)};\nconst ACTIONS = {
    addBtn: document.getElementById(ACTION_CONFIG.addButtonId),
    editBtn: document.getElementById(ACTION_CONFIG.editButtonId),
    loadBtn: document.getElementById(ACTION_CONFIG.loadButtonId),
    deleteBtn: document.getElementById(ACTION_CONFIG.deleteButtonId),
    deleteAllBtn: document.getElementById(ACTION_CONFIG.deleteAllButtonId),
    fetchAllBtn: document.getElementById(ACTION_CONFIG.fetchAllButtonId),
    filterInput: document.getElementById(ACTION_CONFIG.filterInputId),
    tableBody: document.querySelector(ACTION_CONFIG.tableBodySelector) || document.querySelector("#dataTable tbody")
};\nlet stopRecordsListener = null;\nfunction getFieldValue(k){const c=FIELD_CONFIG[k];if(!c)return"";if(c.accessor==="radio"){const r=document.querySelector('input[name="'+c.name+'"]:checked');return r?r.value:""}const el=DOM[c.sourceId];if(!el)return"";if(c.accessor==="checkbox")return el.checked?"Yes":"No";return el.value??""}\nfunction setFieldValue(k,v){const c=FIELD_CONFIG[k];if(!c)return;if(c.accessor==="radio"){const r=document.querySelector('input[name="'+c.name+'"][value="'+v+'"]');if(r)r.checked=true;return}const el=DOM[c.sourceId];if(!el)return;if(c.accessor==="checkbox"){el.checked=v===true||v==="Yes";return}if("value"in el)el.value=v??""}\nfunction clearFieldValue(k){const c=FIELD_CONFIG[k];if(!c)return;if(c.accessor==="radio"){document.querySelectorAll('input[name="'+c.name+'"]').forEach(r=>r.checked=false);return}const el=DOM[c.sourceId];if(!el)return;if(c.accessor==="checkbox"){el.checked=false;return}if("value"in el)el.value=""}\nfunction buildPayload(){const p={};PAYLOAD_FIELDS.forEach(k=>p[k]=getFieldValue(k));return p}\nfunction clearForm(){[KEY_FIELD,...PAYLOAD_FIELDS].forEach(clearFieldValue)}\nfunction loadDataIntoForm(k,d){setFieldValue(KEY_FIELD,k);PAYLOAD_FIELDS.forEach(f=>setFieldValue(f,d?d[f]:""))}\nfunction renderEmptyTable(m){if(ACTIONS.tableBody){ACTIONS.tableBody.innerHTML="";const r=ACTIONS.tableBody.insertRow();const c=r.insertCell();c.colSpan=TABLE_FIELDS.length||1;c.textContent=m;c.style.textAlign="center"}}\nfunction getRecordRef(k){return ref(db,DATABASE_PATH+"/"+k)}`;

  generatorBase.firebaseSetup = `import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase, ref, set, onValue, get, update, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";\n\n${setup}\n\n`;
  generatorBase.baseSection = baseSection;

  const templates = getGeneratedTemplates();
  if (templates[action]) {
    generatedBlocks.functions[action] = templates[action][0];
    generatedBlocks.listeners[action] = templates[action][1];
  }

  renderFinalCode();
};

function renderFinalCode() {
  let code = generatorBase.firebaseSetup + generatorBase.baseSection + "\n";
  code += Object.values(generatedBlocks.functions).join("\n\n") + "\n\n";
  code += Object.values(generatedBlocks.listeners).join("\n") + "\n\n";
  if (generatedBlocks.functions.fetchAll) code += "fetchAll();\n";
  document.getElementById("jsOutput").value = code;
}

window.removeFunction = function () {
  const action = document.getElementById("crudAction").value;
  delete generatedBlocks.functions[action];
  delete generatedBlocks.listeners[action];
  renderFinalCode();
};

window.clearAllBlocks = function () {
  if (confirm("Clear all generated code?")) {
    generatedBlocks = { functions: {}, listeners: {} };
    generatorBase = { firebaseSetup: "", baseSection: "" };
    renderFinalCode();
  }
};

window.copyToClipboard = function () {
  const output = document.getElementById("jsOutput");
  output.select();
  document.execCommand("copy");
  alert("Copied!");
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadProjectsList();
  document.getElementById("loadProjectBtn").onclick = loadSelectedProject;
  document.getElementById("saveProjectBtn").onclick = saveProjectToFirebase;
  document.getElementById("deleteProjectBtn").onclick =
    deleteProjectFromFirebase;
  document.getElementById("refreshProjectsBtn").onclick = loadProjectsList;
});
