const inputs = {
  testMid: document.querySelector("#testMid"),
  alarmPeriodMinutes: document.querySelector("#alarmPeriodMinutes"),
  pageSize: document.querySelector("#pageSize"),
  maxAgeHours: document.querySelector("#maxAgeHours"),
  addIntervalSeconds: document.querySelector("#addIntervalSeconds"),
  fetchRetryCount: document.querySelector("#fetchRetryCount"),
  addRetryCount: document.querySelector("#addRetryCount"),
  failedCooldownMinutes: document.querySelector("#failedCooldownMinutes"),
  dryRun: document.querySelector("#dryRun"),
  autoSyncEnabled: document.querySelector("#autoSyncEnabled"),
  allowAutoLiveSync: document.querySelector("#allowAutoLiveSync")
};
const ownersEl = document.querySelector("#owners");
const addOwnerButton = document.querySelector("#addOwner");
const refreshProfilesButton = document.querySelector("#refreshProfiles");
const saveButton = document.querySelector("#save");
const exportButton = document.querySelector("#exportConfig");
const importButton = document.querySelector("#importConfig");
const configJsonEl = document.querySelector("#configJson");
const statusEl = document.querySelector("#status");
const overviewModeEl = document.querySelector("#overviewMode");
const overviewAutoEl = document.querySelector("#overviewAuto");
const overviewOwnersEl = document.querySelector("#overviewOwners");

let owners = [];

init();

for (const input of Object.values(inputs)) {
  input.addEventListener("change", renderOverview);
}

addOwnerButton.addEventListener("click", () => {
  owners.push({
    mid: "",
    name: "",
    avatarUrl: "",
    spaceUrl: "",
    enabled: true
  });
  renderOwners();
  renderOverview();
});

refreshProfilesButton.addEventListener("click", async () => {
  statusEl.textContent = "Refreshing...";
  await saveSettings(readSettings(), "Profiles refreshed.");
});

saveButton.addEventListener("click", async () => {
  statusEl.textContent = "Saving...";
  await saveSettings(readSettings(), "Saved.");
});

exportButton.addEventListener("click", () => {
  configJsonEl.value = JSON.stringify(readSettings(), null, 2);
  statusEl.textContent = "Exported.";
});

importButton.addEventListener("click", async () => {
  try {
    const imported = JSON.parse(configJsonEl.value);
    applySettings(imported);
    await saveSettings(readSettings(), "Imported.");
  } catch (error) {
    statusEl.textContent = error.message;
  }
});

async function init() {
  const response = await chrome.runtime.sendMessage({ type: "getState" });
  if (!response?.ok) {
    statusEl.textContent = response?.error?.message ?? "Failed to load settings.";
    return;
  }

  applySettings(response.result.settings);
}

async function saveSettings(settings, successMessage) {
  const response = await chrome.runtime.sendMessage({
    type: "saveSettings",
    settings
  });

  if (response?.ok) {
    applySettings(response.result);
    statusEl.textContent = successMessage;
  } else {
    statusEl.textContent = response?.error?.message ?? "Failed.";
  }
}

function applySettings(settings) {
  inputs.testMid.value = settings.testMid ?? 946974;
  inputs.alarmPeriodMinutes.value = settings.alarmPeriodMinutes ?? 30;
  inputs.pageSize.value = settings.pageSize ?? 10;
  inputs.maxAgeHours.value = settings.maxAgeHours ?? "";
  inputs.addIntervalSeconds.value = settings.addIntervalSeconds ?? 2;
  inputs.fetchRetryCount.value = settings.fetchRetryCount ?? 1;
  inputs.addRetryCount.value = settings.addRetryCount ?? 1;
  inputs.failedCooldownMinutes.value = settings.failedCooldownMinutes ?? 60;
  inputs.dryRun.checked = settings.dryRun !== false;
  inputs.autoSyncEnabled.checked = settings.autoSyncEnabled === true;
  inputs.allowAutoLiveSync.checked = settings.allowAutoLiveSync === true;
  owners = Array.isArray(settings.owners) ? settings.owners : [];
  renderOwners();
  renderOverview();
}

