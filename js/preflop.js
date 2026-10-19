/* 169 Poker preflop: range viewer + trainer. Depends on ranges.js. */
/* ---------- RANGES VIEW ---------- */
let state={mode:"rfi",seat:"BTN",vs:0,v3:0,sel:"A5s"};
const spotFromState=()=>state.mode==="rfi"?{mode:"rfi",seat:state.seat}:state.mode==="v3"?{mode:"v3",v3:state.v3}:{mode:"vs",vs:state.vs};

function renderPicker(){
  const p=document.getElementById("picker");p.innerHTML="";
  if(state.mode==="rfi"){
    document.getElementById("pick-label").textContent="Your seat";
    SEATS.forEach(s=>{const b=document.createElement("button");b.className="chip";b.textContent=s;
      if(s==="BB"){b.disabled=true;b.title="The big blind never opens: if everyone folds, you win the blinds.";}
      b.setAttribute("aria-pressed",s===state.seat);b.onclick=()=>{state.seat=s;render();};p.appendChild(b);});
  }else if(state.mode==="v3"){
    document.getElementById("pick-label").textContent="Spot (you opened, then faced a 3-bet)";
    V3.forEach((v,i)=>{const b=document.createElement("button");b.className="chip";b.textContent=v.id;
      b.setAttribute("aria-pressed",i===state.v3);b.onclick=()=>{state.v3=i;render();};p.appendChild(b);});
  }else{
    document.getElementById("pick-label").textContent="Spot (you vs opener)";
    VS.forEach((v,i)=>{const b=document.createElement("button");b.className="chip";b.textContent=v.id;
      b.setAttribute("aria-pressed",i===state.vs);b.onclick=()=>{state.vs=i;render();};p.appendChild(b);});
  }
}

function render(){
  document.getElementById("m-rfi").setAttribute("aria-pressed",state.mode==="rfi");
  document.getElementById("m-vs").setAttribute("aria-pressed",state.mode==="vs");
  document.getElementById("m-v3").setAttribute("aria-pressed",state.mode==="v3");
  renderPicker();
  const rng=getRange(spotFromState());
  const tot={raise:0,call:0,fold:0};let all=0;
  const g=document.getElementById("grid");g.innerHTML="";
  const key=JSON.stringify(spotFromState());g.classList.toggle("sweep",key!==render.lastKey);render.lastKey=key;
  for(let i=0;i<13;i++)for(let j=0;j<13;j++){
    const h=handAt(i,j),f=freqs(rng,h),c=combos(h),w=rng.open?(rng.open[h]||0):1;
    tot.raise+=f.raise*c*w;tot.call+=f.call*c*w;tot.fold+=f.fold*c*w;all+=c*w;
    const b=document.createElement("button");
    b.className="cell"+(f.fold>=0.999?" zero":"")+(i===j?" pair":"")+(w?"":" unopened");
    b.innerHTML=unitHTML(h);b.style.setProperty("--i",i);b.style.setProperty("--j",j);
    setUnit(b,f.raise,f.raise+f.call,"var(--raise)","var(--call)");b.setAttribute("aria-pressed",h===state.sel);
    b.setAttribute("aria-label",w?`${h}: ${rng.labels.raise} ${pct(f.raise)}${rng.vs?`, call ${pct(f.call)}`:""}, fold ${pct(f.fold)}`:`${h}: not in ${rng.hero}'s opening range`);
    b.onclick=()=>{state.sel=h;render();};
    g.appendChild(b);
  }
  if(rng.v3){
    document.getElementById("title").textContent=`${rng.hero} facing a ${rng.vil} 3-bet`;
    document.getElementById("ctx").textContent=`You opened to 2.5bb and ${rng.vil} 3-bet to ${threeBetSize(rng.vil)}bb. 4-bet to about ${fourBetSize(rng.vil)}bb. Shares are of the hands you opened; faded squares weren't opened.`;
  }else if(rng.vs){
    document.getElementById("title").textContent=`${rng.hero} facing ${rng.vil} open`;
    document.getElementById("ctx").textContent=`${rng.vil} opens to 2.5bb. 3-bet to about ${threeBetSize(rng.hero)}bb.`;
  }else{
    document.getElementById("title").textContent=`${state.seat} open-raise`;
    document.getElementById("ctx").textContent=`Everyone before you folded. Open to ${state.seat==="SB"?"3":"2.5"}bb.`;
  }
  const keys=rng.vs?["raise","call","fold"]:["raise","fold"];
  document.getElementById("bar").innerHTML=keys.map(k=>`<span style="width:${tot[k]/all*100}%;background:${COLORS[k]}"></span>`).join("");
  document.getElementById("stats").innerHTML=keys.map(k=>`<span><i class="sw" style="background:${COLORS[k]};${k==="fold"?"outline:1px solid var(--line)":""}"></i>${rng.labels[k]} <b>${pct(tot[k]/all)}</b> · ${Math.round(tot[k])} combos</span>`).join("");
  renderPanel(rng);
}

