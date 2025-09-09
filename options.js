const sel = document.getElementById('sel');
const fields = ['fullName','phone','email','university','studentId','purpose','floor','fcjShirt','autoFillOnLoad'];
const refs = Object.fromEntries(fields.map(id => [id, document.getElementById(id)]));

function loadUI(profiles={}, activeKey){
  sel.innerHTML='';
  Object.keys(profiles).forEach(k=>{
    const opt=document.createElement('option'); opt.value=k; opt.textContent=k;
    if(k===activeKey) opt.selected=true; sel.appendChild(opt);
  });
  if(activeKey && profiles[activeKey]) fillForm(profiles[activeKey]);
}
function fillForm(p={}){
  for(const k of fields){
    if(!refs[k]) continue;
    if(refs[k].type==='checkbox') refs[k].checked=!!p[k];
    else refs[k].value=p[k]||'';
  }
}
function readForm(){
  const p={};
  for(const k of fields){
    if(refs[k].type==='checkbox') p[k]=refs[k].checked;
    else p[k]=refs[k].value.trim();
  }
  return p;
}
function save(profiles, activeKey){
  profiles[activeKey]=readForm();
  chrome.storage.sync.set({profiles, activeProfileKey: activeKey}, ()=>alert('Đã lưu.'));
}
document.getElementById('newBtn').onclick=()=>{
  const name=prompt('Tên profile mới (vd: "Mặc định"):'); if(!name) return;
  chrome.storage.sync.get(['profiles'],(res)=>{
    const profiles=res.profiles||{}; if(profiles[name]) return alert('Tên đã tồn tại!');
    profiles[name]={}; chrome.storage.sync.set({profiles, activeProfileKey:name}, ()=>loadUI(profiles, name));
  });
};
document.getElementById('saveBtn').onclick=()=>{
  const key=sel.value; if(!key) return;
  chrome.storage.sync.get(['profiles'],(res)=>save(res.profiles||{}, key));
};
document.getElementById('delBtn').onclick=()=>{
  const key=sel.value; if(!key) return; if(!confirm('Xoá profile này?')) return;
  chrome.storage.sync.get(['profiles'],(res)=>{
    const profiles=res.profiles||{}; delete profiles[key];
    const nextKey=Object.keys(profiles)[0]||null;
    chrome.storage.sync.set({profiles, activeProfileKey: nextKey}, ()=>loadUI(profiles, nextKey));
  });
};
sel.onchange=()=>{
  const key=sel.value;
  chrome.storage.sync.get(['profiles'],(res)=>fillForm((res.profiles||{})[key]||{}));
};
chrome.storage.sync.get(['profiles','activeProfileKey'],(res)=>{
  if(!res.profiles || Object.keys(res.profiles).length===0){
    const def='Mặc định';
    const profiles={[def]:{fullName:'',phone:'',email:'',university:'',studentId:'',purpose:'',floor:'',fcjShirt:'',autoFillOnLoad:true}};
    chrome.storage.sync.set({profiles, activeProfileKey:def}, ()=>loadUI(profiles, def));
  } else {
    loadUI(res.profiles, res.activeProfileKey);
  }
});
