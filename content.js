let cachedProfile = null;

const KEYWORDS = {
  fullName: [/họ.*tên/i, /\bname\b/i],
  phone: [/s[ốo]\s*điện\s*thoại/i, /\bphone\b/i, /\btel\b/i],
  email: [/email/i],
  university: [/trường\s*(đại\s*học)?/i, /university/i, /college/i, /school/i, /đại\s*học/i],
  studentId: [/mã\s*số\s*sinh\s*viên/i, /mã\s*sinh\s*viên/i, /student\s*id/i, /\bmsv\b/i],
  purpose: [/mục\s*đích/i, /purpose/i],
  floor: [/tầng/i, /\bfloor\b/i],
  fcjShirt: [/đã\s*có\s*áo\s*fcj/i, /áo\s*fcj/i, /fcj.*shirt/i, /có\s*áo.*fcj/i]
};

function textOf(el){ return (el?.innerText || el?.textContent || "").trim(); }

function findByLabelLike(regex){
  const labels = [...document.querySelectorAll('label')];
  for (const lb of labels){
    if (regex.test(textOf(lb))){

      const id = lb.getAttribute('for');
      if (id){
        const target = document.getElementById(id);
        if (target) return target;
      }
      

      const inside = lb.querySelector('input, textarea, select, [role="combobox"]');
      if (inside) return inside;
      

      const parent = lb.parentElement;
      if (parent) {

        const sibling = parent.querySelector('input, textarea, select, [role="combobox"]');
        if (sibling) return sibling;
        

        const nextParent = parent.nextElementSibling;
        if (nextParent) {
          const nextField = nextParent.querySelector('input, textarea, select, [role="combobox"]');
          if (nextField) return nextField;
        }
      }
      

      let nextElement = lb.nextElementSibling;
      while (nextElement && nextElement.nodeType === 1) {
        if (nextElement.matches('input, textarea, select, [role="combobox"]')) {
          return nextElement;
        }

        const deepField = nextElement.querySelector('input, textarea, select, [role="combobox"]');
        if (deepField) return deepField;
        
        nextElement = nextElement.nextElementSibling;
      }
    }
  }
  return null;
}

function findByAttrLike(regex){
  const nodes = [...document.querySelectorAll('input, textarea, select, [role="combobox"]')];
  return nodes.find(n=>{
    const attrs = [
      n.getAttribute('name'),
      n.getAttribute('placeholder'),
      n.getAttribute('aria-label'),
      n.getAttribute('id')
    ].filter(Boolean).join(' ');
    return regex.test(attrs);
  }) || null;
}

function locateField(regex){ 
  const byLabel = findByLabelLike(regex);
  const byAttr = findByAttrLike(regex);
  return byLabel || byAttr; 
}


function locateUniversityField() {

  for (const regex of KEYWORDS.university) {
    const field = locateField(regex);
    if (field) {
      return field;
    }
  }
  
  const specialSelectors = [
    'select[name*="university"]',
    'select[name*="school"]',
    'input[name*="university"]',
    'input[name*="school"]',
    '[aria-label*="trường"]',
    '[aria-label*="university"]',
    '[placeholder*="trường"]',
    '[placeholder*="university"]'
  ];
  
  for (const selector of specialSelectors) {
    const field = document.querySelector(selector);
    if (field) {
      return field;
    }
  }
  return null;
}

function setTextLike(el, value){
  if (!el) return;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'select') {
    selectNative(el, value);
  } else {
    el.value = value;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
}

function selectNative(selectEl, textOrValue){
  let ok = false;
  const want = String(textOrValue).trim().toLowerCase();
  for (const opt of selectEl.options){
    const label = (opt.textContent||'').trim().toLowerCase();
    if (label === want){ opt.selected = true; ok = true; break; }
  }
  if (!ok) selectEl.value = textOrValue;
  selectEl.dispatchEvent(new Event('input',{bubbles:true}));
  selectEl.dispatchEvent(new Event('change',{bubbles:true}));
}