function explain(h){
  const a=ri(h[0]),b=ri(h[1]);
  if(h.length===2){
    if(a<=4)return"Premium pair. It is ahead of every unpaired hand before the flop and wins big pots when it holds up.";
    if(a<=7)return"Medium pair. It often wins without improving and flops a set about 1 time in 8.5, but overcards on the flop make it awkward.";
    return"Small pair. It rarely wins unimproved, so it plays mainly to flop a set (11.8% of the time). That needs cheap entry and deep stacks.";
  }
  const s=h[2]==="s",gap=b-a;
  if(h[0]==="A"&&s&&b>=9)return"Suited wheel ace. It makes the nut flush and wheel straights, and the ace makes it less likely opponents hold AA or AK. A classic 3-bet bluff.";
  if(h[0]==="A"&&s)return"Suited ace. Its kicker is weak, but it can make the nut flush, which keeps it playable from most seats.";
  if(a<=4&&b<=4)return s?"Suited broadway. Two high cards plus flush and straight potential: strong in almost every spot.":"Offsuit broadway. Good high-card strength, but when it gets action it is often dominated by a hand with a better kicker.";
  if(s&&gap<=2&&b>=4)return"Suited connector. Rarely the best hand preflop, but it makes straights and flushes that win big pots. It plays best in position.";
  if(h[0]==="A")return"Offsuit ace. Ace-high wins small pots, but a weak kicker leaves it dominated by better aces.";
  if(s)return"Suited hand with some flush potential but little high-card value. Playable from late seats, a fold from early ones.";
  return"Weak offsuit hand: no flush potential, little straight potential and low cards. Folding is almost always right.";
}

function verdictText(rng,f){
  const keys=rng.vs?["raise","call","fold"]:["raise","fold"];
  const on=keys.filter(k=>f[k]>0.001);
  const main=keys.reduce((m,k)=>f[k]>f[m]?k:m,keys[0]);
  return{mixed:on.length>1,main,keys,
    text:on.length>1?`Mixed: ${on.map(k=>`${rng.labels[k].toLowerCase()} ${pct(f[k])}`).join(", ")}`:`Always ${rng.labels[main].toLowerCase()}`};
}
function freqBars(rng,f,keys){
  return`<div class="freqs">${keys.map(k=>`<div class="freq"><span>${rng.labels[k]}</span><span class="track"><span style="width:${f[k]*100}%;background:${k==="fold"?"var(--dim)":COLORS[k]}"></span></span><span class="pct">${pct(f[k])}</span></div>`).join("")}</div>`;
}

