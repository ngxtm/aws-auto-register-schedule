chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'fill-now') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.storage.sync.get(['profiles', 'activeProfileKey'], (res) => {
    const key = res.activeProfileKey;
    const profile = res.profiles?.[key];
    if (!profile) return;
    chrome.tabs.sendMessage(tab.id, { type: 'APPLY_PROFILE', profile });
  });
});
