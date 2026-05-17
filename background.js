const POPUP_URL = chrome.runtime.getURL("popup.html");

async function findExistingPopupWindowId() {
  const windows = await chrome.windows.getAll({ populate: true });
  for (const win of windows) {
    const tabs = Array.isArray(win.tabs) ? win.tabs : [];
    const hasPopupTab = tabs.some((tab) => typeof tab.url === "string" && tab.url.startsWith(POPUP_URL));
    if (hasPopupTab && Number.isInteger(win.id)) {
      return win.id;
    }
  }
  return null;
}

async function openOrFocusPopupWindow() {
  const existingId = await findExistingPopupWindowId();
  if (existingId !== null) {
    await chrome.windows.update(existingId, { focused: true });
    return;
  }

  await chrome.windows.create({
    url: `${POPUP_URL}?detached=1`,
    type: "popup",
    width: 460,
    height: 760,
    focused: true
  });
}

chrome.action.onClicked.addListener(() => {
  openOrFocusPopupWindow().catch((error) => {
    console.error("Failed to open popup window:", error);
  });
});