/* Two example cards for a hand class, fanned like a hand held at the table: spades and hearts, or both spades if suited */
function handFan(h){
  const card=(r,red)=>`<span class="mc sm ${red?"red":""}"><b>${r==="T"?"10":r}</b><i>${red?"♥":"♠"}</i></span>`;
  return`<span class="fan" aria-hidden="true">${card(h[0],false)}${card(h[1],h[2]!=="s")}</span>`;
}
function renderPanel(rng){
  const h=state.sel,f=freqs(rng,h),c=combos(h);
  if(rng.open&&!rng.open[h]){
    document.getElementById("panel").innerHTML=`
      <div class="hand"><span class="big">${h}</span><span class="meta">${c} combos</span>${handFan(h)}</div>
      <div class="verdict">Not in ${rng.hero}'s opening range</div>
      <p>${rng.hero} folds ${h} before anyone can 3-bet, so it never faces this decision. Pick a coloured square to see how the hands ${rng.hero} opens respond.</p>
      <div class="insight"><div class="label" style="margin-bottom:4px">This spot</div><p style="font-size:13px">${rng.note}</p></div>`;
    return;
  }
  const type=h.length===2?"Pocket pair":h[2]==="s"?"Suited":"Offsuit";
  const v=verdictText(rng,f);
  const odds=h.length===2?{v:"11.8%",l:"flops a set or better"}:h[2]==="s"?{v:"10.9%",l:"flops a flush draw"}:{v:"0%",l:"chance of a flush on the flop"};
  document.getElementById("panel").innerHTML=`
    <div class="hand"><span class="big">${h}</span><span class="meta">${type}<br>${c} combos</span>${handFan(h)}</div>
    <div>
      <div class="verdict" style="color:${v.main==="raise"&&!v.mixed?"var(--raise)":"var(--text)"}">${v.text}</div>
      ${v.mixed?`<p style="font-size:13px;color:var(--muted);margin-top:4px">A mixed strategy means the options are worth about the same. Mixing keeps you from being predictable.</p>`:""}
    </div>
    ${freqBars(rng,f,v.keys)}
    <p>${explain(h)}</p>
    <div class="facts">
      <div class="fact"><b>${pct(c/1326)}</b><span>of all starting hands</span></div>
      <div class="fact"><b>${odds.v}</b><span>${odds.l}</span></div>
    </div>
    <div class="insight"><div class="label" style="margin-bottom:4px">This spot</div><p style="font-size:13px">${rng.note}</p></div>
    <div class="note">Simplified reference ranges for learning, hand-built to match the shape of solver strategies. They are not exact solver output.</div>`;
}

document.getElementById("m-rfi").onclick=()=>{state.mode="rfi";render();};
document.getElementById("m-vs").onclick=()=>{state.mode="vs";render();};
document.getElementById("m-v3").onclick=()=>{state.mode="v3";render();};

/* ---------- TRAINER ---------- */
const SUITS=[{s:"♠",red:false},{s:"♥",red:true},{s:"♦",red:true},{s:"♣",red:false}];
const ALL_SPOTS=[...Object.keys(RFI).map(seat=>({mode:"rfi",seat})),...VS.map((_,i)=>({mode:"vs",vs:i})),...V3.map((_,i)=>({mode:"v3",v3:i}))];
let tr={pool:"all",skipEasy:true,cur:null,answered:false,n:0,good:0,streak:0,best:0,log:[]};
try{tr.best=+localStorage.getItem("falcon.bestStreak")||0;}catch(e){}

/* Long-term stats for leak drilling: per-spot accuracy + a review queue of missed hands */
let ST={spots:{},missed:[]};
try{const s=JSON.parse(localStorage.getItem("falcon.stats")||"null");if(s&&s.spots&&Array.isArray(s.missed))ST=s;}catch(e){}
const saveST=()=>{try{localStorage.setItem("falcon.stats",JSON.stringify(ST));}catch(e){}};
const spotKey=s=>s.mode==="rfi"?"rfi:"+s.seat:s.mode==="v3"?"v3:"+V3[s.v3].id:"vs:"+VS[s.vs].id;
function spotFromKey(k){
  const [m,rest]=[k.slice(0,k.indexOf(":")),k.slice(k.indexOf(":")+1)];
  if(m==="rfi")return RFI[rest]?{mode:"rfi",seat:rest}:null;
  if(m==="v3"){const i=V3.findIndex(v=>v.id===rest);return i<0?null:{mode:"v3",v3:i};}
  const i=VS.findIndex(v=>v.id===rest);return i<0?null:{mode:"vs",vs:i};
}
const spotLabel=s=>s.mode==="rfi"?`${s.seat} open`:s.mode==="v3"?V3[s.v3].id:VS[s.vs].id;
const totalPlayed=()=>Object.values(ST.spots).reduce((a,s)=>a+s.n,0);
function weightedPick(items,w){const tot=items.reduce((a,x)=>a+w(x),0);let r=Math.random()*tot;for(const x of items){r-=w(x);if(r<=0)return x;}return items[items.length-1];}
function cardsFor(h){
  const a=ri(h[0]),b=ri(h[1]);const s1=Math.floor(Math.random()*4);
  let s2=s1;
  if(h.length===2||h[2]==="o"){do{s2=Math.floor(Math.random()*4);}while(s2===s1);}
  return[{r:a,s:s1},{r:b,s:s2}];
}