async function selectCustomDropdown(controlEl, visibleText){
  controlEl.click();


  const listbox = await waitFor(() => (
    document.querySelector('[role="listbox"], ul[role="menu"], .MuiList-root, .ant-select-dropdown, .headlessui-listbox-options')
  ), 800);

  if (!listbox) return false;

  const candidates = [
    ...listbox.querySelectorAll('[role="option"], li, .MuiMenuItem-root, .ant-select-item-option')
  ];
  const want = String(visibleText).trim().toLowerCase();

  let item = candidates.find(el => textOf(el).toLowerCase() === want)
         || candidates.find(el => textOf(el).toLowerCase().includes(want));

  if (!item){
    const all = [...document.querySelectorAll('[role="option"], .MuiMenuItem-root, .ant-select-item-option, li')];
    item = all.find(el => textOf(el).toLowerCase() === want)
        || all.find(el => textOf(el).toLowerCase().includes(want));
  }
  if (!item) return false;

  item.click();
  await delay(50);
  controlEl.dispatchEvent(new Event('input',{bubbles:true}));
  controlEl.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}

function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function waitFor(fn, timeout=800, interval=40){
  const start = performance.now();
  while (performance.now() - start < timeout){
    const v = fn();
    if (v) return v;
    await delay(interval);
  }
  return null;
}

async function setSelectLike(controlEl, visibleText){
  if (!controlEl) return;
  
  const tag = controlEl.tagName?.toLowerCase();

  if (tag === 'select') {
    selectNative(controlEl, visibleText);
    return;
  }

  const isCustom = controlEl.getAttribute('role') === 'combobox'
                || controlEl.hasAttribute('aria-haspopup')
                || /select|dropdown/i.test(controlEl.className);

  if (isCustom){
    const ok = await selectCustomDropdown(controlEl, visibleText);
    if (ok) return;
  }

  setTextLike(controlEl, visibleText);
}

function norm(s){ return (s||'').replace(/\s+/g,' ').trim().toLowerCase(); }

async function selectMuiByLabel(labelText, optionText){
  
  const allLabels = [...document.querySelectorAll('label[id]')];
  const wanted = norm(labelText);
  const candidateLabels = allLabels.filter(lb => norm(lb.textContent).includes(wanted));
  if (candidateLabels.length === 0) return false;
  let label = candidateLabels[0];
  
  if(!label) {
    console.warn('⚠️ Không tìm được label chứa:', labelText);
    return false;
  }
  

  let combo = null;
  for (const lb of candidateLabels){
    const comboSelectors = [
      `[role="combobox"][aria-labelledby*="${lb.id}"]`,
      `[role="combobox"][aria-labelledby="${lb.id}"]`,
      `#${lb.id} ~ * [role="combobox"]`,
      `label#${lb.id} + * [role="combobox"]`
    ];
    for (const selector of comboSelectors){
      const found = document.querySelector(selector);
      if (found){ combo = found; label = lb; break; }
    }
    if (combo) break;
  }
  
  if(!combo) {
    console.warn('⚠️ Không tìm được combobox với label id:', label.id);
    return false;
  }
  

  
  combo.focus();
  combo.click();
  combo.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  combo.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  combo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await delay(180);

  const comboMenuId = combo.getAttribute('aria-controls') || combo.getAttribute('aria-owns');
  const listbox = await waitFor(() => {
    if (comboMenuId) {
      const byId = document.getElementById(comboMenuId);
      if (byId) {
        const ul = byId.matches('ul') ? byId : byId.querySelector('ul,[role="listbox"]');
        if (ul) return ul;
      }
    }

    const candidates = [
      document.querySelector(`[role="listbox"][aria-labelledby="${label.id}"]`),
      document.querySelector('[role="listbox"]'),
      document.querySelector('.MuiList-root.MuiMenu-list'),
      document.querySelector('.MuiMenu-list'),
      document.querySelector('.MuiPaper-root .MuiList-root'),
      document.querySelector('.MuiPopover-paper .MuiList-root'),
      document.querySelector('.MuiMenu-paper ul'),
      document.querySelector('.MuiList-root[role="listbox"]')
    ].filter(Boolean);

    if (candidates.length > 0) return candidates[0];

    return null;
  }, 3500);
  
  if(!listbox) { combo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return false; }

  const want = norm(optionText).replace(/\s+/g,' ');
  
  
  const allOpts = [...listbox.querySelectorAll('[role="option"], .MuiMenuItem-root, li[role="option"]')];
  
  const validOpts = allOpts.filter(o => !o.hasAttribute('aria-disabled') || o.getAttribute('aria-disabled') !== 'true');
  
  let item = validOpts.find(o => {
    const dataValue = o.getAttribute('data-value');
    return dataValue && norm(dataValue) === want;
  });
  
  if (!item) {
    item = validOpts.find(o => {
      const dataValue = o.getAttribute('data-value');
      const textContent = norm(o.textContent).replace(/\s+/g,' ');
      return (dataValue && norm(dataValue).includes(want)) || textContent.includes(want);
    });
  }
  
  if(!item) { combo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return false; }

  item.click();
  await delay(150);
  
  combo.dispatchEvent(new Event('input', {bubbles:true}));
  combo.dispatchEvent(new Event('change', {bubbles:true}));
  combo.dispatchEvent(new Event('blur', {bubbles:true}));
  
  return true;
}

