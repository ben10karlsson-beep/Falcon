/* Falcon theory page calculators. */
function initTheory(){
  const bp=document.getElementById("betpct");
  const presetsB=[[33,"⅓ pot"],[50,"½ pot"],[75,"¾ pot"],[100,"Pot"],[150,"1.5× pot"]];
  document.getElementById("bet-presets").innerHTML=presetsB.map(([v,l])=>`<button class="chip" data-v="${v}">${l}</button>`).join("");
  const updB=()=>{
    const b=+bp.value/100,P=1;
    document.getElementById("betpct-v").textContent=`${bp.value}% of pot`;
    document.getElementById("o-call").textContent=pct(b/(P+2*b));
    document.getElementById("o-bluff").textContent=pct(b/(P+b));
    document.getElementById("o-mdf").textContent=pct(P/(P+b));
    const T=P+2*b;
    document.getElementById("potbar").innerHTML=`<span style="width:${P/T*100}%;background:var(--surface-2)">Pot 100</span><span style="width:${b/T*100}%;background:var(--red)">Bet ${Math.round(b*100)}</span><span style="width:${b/T*100}%;background:var(--call)">Call ${Math.round(b*100)}</span>`;
    document.querySelectorAll("#bet-presets .chip").forEach(c=>c.setAttribute("aria-pressed",c.dataset.v===bp.value));
  };
  bp.oninput=updB;
  document.querySelectorAll("#bet-presets .chip").forEach(c=>c.onclick=()=>{bp.value=c.dataset.v;updB();});
  updB();

  const on=document.getElementById("outs-n");
  const presetsO=[[4,"Gutshot"],[8,"Open-ended"],[9,"Flush draw"],[15,"Flush + straight draw"]];
  document.getElementById("outs-presets").innerHTML=presetsO.map(([v,l])=>`<button class="chip" data-v="${v}">${l} · ${v}</button>`).join("");
  const updO=()=>{
    const o=+on.value;
    document.getElementById("outs-v").textContent=o;
    document.getElementById("o-flop").textContent=pct(1-((47-o)*(46-o))/(47*46));
    document.getElementById("o-turn").textContent=pct(o/46);
    document.getElementById("o-rule").textContent=`${o*4}% / ${o*2}%`;
    document.querySelectorAll("#outs-presets .chip").forEach(c=>c.setAttribute("aria-pressed",c.dataset.v===on.value));
  };
  on.oninput=updO;
  document.querySelectorAll("#outs-presets .chip").forEach(c=>c.onclick=()=>{on.value=c.dataset.v;updO();});
  updO();

  const M=[["AA","KK",82,"Overpair vs underpair"],["KK","AKo",70,"Pair vs one overcard"],["AKo","AQo",74,"Domination: same card, better kicker"],
           ["QQ","AKs",54,"Pair vs two overcards"],["22","AKo",52,"Small pair vs two overcards"],["AKo","76s",60,"Two high cards vs two low cards"],["AA","87s",77,"Best hand vs suited connector"]];
  document.getElementById("mrows").innerHTML=M.map(([a,b,e,t])=>`<tr><td class="hh">${a} vs ${b}</td><td><div class="eq"><span style="width:${e}%;background:var(--red)">${e}%</span><span style="width:${100-e}%;background:var(--call)">${100-e}%</span></div></td><td>${t}</td></tr>`).join("");

  document.getElementById("seatbars").innerHTML=Object.keys(RFI).map(s=>{
    const m=parse(RFI[s].raise);let c=0;for(const h in m)c+=m[h]*combos(h);const p=c/1326;
    return`<div class="seatbar"><span>${s}</span><span class="t"><span style="width:${p*100/0.5}%"></span></span><span class="v">${pct(p)}</span></div>`;}).join("");
  document.querySelectorAll(".toc a").forEach(a=>a.onclick=e=>{e.preventDefault();document.querySelector(a.getAttribute("href")).scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});});
}
initTheory();
