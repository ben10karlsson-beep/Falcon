/* 169 Poker theory page: chapter routing and calculators. */
function initTheory(){
  const bp=document.getElementById("betpct");
  const presetsB=[[33,"⅓ pot"],[50,"½ pot"],[75,"¾ pot"],[100,"Pot"],[150,"1.5× pot"]];
  document.getElementById("bet-presets").innerHTML=presetsB.map(([v,l])=>`<button class="chip" data-v="${v}">${l}</button>`).join("");
  const updB=()=>{
    const b=+bp.value/100,P=1;
    document.getElementById("betpct-v").textContent=`${bp.value}% of pot`;
    document.getElementById("o-call").textContent=pct(b/(P+2*b));
    // You risk the call (= bet) to win the pot including the bet
    document.getElementById("o-risk").textContent=`${Math.round(b*100)} / ${Math.round((P+b)*100)}`;
    document.getElementById("o-ratio").textContent=`${+((P+b)/b).toFixed(1)} : 1`;
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
  initRangeEquity(initEV());
  initComboDrill();
  initChapters();
  document.querySelectorAll(".toc a").forEach(a=>a.onclick=e=>{e.preventDefault();document.querySelector(a.getAttribute("href")).scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});});
}

/* One chapter on screen at a time. The path map, "Builds on" links and Back/Next all go through show(). */
const CHAPTERS=["equity","outs","price","combos","range","together","strategy","glossary"];
let chapter="equity";
function showChapter(id,scroll){
  if(!CHAPTERS.includes(id))id="equity";
  chapter=id;
  document.querySelectorAll("#view-theory .chapter").forEach(s=>s.hidden=s.dataset.ch!==id);
  document.querySelectorAll(".path [data-ch]").forEach(b=>{if(b.dataset.ch===id)b.setAttribute("aria-current","step");else b.removeAttribute("aria-current");});
  document.getElementById("th-intro").hidden=id!=="equity";
  if(document.getElementById("view-theory").hidden)return;
  history.replaceState(null,"","#theory/"+id);
  if(scroll!==false)window.scrollTo({top:0});
}
function initChapters(){
  const title=id=>{const b=document.querySelector(`.path [data-ch="${id}"]`);return b.textContent.replace(/^\d+/,"").trim();};
  document.querySelectorAll("#view-theory .chapter").forEach(sec=>{
    const i=CHAPTERS.indexOf(sec.dataset.ch),prev=CHAPTERS[i-1],next=CHAPTERS[i+1];
    sec.querySelector(".pager").innerHTML=
      (prev?`<button class="btn" data-ch="${prev}">← ${title(prev)}</button>`:"<span></span>")+
      (next?`<button class="btn primary" data-ch="${next}">Next: ${title(next)} →</button>`:"");
  });
  document.getElementById("view-theory").addEventListener("click",e=>{
    const t=e.target.closest("[data-ch]");
    if(!t||t.tagName==="SECTION")return;
    e.preventDefault();showChapter(t.dataset.ch);
  });
  showChapter("equity",false);
}
window.Theory={show:showChapter,current:()=>chapter};