function isEasyFold(rng,h){
  const f=freqs(rng,h);if(f.fold<0.999)return false;
  const [i,j]=posOf(h);
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const a=i+di,b=j+dj;if(a<0||b<0||a>12||b>12)continue;
    if(freqs(rng,handAt(a,b)).fold<0.999)return false;
  }
  return true;
}
/* Facing a 3-bet you only ever hold a hand you opened, dealt as often as you open it */
function dealFor(rng){
  let d;do{d=dealCards();}while(rng.open&&!(Math.random()<(rng.open[d.hand]||0)));
  return d;
}
function dealCards(){
  const c1=Math.floor(Math.random()*52);let c2;do{c2=Math.floor(Math.random()*52);}while(c2===c1);
  let a={r:Math.floor(c1/4),s:c1%4},b={r:Math.floor(c2/4),s:c2%4};
  if(b.r<a.r)[a,b]=[b,a];
  const h=a.r===b.r?R[a.r]+R[a.r]:R[a.r]+R[b.r]+(a.s===b.s?"s":"o");
  return{cards:[a,b],hand:h};
}
function deal(){
  const hint=document.getElementById("leak-hint");
  hint.hidden=tr.pool!=="leaks";
  if(tr.pool==="leaks"){
    const played=totalPlayed();
    if(played<10){
      hint.textContent=`Play ${10-played} more hand${10-played===1?"":"s"} so 169 Poker can find your weak spots. Until then you get a mix of everything.`;
    }else{
      const queue=ST.missed.filter(m=>spotFromKey(m.key));
      hint.textContent=`Dealing more of your weakest spots${queue.length?`, plus ${queue.length} missed hand${queue.length===1?"":"s"} waiting for review`:""}.`;
      if(queue.length&&Math.random()<0.5){
        const m=weightedPick(queue,x=>x.count);const spot=spotFromKey(m.key);
        tr.cur={spot,rng:getRange(spot),hand:m.hand,cards:cardsFor(m.hand),review:true};tr.answered=false;renderTrainer();return;
      }
      const w=s=>{const st=ST.spots[spotKey(s)];if(!st||!st.n)return 0.4;const err=(st.n-st.good+0.5)/(st.n+1);return 0.05+err*err*4;};
      let spot,rng,d,tries=0;
      do{spot=weightedPick(ALL_SPOTS,w);rng=getRange(spot);d=dealFor(rng);tries++;}
      while(tries<60&&isEasyFold(rng,d.hand)&&Math.random()<0.9);
      tr.cur={spot,rng,...d};tr.answered=false;renderTrainer();return;
    }
  }
  const pool=ALL_SPOTS.filter(s=>tr.pool==="all"||tr.pool==="leaks"||s.mode===tr.pool);
  let spot,rng,d,tries=0;
  do{
    spot=pool[Math.floor(Math.random()*pool.length)];rng=getRange(spot);d=dealFor(rng);tries++;
  }while(tr.skipEasy&&tries<40&&isEasyFold(rng,d.hand)&&Math.random()<0.85);
  tr.cur={spot,rng,...d};tr.answered=false;renderTrainer();
}

function seatStrip(rng){
  const hi=SEATS.indexOf(rng.hero),vi=rng.vs?SEATS.indexOf(rng.vil):-1;
  return SEATS.map((s,i)=>{
    let cls="seat",note="";
    if(rng.v3){
      if(i===hi){cls+=" hero";note="You";}else if(i===vi){cls+=" vil";note="3-bet";}else{cls+=" folded";note="Fold";}
      return`<div class="${cls}">${s}<small>${note}</small></div>`;
    }
    if(i===hi){cls+=" hero";note="You";}
    else if(i===vi){cls+=" vil";note="Raised";}
    else if(rng.vs){ if(i<hi && i!==vi){cls+=" folded";note="Fold";} else {cls+=" wait";note="To act";} }
    else{ if(i<hi){cls+=" folded";note="Fold";} else {cls+=" wait";note=s==="SB"?"0.5bb":s==="BB"?"1bb":"To act";} }
    if(rng.vs&&i>hi&&i!==vi){note=s==="SB"?"0.5bb":s==="BB"?"1bb":"To act";}
    return`<div class="${cls}">${s}<small>${note}</small></div>`;
  }).join("");
}
function cardHTML(c){const su=SUITS[c.s];return`<div class="pcard${su.red?" red":""}"><span class="c">${R[c.r]}<br>${su.s}</span><span><div class="rk">${R[c.r]==="T"?"10":R[c.r]}</div><div class="st">${su.s}</div></span></div>`;}

