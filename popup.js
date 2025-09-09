document.getElementById('fillBtn').onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.storage.sync.get(['profiles','activeProfileKey'], (res) => {
    const key = res.activeProfileKey;
    const profile = res.profiles?.[key];
    if (!profile) return;
    chrome.tabs.sendMessage(tab.id, { type: 'APPLY_PROFILE', profile });
  });
};