/* Hand vs range calculator: equity against each hand class, averaged by combos. */
function initRangeEquity(onResult){
  const $=id=>document.getElementById(id);
  const hand=$("re-hand"),sel=$("re-range"),custom=$("re-custom"),more=$("re-more");
  const ranges=rangeOptions();
  sel.innerHTML=ranges.map(r=>`<option value="${r.key}">${r.label} (${pct(rangeSize(r.map))})</option>`).join("")+`<option value="custom">Custom range…</option>`;
  sel.value="custom";custom.hidden=false;
  const presets=["AA","AKo","AQo","AJo","TT","76s","22"];
  $("re-presets").innerHTML=presets.map(h=>`<button class="chip" data-h="${h}">${h}</button>`).join("");
  let showAll=false,timer=0;

  /* "aj o" / "JAo" / "tt" → "AJo" / "TT"; null if it is not a hand class */
  function readHand(str){
    const s=str.replace(/\s/g,""),m=s.match(/^([2-9TJQKA])([2-9TJQKA])([so]?)$/i);
    if(!m)return null;
    let a=m[1].toUpperCase(),b=m[2].toUpperCase();const t=m[3].toLowerCase();
    if(a===b)return t?null:a+b;
    if(!t)return null;
    if(ri(a)>ri(b))[a,b]=[b,a];
    return a+b+t;
  }
  /* Pick suits: suited hands in spades, everything else spade + heart */
  const cardsFor=hc=>Engine.parseCards(hc[0]+"s"+hc[1]+(hc[2]==="s"?"s":"h"));
  function readRange(){
    if(sel.value!=="custom")return ranges.find(r=>r.key===sel.value).map;
    let m;
    try{m=parse(custom.value.split(",").filter(t=>t.trim()).join(","));}catch(e){return null;}
    return Object.keys(m).every(h=>ALL_HANDS.includes(h)&&m[h]>=0&&m[h]<=1)?m:null;
  }
  function render(){
    const hc=readHand(hand.value),map=readRange();
    hand.setAttribute("aria-invalid",!hc);custom.setAttribute("aria-invalid",!map);
    document.querySelectorAll("#re-presets .chip").forEach(c=>c.setAttribute("aria-pressed",c.dataset.h===hc));
    $("re-hand-v").textContent=hc?cardsFor(hc).map(c=>Engine.RANKS[Engine.rankOf(c)]+Engine.SUIT_SYMBOL[Engine.suitOf(c)]).join(" "):"";
    $("re-range-v").textContent=map?pct(rangeSize(map))+" of hands":"";
    const fail=msg=>{["re-eq","re-combos","re-blocked"].forEach(id=>$(id).textContent="–");$("re-split").innerHTML="";$("re-split-t").textContent=msg;$("re-rows").innerHTML="";more.hidden=true;};
    if(!hc)return fail("Enter your hand as two ranks plus s or o, like AJo or 76s. Pairs need no letter: TT.");
    if(!map)return fail("That range didn't parse. Use the chart format, e.g. QQ+, AK, AJs:0.5.");
    const n=Object.keys(map).filter(h=>map[h]>0).length;
    const res=Engine.equityByClass(cardsFor(hc),map,[],Math.max(400,Math.min(10000,Math.round(80000/Math.max(n,1)))));
    if(!res)return fail("Your cards block every combo in that range.");
    $("re-eq").textContent=pct(res.equity);
    if(onResult)onResult(res.equity,`${hc} vs ${sel.value==="custom"?custom.value.trim():sel.options[sel.selectedIndex].text.replace(/ \(.*\)$/,"")}`);
    $("re-combos").textContent=fmtC(res.combos);
    $("re-blocked").textContent=fmtC(res.blocked);
    const share=f=>res.rows.filter(f).reduce((s,r)=>s+r.combos,0)/res.combos;
    const ahead=share(r=>r.equity>0.6),behind=share(r=>r.equity<0.4),flip=1-ahead-behind;
    const seg=(w,bg,t)=>w>0?`<span style="width:${w*100}%;background:${bg}" title="${t}">${w>=0.12?pct(w):""}</span>`:"";
    $("re-split").innerHTML=seg(ahead,"var(--red)","Ahead")+seg(flip,"var(--call)","Close")+seg(behind,"var(--line)","Behind");
    $("re-split-t").textContent=`You are well ahead (over 60%) of ${pct(ahead)} of their combos, close to a flip (40–60%) with ${pct(flip)}, and well behind (under 40%) ${pct(behind)}. Your ${pct(res.equity)} is the average of all of them.`;
    const rows=res.rows.slice().sort((a,b)=>b.combos-a.combos||a.equity-b.equity);
    const shown=showAll?rows:rows.slice(0,8);
    $("re-rows").innerHTML=shown.map(r=>{const e=Math.round(r.equity*100);
      return`<tr><td class="hh">${r.hc}</td><td>${fmtC(r.combos)}</td><td><div class="re-eq"><span>${e}%</span><i><b style="width:${e}%"></b></i></div></td><td>${pct(r.combos/res.combos)}</td></tr>`;}).join("");
    more.hidden=rows.length<=8;
    more.textContent=showAll?"Show the 8 most common hands":`Show all ${rows.length} hands`;
  }
  const fmtC=x=>Number.isInteger(x)?String(x):x.toFixed(1);
  /* Monte Carlo takes a moment on wide ranges, so wait until typing pauses */
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(render,150);};
  hand.oninput=schedule;custom.oninput=schedule;
  sel.onchange=()=>{custom.hidden=sel.value!=="custom";render();};
  document.querySelectorAll("#re-presets .chip").forEach(c=>c.onclick=()=>{hand.value=c.dataset.h;render();});
  more.onclick=()=>{showAll=!showAll;render();};
  render();
}
/* Combo counting practice: deal your hand (and sometimes a flop), ask how many combos of a hand are left,
   and show the count worked out rank by rank. */
