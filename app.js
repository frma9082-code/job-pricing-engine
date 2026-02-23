// Job Pricing Engine - Local-only (browser storage). No servers.
const $ = (id) => document.getElementById(id);

const fields = [
  "projectName","clientName","materials","subs","laborHours","laborRate",
  "laborBurdenPct","overheadPct","targetProfitPct","contingencyPct","depositPct","currentBid"
];

function num(v){ const n=parseFloat(v); return isNaN(n)?0:n; }
function money(n){ return (n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
function pct(n){ return (n||0).toFixed(2) + "%"; }

function getInput(){
  const o={};
  fields.forEach(f=>o[f]= $(f).value);
  // numeric conversions
  o.materials=num(o.materials);
  o.subs=num(o.subs);
  o.laborHours=num(o.laborHours);
  o.laborRate=num(o.laborRate);
  o.laborBurdenPct=num(o.laborBurdenPct);
  o.overheadPct=num(o.overheadPct);
  o.targetProfitPct=num(o.targetProfitPct);
  o.contingencyPct=num(o.contingencyPct);
  o.depositPct=num(o.depositPct);
  o.currentBid=num(o.currentBid);
  return o;
}

function compute(o){
  // Labor burdened cost
  const laborBase = o.laborHours * o.laborRate;
  const laborBurden = laborBase * (o.laborBurdenPct/100);
  const laborTotal = laborBase + laborBurden;

  const directCosts = o.materials + o.subs + laborTotal;

  // Overhead allocation on direct costs
  const overhead = directCosts * (o.overheadPct/100);

  // Break-even = direct costs + overhead
  const breakeven = directCosts + overhead;

  // Price to achieve target profit margin on price (profit% of price):
  // price = (cost) / (1 - profitPct - contingencyPct)
  const profitPct = (o.targetProfitPct/100);
  const contPct = (o.contingencyPct/100);
  const denom = 1 - profitPct - contPct;
  const requiredBid = denom > 0 ? (breakeven / denom) : 0;

  const targetProfitDollars = requiredBid * profitPct;
  const contingencyDollars = requiredBid * contPct;

  const depositAmt = requiredBid * (o.depositPct/100);

  // Current bid analysis (optional)
  const currentBid = o.currentBid;
  const currentProfit = currentBid>0 ? (currentBid - breakeven) : 0;
  const currentMargin = currentBid>0 ? (currentProfit/currentBid)*100 : 0;

  const underbid = (currentBid>0 && currentBid < requiredBid) ? (requiredBid - currentBid) : 0;

  return {
    laborBase, laborBurden, laborTotal,
    directCosts, overhead, breakeven,
    requiredBid, targetProfitDollars, contingencyDollars,
    depositAmt, currentProfit, currentMargin, underbid
  };
}

function render(o, r){
  $("kDirectCosts").innerText = "$" + money(r.directCosts);
  $("kOverhead").innerText = "$" + money(r.overhead);
  $("kRequiredBid").innerText = "$" + money(r.requiredBid);
  $("kProfitDollars").innerText = "$" + money(r.targetProfitDollars);

  $("mBreakeven").innerText = "$" + money(r.breakeven);
  $("mDeposit").innerText = "$" + money(r.depositAmt);
  $("mCurrentMargin").innerText = pct(r.currentMargin);
  $("mCurrentProfit").innerText = "$" + money(r.currentProfit);

  const warn = $("warnBox");
  warn.classList.remove("bad","ok");
  if(o.currentBid>0){
    if(r.underbid>0){
      warn.classList.add("bad");
      warn.innerHTML = `Your current bid is <b>$${money(r.underbid)}</b> UNDER the required bid.<br/>
      Required Bid: <b>$${money(r.requiredBid)}</b><br/>
      Break-even: <b>$${money(r.breakeven)}</b><br/>
      Margin @ current bid: <b>${pct(r.currentMargin)}</b>`;
    } else {
      warn.classList.add("ok");
      warn.innerHTML = `Your current bid meets or beats the target.<br/>
      Required Bid: <b>$${money(r.requiredBid)}</b><br/>
      Break-even: <b>$${money(r.breakeven)}</b><br/>
      Profit @ current bid: <b>$${money(r.currentProfit)}</b> (<b>${pct(r.currentMargin)}</b>)`;
    }
  } else {
    warn.classList.add("ok");
    warn.innerHTML = `Required Bid computed.<br/>
    Required Bid: <b>$${money(r.requiredBid)}</b><br/>
    Break-even: <b>$${money(r.breakeven)}</b><br/>
    Target Profit: <b>$${money(r.targetProfitDollars)}</b> + Contingency: <b>$${money(r.contingencyDollars)}</b>`;
  }
}

function calc(){
  const o=getInput();
  const r=compute(o);
  render(o,r);
  return {o,r};
}

// Storage
const KEY="JPE_PROJECTS_V1";

function loadAll(){
  try{
    const raw=localStorage.getItem(KEY);
    return raw? JSON.parse(raw): [];
  }catch(e){ return []; }
}
function saveAll(items){
  localStorage.setItem(KEY, JSON.stringify(items));
}

function currentToRecord(){
  const {o,r}=calc();
  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
  return {
    id,
    ts: new Date().toISOString(),
    projectName: o.projectName || "Untitled Project",
    clientName: o.clientName || "",
    input: o,
    result: r
  };
}

function renderList(){
  const list=$("projectList");
  const items=loadAll().sort((a,b)=> (b.ts||"").localeCompare(a.ts||""));
  list.innerHTML="";
  if(items.length===0){
    const div=document.createElement("div");
    div.className="warn";
    div.textContent="No saved projects yet.";
    list.appendChild(div);
    return;
  }
  items.forEach(it=>{
    const div=document.createElement("div");
    div.className="item";
    const req = it.result?.requiredBid || 0;
    const cur = it.input?.currentBid || 0;
    const under = (cur>0 && cur<req) ? (req-cur) : 0;

    const pill=document.createElement("div");
    pill.className="pill " + (under>0? "bad":"ok");
    pill.textContent = under>0 ? "UNDERBID" : "OK";

    const top=document.createElement("div");
    top.className="itemTop";
    const nm=document.createElement("div");
    nm.className="itemName";
    nm.textContent=it.projectName;
    top.appendChild(nm);
    top.appendChild(pill);

    const sub=document.createElement("div");
    sub.className="itemSub";
    sub.innerHTML = `Required Bid: <b>$${money(req)}</b> • Break-even: <b>$${money(it.result?.breakeven||0)}</b><br/>
    Target Profit: <b>$${money(it.result?.targetProfitDollars||0)}</b> • Current Bid: <b>$${money(cur)}</b>`;

    div.appendChild(top);
    div.appendChild(sub);

    div.onclick=()=> loadRecord(it.id);
    list.appendChild(div);
  });
}

function loadRecord(id){
  const items=loadAll();
  const it=items.find(x=>x.id===id);
  if(!it) return;
  const o=it.input || {};
  fields.forEach(f=>{
    if($(f)){
      $(f).value = (o[f] ?? "");
    }
  });
  calc();
}

function newProject(){
  fields.forEach(f=> { if($(f)) $(f).value=""; });
  // defaults that make sense
  $("laborBurdenPct").value = 18;
  $("overheadPct").value = 15;
  $("targetProfitPct").value = 20;
  $("contingencyPct").value = 5;
  $("depositPct").value = 30;
  calc();
}

function saveProject(){
  const rec=currentToRecord();
  const items=loadAll();
  // if same project name & client exists, keep both; this is not an overwrite tool by default
  items.push(rec);
  saveAll(items);
  renderList();
}

function exportCSV(){
  const items=loadAll().sort((a,b)=> (b.ts||"").localeCompare(a.ts||""));
  const headers=[
    "timestamp","projectName","clientName",
    "materials","subs","laborHours","laborRate","laborBurdenPct","overheadPct","targetProfitPct","contingencyPct","depositPct","currentBid",
    "directCosts","overhead","breakeven","requiredBid","targetProfitDollars","contingencyDollars","depositAmt","currentProfit","currentMargin"
  ];
  const rows=[headers.join(",")];
  items.forEach(it=>{
    const o=it.input||{}; const r=it.result||{};
    const row=[
      it.ts||"", (it.projectName||"").replaceAll(","," "), (it.clientName||"").replaceAll(","," "),
      o.materials??"", o.subs??"", o.laborHours??"", o.laborRate??"", o.laborBurdenPct??"", o.overheadPct??"", o.targetProfitPct??"", o.contingencyPct??"", o.depositPct??"", o.currentBid??"",
      r.directCosts??"", r.overhead??"", r.breakeven??"", r.requiredBid??"", r.targetProfitDollars??"", r.contingencyDollars??"", r.depositAmt??"", r.currentProfit??"", r.currentMargin??""
    ];
    rows.push(row.join(","));
  });
  const blob=new Blob([rows.join("\n")],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="job_pricing_engine_projects.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function loadExample(){
  $("projectName").value="Kitchen Remodel";
  $("clientName").value="Smith";
  $("materials").value=8200;
  $("subs").value=2600;
  $("laborHours").value=120;
  $("laborRate").value=45;
  $("laborBurdenPct").value=18;
  $("overheadPct").value=15;
  $("targetProfitPct").value=22;
  $("contingencyPct").value=5;
  $("depositPct").value=35;
  $("currentBid").value=18500;
  calc();
}

document.addEventListener("DOMContentLoaded", ()=>{
  // defaults
  if(!$("laborBurdenPct").value) $("laborBurdenPct").value=18;
  if(!$("overheadPct").value) $("overheadPct").value=15;
  if(!$("targetProfitPct").value) $("targetProfitPct").value=20;
  if(!$("contingencyPct").value) $("contingencyPct").value=5;
  if(!$("depositPct").value) $("depositPct").value=30;

  $("btnCalc").onclick=calc;
  $("btnSave").onclick=saveProject;
  $("btnNew").onclick=newProject;
  $("btnExport").onclick=exportCSV;
  $("btnExample").onclick=loadExample;

  calc();
  renderList();
});