async function applyProfile(p){
  if (!p) return;
  setTextLike(locateField(KEYWORDS.fullName[0]), p.fullName);
  setTextLike(locateField(KEYWORDS.phone[0]),     p.phone);
  setTextLike(locateField(KEYWORDS.email[0]),     p.email);  
  
  if (!p.university?.trim()) {
    console.warn('⚠️ Không có thông tin trường đại học để điền');
  } else {
  
  try {
    const pickedMui = await selectMuiByLabel('Trường đại học', p.university);
    
    
    if (!pickedMui) {
      
      const universityField = locateUniversityField();
      
      if (universityField) {
        
        await setSelectLike(universityField, p.university);

      } else {
        toast('❌ Không tìm được field trường đại học');
      }
    }
  } catch (error) {
    toast('❌ Lỗi khi điền trường đại học: ' + error.message);
  }
  }

  setTextLike(locateField(KEYWORDS.studentId[0]), p.studentId);
  
  if (p.purpose) await selectMuiByLabel('Mục đích', p.purpose);
  
  if (p.floor) await selectMuiByLabel('Tầng', p.floor);
  
  if (p.fcjShirt) await selectMuiByLabel('Đã có áo FCJ hay chưa?', p.fcjShirt);
  
  toast('✅ Đã điền tất cả fields: Họ tên, SĐT, Email, Trường, MSV, Mục đích, Tầng, FCJ!');
}

function toast(msg){
  const d=document.createElement('div'); d.textContent=msg;
  Object.assign(d.style,{
    position:'fixed',right:'16px',bottom:'16px',
    background:'#111',color:'#fff',padding:'10px 12px',
    borderRadius:'8px',zIndex:2147483647,boxShadow:'0 4px 14px rgba(0,0,0,.2)'
  });
  document.body.appendChild(d); setTimeout(()=>d.remove(),1800);
}

chrome.runtime.onMessage.addListener((msg)=>{
  if (msg?.type === 'APPLY_PROFILE'){
    cachedProfile = msg.profile;
    applyProfile(cachedProfile);
  }
});

window.debugApplyProfile = applyProfile;

chrome.storage.sync.get(['profiles','activeProfileKey'], (res)=>{
  const key = res.activeProfileKey;
  const profile = res.profiles?.[key];
  if (profile?.autoFillOnLoad) applyProfile(profile);
});