function initComboDrill(){
  const $=id=>document.getElementById(id),E=Engine;
  const RN=r=>E.RANKS[r]==="T"?"10":E.RANKS[r];
  const NAMES=["twos","threes","fours","fives","sixes","sevens","eights","nines","tens","jacks","queens","kings","aces"];
  const cname=c=>RN(E.rankOf(c))+E.SUIT_SYMBOL[E.suitOf(c)];
  const cardHTML=c=>{const red=E.suitOf(c)===1||E.suitOf(c)===2;return`<span class="mc sm ${red?"red":""}" aria-label="${cname(c)}"><b>${RN(E.rankOf(c))}</b><i>${E.SUIT_SYMBOL[E.suitOf(c)]}</i></span>`;};
  const input=$("cd-in");
  let q=null,n=0,right=0;
  const rand=a=>a[(Math.random()*a.length)|0];
  function deal(){
    const deck=E.remainingDeck([]);
    for(let i=deck.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[deck[i],deck[j]]=[deck[j],deck[i]];}
    const hero=deck.slice(0,2),board=Math.random()<0.6?deck.slice(2,5):[],seen=hero.concat(board);
    const seenRanks=[...new Set(seen.map(E.rankOf))];
    // Mostly ask about ranks you can see, since that's where blockers change the count
    const pickRank=not=>{const pool=seenRanks.filter(r=>r!==not);return pool.length&&Math.random()<0.75?rand(pool):rand([...Array(13).keys()].filter(r=>r!==not));};
    const kind=rand(["pair","pair","both","both","both","suited","offsuit","offsuit"]);
    const a=pickRank(-1);let hi=a,lo=a;
    if(kind!=="pair"){const b=pickRank(a);hi=Math.max(a,b);lo=Math.min(a,b);}
    q={hero,board,seen,kind,hi,lo,answered:false};
    const H=E.RANKS[hi],L=E.RANKS[lo];
    q.hc=kind==="pair"?H+L:H+L+(kind==="suited"?"s":kind==="offsuit"?"o":"");
    const live=hc=>E.combosOf(hc).filter(([x,y])=>!seen.includes(x)&&!seen.includes(y)).length;
    q.answer=kind==="both"?live(H+L+"s")+live(H+L+"o"):live(q.hc);
    render();
  }
  function render(){
    $("cd-cards").innerHTML=`<div><div class="label">Your hand</div><div class="cardrow">${q.hero.map(cardHTML).join("")}</div></div>`+
      (q.board.length?`<div><div class="label">Flop</div><div class="cardrow">${q.board.map(cardHTML).join("")}</div></div>`:"");
    const what=q.kind==="pair"?q.hc:q.kind==="both"?`${q.hc} (suited and offsuit)`:q.kind==="suited"?`${q.hc} (suited only)`:`${q.hc} (offsuit only)`;
    $("cd-q").innerHTML=`How many combos of <b>${what}</b> can your opponent have?`;
    input.value="";input.disabled=false;$("cd-check").disabled=false;$("cd-fb").innerHTML="";
  }
  /* "2 kings left: you can see the K♣ (yours) and the K♦ (board)" */
  function leftLine(r){
    const s=q.seen.filter(c=>E.rankOf(c)===r),left=4-s.length;
    const where=s.map(c=>`the ${cname(c)} (${q.hero.includes(c)?"yours":"board"})`);
    return{left,text:`<strong>${left} ${left===1?NAMES[r].replace(/s$/,"").replace(/xe$/,"x"):NAMES[r]}</strong> left${s.length?`: you can see ${where.join(" and ")}`:""}`};
  }
  function suitedLine(){
    let k=0;
    const parts=[0,1,2,3].map(s=>{
      const x=E.card(q.hi,s),y=E.card(q.lo,s),gone=[x,y].filter(c=>q.seen.includes(c));
      if(!gone.length)k++;
      return`${E.SUIT_SYMBOL[s]} ${gone.length?`✗ (${gone.map(cname).join(" and ")} ${gone.length>1?"are":"is"} gone)`:"✓"}`;
    });
    return{k,text:`Suited: one per suit where both cards are still live. ${parts.join(" · ")} → <strong>${k}</strong>`};
  }
  function explain(){
    const steps=[];
    if(q.kind==="pair"){
      const l=leftLine(q.hi),p=l.left*(l.left-1)/2;
      steps.push(l.text+".",`Pairs from ${l.left} cards: ${l.left} × ${Math.max(l.left-1,0)} ÷ 2 = <strong>${p}</strong>. (4 left → 6, 3 → 3, 2 → 1.)`);
    }else{
      const a=leftLine(q.hi),b=leftLine(q.lo),all=a.left*b.left;
      steps.push(a.text+".",b.text+".",`All ${E.RANKS[q.hi]+E.RANKS[q.lo]} combos: ${a.left} × ${b.left} = <strong>${all}</strong>.`);
      if(q.kind!=="both"){const s=suitedLine();steps.push(s.text+".");if(q.kind==="offsuit")steps.push(`Offsuit: all minus suited, ${all} − ${s.k} = <strong>${all-s.k}</strong>.`);}
    }
    return`<ol class="takeaways">${steps.map(s=>`<li>${s}</li>`).join("")}</ol>`;
  }
  function check(){
    if(q.answered){deal();input.focus();return;}
    if(input.value===""){input.focus();return;}
    q.answered=true;n++;
    const ok=+input.value===q.answer;if(ok)right++;
    $("cd-fb").innerHTML=`<div class="fb ${ok?"good":"bad"}"><div class="head"><span class="dot" style="background:var(${ok?"--good":"--red"})"></span>${ok?"Right":"Not quite"}</div>
      <p>${ok?"":`You said ${+input.value}. `}They can have <strong>${q.answer}</strong> combo${q.answer===1?"":"s"} of ${q.hc}.</p>${explain()}</div>`;
    input.disabled=true;$("cd-check").disabled=true;
    $("cd-score").textContent=`${right} of ${n} right this session. Press Enter or New hand for the next one.`;
    $("cd-next").focus({preventScroll:true});
  }
  $("cd-check").onclick=check;
  $("cd-next").onclick=()=>{deal();input.focus({preventScroll:true});};
  input.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();check();}};
  deal();
}
/* EV of calling: win the pot as often as your equity, lose the call the rest of the time.
   Returns a setter so the range calculator can offer its latest equity. */