function renderOwners() {
  ownersEl.innerHTML = "";
  owners.forEach((owner, index) => {
    const row = document.createElement("article");
    row.className = `owner ${owner.enabled === false ? "disabled" : ""}`;
    row.innerHTML = `
      <img class="avatar" src="${escapeAttr(owner.avatarUrl || "")}" alt="">
      <div class="owner-main">
        <div class="owner-title">
          <strong>${escapeHtml(owner.name || `UP ${owner.mid || ""}`)}</strong>
          ${owner.spaceUrl ? `<a href="${escapeAttr(owner.spaceUrl)}" target="_blank">Open</a>` : ""}
        </div>
        <div class="owner-fields">
          <label class="check compact">
            <input type="checkbox" data-field="enabled" ${owner.enabled !== false ? "checked" : ""}>
            <span>Enabled</span>
          </label>
          <label class="field compact">
            <span>mid</span>
            <input type="number" min="1" data-field="mid" value="${escapeAttr(owner.mid)}">
          </label>
          <label class="field compact">
            <span>Name</span>
            <input type="text" data-field="name" value="${escapeAttr(owner.name ?? "")}">
          </label>
          <button type="button" class="danger" data-action="remove">Remove</button>
        </div>
        <p>${owner.profileFetchedAt ? `Profile refreshed ${owner.profileFetchedAt}` : "Profile not refreshed yet."}</p>
      </div>
    `;

    row.addEventListener("input", (event) => {
      const field = event.target.dataset.field;
      if (!field) return;
      owners[index] = {
        ...owners[index],
        [field]: field === "mid" ? Number(event.target.value) : event.target.value
      };
      renderOverview();
    });

    row.addEventListener("change", (event) => {
      if (event.target.dataset.field === "enabled") {
        owners[index] = {
          ...owners[index],
          enabled: event.target.checked
        };
        renderOwners();
        renderOverview();
      }
    });

    row.querySelector('[data-action="remove"]').addEventListener("click", () => {
      owners.splice(index, 1);
      renderOwners();
      renderOverview();
    });

    ownersEl.append(row);
  });

  if (!owners.length) {
    ownersEl.innerHTML = '<p class="empty">No UP owners configured.</p>';
  }
}

function renderOverview() {
  const settings = readSettings();
  const enabledOwners = settings.owners.filter((owner) => owner.enabled).length;
  overviewModeEl.textContent = settings.dryRun ? "Dry-run" : "Live";
  overviewAutoEl.textContent = settings.autoSyncEnabled
    ? settings.dryRun || settings.allowAutoLiveSync ? `${settings.alarmPeriodMinutes}m` : "Blocked"
    : "Off";
  overviewOwnersEl.textContent = `${enabledOwners}/${settings.owners.length}`;
}

function readSettings() {
  return {
    testMid: Number(inputs.testMid.value),
    alarmPeriodMinutes: Number(inputs.alarmPeriodMinutes.value),
    pageSize: Number(inputs.pageSize.value),
    maxAgeHours: inputs.maxAgeHours.value ? Number(inputs.maxAgeHours.value) : null,
    addIntervalSeconds: Number(inputs.addIntervalSeconds.value),
    fetchRetryCount: Number(inputs.fetchRetryCount.value),
    addRetryCount: Number(inputs.addRetryCount.value),
    failedCooldownMinutes: Number(inputs.failedCooldownMinutes.value),
    dryRun: inputs.dryRun.checked,
    autoSyncEnabled: inputs.autoSyncEnabled.checked,
    allowAutoLiveSync: inputs.allowAutoLiveSync.checked,
    owners: owners.map((owner) => ({
      mid: Number(owner.mid),
      name: owner.name ?? "",
      avatarUrl: owner.avatarUrl ?? "",
      spaceUrl: owner.spaceUrl ?? "",
      profileFetchedAt: owner.profileFetchedAt ?? "",
      enabled: owner.enabled !== false
    }))
  };
}

function escapeAttr(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function escapeHtml(value) {
  return escapeAttr(value);
}