function renderTrainer(){
  const {rng,cards,hand}=tr.cur;
  document.getElementById("seats").innerHTML=seatStrip(rng);
  document.getElementById("sit").innerHTML=rng.v3
    ?`You open from the <b>${rng.hero}</b> and <b>${rng.vil}</b> 3-bets to ${threeBetSize(rng.vil)}bb. What do you do?`
    :rng.vs
    ?`<b>${rng.vil}</b> opens to 2.5bb. You are in the <b>${rng.hero}</b>. What do you do?`
    :`Everyone folds to you in the <b>${rng.hero}</b>. What do you do?`;
  document.getElementById("cards").innerHTML=cards.map(cardHTML).join("");
  document.getElementById("cls").textContent=`${hand} · ${hand.length===2?"pocket pair":hand[2]==="s"?"suited":"offsuit"}${tr.cur.review?" · review: you missed this before":""}`;
  const keys=rng.vs?["fold","call","raise"]:["fold","raise"];
  const kb={fold:"F",call:"C",raise:"R"};
  document.getElementById("acts").innerHTML=keys.map(k=>`<button class="act ${k}" data-act="${k}">${rng.labels[k]}${k==="raise"?` ${rng.v3?fourBetSize(rng.vil)+"bb":rng.vs?threeBetSize(rng.hero)+"bb":(rng.hero==="SB"?"3bb":"2.5bb")}`:""}<kbd>${kb[k]}</kbd></button>`).join("");
  document.querySelectorAll(".act").forEach(b=>b.onclick=()=>answer(b.dataset.act));
  document.getElementById("fbwrap").innerHTML="";
}

function grade(f,act){const x=f[act];return x>=0.25?"good":x>0?"ok":"bad";}

function answer(act){
  if(tr.answered||!tr.cur)return;
  const {rng,hand,spot}=tr.cur;
  if(!rng.vs&&act==="call")return;
  tr.answered=true;
  const f=freqs(rng,hand),g=grade(f,act),v=verdictText(rng,f);
  tr.n++;if(g==="good"){tr.good++;tr.streak++;}else tr.streak=0;
  if(tr.streak>tr.best){tr.best=tr.streak;try{localStorage.setItem("falcon.bestStreak",tr.best);}catch(e){}}
  tr.log.unshift({hand,spot,act,g,label:rng.vs?rng.s.id:`${rng.hero} open`});tr.log=tr.log.slice(0,25);
  const key=spotKey(spot),st=ST.spots[key]||(ST.spots[key]={n:0,good:0});
  st.n++;if(g==="good")st.good++;
  const mi=ST.missed.findIndex(m=>m.key===key&&m.hand===hand);
  if(g!=="good"){if(mi>=0)ST.missed[mi].count=Math.min(ST.missed[mi].count+1,3);else ST.missed.push({key,hand,count:2});}
  else if(mi>=0){ST.missed[mi].count--;if(ST.missed[mi].count<=0)ST.missed.splice(mi,1);}
  ST.missed=ST.missed.slice(-60);saveST();

  document.querySelectorAll(".act").forEach(b=>{b.disabled=true;if(b.dataset.act===act)b.classList.add("picked");});
  const head={good:["Correct","var(--good)"],ok:["Inaccurate","var(--warn)"],bad:["Mistake","var(--red)"]}[g];
  const you=rng.labels[act].toLowerCase();
  const line=g==="good"
    ?(v.mixed?`You chose ${you}. The chart mixes here, and ${you} is played ${pct(f[act])} of the time.`:`You chose ${you}, which is what the chart does with ${hand} here every time.`)
    :g==="ok"?`You chose ${you}. The chart only does that ${pct(f[act])} of the time; the main play is ${rng.labels[v.main].toLowerCase()}.`
    :`You chose ${you}, but the chart never does that with ${hand} here. ${v.text}.`;
  document.getElementById("fbwrap").innerHTML=`
    <div class="fb ${g}">
      <div class="head"><span class="dot" style="background:${head[1]}"></span>${head[0]}</div>
      <p>${line}</p>
      ${freqBars(rng,f,v.keys)}
      <p style="font-size:13px;color:var(--muted)">${explain(hand)}</p>
      <div class="btns">
        <button class="btn primary" id="next">Next hand <span style="opacity:.6;font-weight:500">(Space)</span></button>
        <button class="btn" id="see">See in chart</button>
      </div>
    </div>`;
  document.getElementById("next").onclick=deal;
  document.getElementById("see").onclick=()=>openInChart(spot,hand);
  document.getElementById("next").focus({preventScroll:true});
  renderScore();
}