function initEV(){
  const $=id=>document.getElementById(id);
  const pot=$("ev-pot"),call=$("ev-call"),eq=$("ev-eq"),use=$("ev-use");
  const bb=(x,d=1)=>{const r=Math.round(x*10**d)/10**d;return(r>0?"+":r<0?"−":"")+Math.abs(r).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})+"bb";};
  let last=null;
  function render(){
    const P=+pot.value,C=+call.value,E=+eq.value/100;
    const ok=pot.value!==""&&call.value!==""&&eq.value!==""&&P>=0&&C>0&&E>=0&&E<=1;
    [pot,call,eq].forEach(i=>i.setAttribute("aria-invalid",!ok));
    if(!ok){["ev-out","ev-be","ev-100"].forEach(id=>$(id).textContent="–");$("ev-why").textContent="Enter the pot and call in big blinds (the call must be more than 0) and your equity from 0 to 100%.";return;}
    const ev=E*P-(1-E)*C,be=C/(P+C),win=E*P,lose=(1-E)*C;
    $("ev-out").textContent=bb(ev);
    $("ev-be").textContent=pct(be);
    $("ev-100").textContent=bb(ev*100,0);
    const verdict=Math.abs(ev)<0.05?"so calling and folding come out about even.":ev>0?`so calling wins ${bb(ev).slice(1)} more than folding on average. Call.`:`so calling loses ${bb(ev).slice(1)} compared with folding. Fold.`;
    $("ev-why").textContent=`You win ${P}bb ${pct(E)} of the time (${bb(win)}) and lose ${C}bb ${pct(1-E)} of the time (${bb(-lose)}). You need ${pct(be)} and have ${pct(E)}, ${verdict}`;
  }
  [pot,call,eq].forEach(i=>i.oninput=render);
  use.onclick=()=>{if(last){eq.value=(Math.round(last.eq*1000)/10).toFixed(1);render();}};
  use.hidden=true;
  render();
  return(e,label)=>{last={eq:e,label};use.hidden=false;use.textContent=`Use ${pct(e)} from the chapter 5 range calculator (${label})`;};
}
initTheory();
