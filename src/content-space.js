initSpaceButton();

function initSpaceButton() {
  const mid = getMidFromLocation();
  if (!mid || document.querySelector("#watchlater-add-owner")) {
    return;
  }

  const button = document.createElement("button");
  button.id = "watchlater-add-owner";
  button.type = "button";
  button.textContent = "Add to Watchlater Bot";
  button.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:24px",
    "z-index:2147483647",
    "height:36px",
    "padding:0 12px",
    "border:0",
    "border-radius:6px",
    "background:#0969da",
    "color:#fff",
    "font:600 13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "box-shadow:0 4px 16px rgba(31,35,40,.18)",
    "cursor:pointer"
  ].join(";");

  button.addEventListener("click", async () => {
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "Adding...";
    try {
      const response = await chrome.runtime.sendMessage({
        type: "addOwnerFromTab"
      });
      if (!response?.ok) {
        throw new Error(response?.error?.message ?? "Failed to add owner.");
      }
      button.textContent = response.result.added ? "Added" : "Already added";
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 1600);
    } catch (error) {
      button.textContent = error.message;
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 2600);
    }
  });

  document.documentElement.append(button);
}

function getMidFromLocation() {
  return location.href.match(/^https:\/\/space\.bilibili\.com\/(\d+)/)?.[1] ?? "";
}