function renderScore(){
  document.getElementById("s-acc").textContent=tr.n?Math.round(tr.good/tr.n*100)+"%":"–";
  document.getElementById("s-n").textContent=tr.n;
  document.getElementById("s-streak").textContent=tr.streak;
  document.getElementById("s-best").textContent=tr.best;
  renderLeaks();
  const L=document.getElementById("log");
  if(!tr.log.length)return;
  const tagText={good:"Correct",ok:"Inaccurate",bad:"Mistake"};
  L.innerHTML=tr.log.map((e,i)=>`<button data-i="${i}"><span class="h">${e.hand}</span><span class="sp">${e.label} · you ${getRange(e.spot).labels[e.act].toLowerCase()}</span><span class="tag ${e.g}">${tagText[e.g]}</span></button>`).join("");
  L.querySelectorAll("button").forEach(b=>b.onclick=()=>{const e=tr.log[+b.dataset.i];openInChart(e.spot,e.hand);});
}

function openInChart(spot,hand){
  state.mode=spot.mode;if(spot.mode==="rfi")state.seat=spot.seat;else if(spot.mode==="v3")state.v3=spot.v3;else state.vs=spot.vs;state.sel=hand;
  show("ranges");render();window.scrollTo({top:0});
}

document.querySelectorAll("[data-pool]").forEach(b=>b.onclick=()=>{
  tr.pool=b.dataset.pool;document.querySelectorAll("[data-pool]").forEach(x=>x.setAttribute("aria-pressed",x===b));deal();
});
document.getElementById("skip-easy").onclick=e=>{tr.skipEasy=!tr.skipEasy;e.currentTarget.setAttribute("aria-pressed",tr.skipEasy);};

function renderLeaks(){
  const el=document.getElementById("leaks");
  const rows=Object.entries(ST.spots).map(([k,s])=>({spot:spotFromKey(k),...s})).filter(r=>r.spot&&r.n>=3)
    .sort((a,b)=>a.good/a.n-b.good/b.n).slice(0,5);
  if(!rows.length){el.innerHTML=`<div class="empty">Play at least 3 hands in a spot to see how you do there.</div>`;return;}
  el.innerHTML=rows.map(r=>{const a=r.good/r.n,c=a<0.6?"var(--red)":a<0.85?"var(--warn)":"var(--good)";
    return`<div class="leak"><span>${spotLabel(r.spot)} <span class="n">· ${r.n} hands</span></span><b>${Math.round(a*100)}%</b><span class="track"><span style="width:${a*100}%;background:${c}"></span></span></div>`;}).join("")
    +(ST.missed.length?`<div class="empty">${ST.missed.length} missed hand${ST.missed.length===1?"":"s"} in your review queue.</div>`:"");
}
let resetTimer;
document.getElementById("reset").onclick=e=>{
  const b=e.currentTarget;
  if(!b.classList.contains("armed")){b.classList.add("armed");b.textContent="Tap again to reset";resetTimer=setTimeout(()=>{b.classList.remove("armed");b.textContent="Reset stats";},3000);return;}
  clearTimeout(resetTimer);ST={spots:{},missed:[]};saveST();tr.best=0;tr.streak=0;tr.n=0;tr.good=0;tr.log=[];
  try{localStorage.removeItem("falcon.bestStreak");}catch(err){}
  b.classList.remove("armed");b.textContent="Reset stats";
  document.getElementById("log").innerHTML=`<div class="empty">Your decisions will show up here. Tap one to review it.</div>`;
  renderScore();if(tr.pool==="leaks")deal();
};
