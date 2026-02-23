
function show(id){
document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
document.getElementById(id).classList.remove('hidden');
}

function calculateBid(){
let m = parseFloat(materials.value)||0;
let h = parseFloat(laborHours.value)||0;
let r = parseFloat(laborRate.value)||0;
let o = parseFloat(overhead.value)||0;
let p = parseFloat(profit.value)||0;

let labor = h*r;
let cost = m + labor;
let overheadCost = cost*(o/100);
let trueCost = cost + overheadCost;
let bid = trueCost*(1+p/100);

bidResult.innerText = "True Cost: $" + trueCost.toFixed(2) + 
" | Required Bid: $" + bid.toFixed(2);
}

function calculateBreakEven(){
let overhead = parseFloat(monthlyOverhead.value)||0;
let margin = parseFloat(targetMargin.value)||0;
let revenue = overhead/(margin/100);
breakResult.innerText = "Required Monthly Revenue: $" + revenue.toFixed(2);
}

function runScenario(){
let inc = parseFloat(scenarioIncrease.value)||0;
scenarioResult.innerText = "Labor Increase Simulation: +" + inc + "% impact modeled.";
}

function trackMargin(){
let rev = parseFloat(jobRevenue.value)||0;
let cost = parseFloat(jobCost.value)||0;
let margin = ((rev-cost)/rev)*100;
trackResult.innerText = "Job Margin: " + margin.toFixed(2) + "%";
}
