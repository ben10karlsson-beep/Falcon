/* Falcon range reading: paint the range a player has in a spot, then compare it with the chart in combos.
   Depends on ranges.js (RFI, VS, parse, getRange, freqs, rangeOverlap, handGroup) and preflop.js (openInChart). */
(function(){
  const $=id=>document.getElementById(id);

  /* Every spot with a real range to read: 5 opens, 5 calls, 5 3-bets (tiny ranges are skipped) */
  const SPOTS=[];
  for(const seat of Object.keys(RFI))SPOTS.push({kind:"rfi",chart:parse(RFI[seat].raise),color:"var(--raise)",spot:{mode:"rfi",seat},who:seat,
    prompt:`Everyone folds to <b>${seat}</b>, who opens to ${seat==="SB"?"3":"2.5"}bb. Paint ${seat}'s opening range.`});
  VS.forEach((v,i)=>{
    const rng=getRange({mode:"vs",vs:i}),call={},raise={};
    ALL_HANDS.forEach(h=>{const f=freqs(rng,h);if(f.call>0)call[h]=f.call;if(f.raise>0)raise[h]=f.raise;});
    SPOTS.push({kind:"call",chart:call,color:"var(--call)",spot:{mode:"vs",vs:i},who:v.hero,
      prompt:`<b>${v.vil}</b> opens to 2.5bb and <b>${v.hero}</b> calls. Paint the hands ${v.hero} calls with.`});
    SPOTS.push({kind:"3bet",chart:raise,color:"var(--raise)",spot:{mode:"vs",vs:i},who:v.hero,
      prompt:`<b>${v.vil}</b> opens to 2.5bb and <b>${v.hero}</b> 3-bets. Paint ${v.hero}'s 3-betting range.`});
  });
  const sizeOf=m=>Object.keys(m).reduce((t,h)=>t+m[h]*combos(h),0);
  const READABLE=SPOTS.filter(s=>sizeOf(s.chart)>=20);

  const rd={pool:"all",cur:null,guess:{},checked:false,view:"diff",showSize:false,res:null,n:0,sum:0,good:0};
  const fmtC=x=>Number.isInteger(x)?String(x):x.toFixed(1);
  const sizeText=m=>{const c=sizeOf(m);return`${pct(c/1326)} · ${fmtC(c)} combos`;};

  function deal(){
    const pool=READABLE.filter(s=>rd.pool==="all"||s.kind===rd.pool);
    let next;do{next=pool[(Math.random()*pool.length)|0];}while(pool.length>1&&next===rd.cur);
    rd.cur=next;rd.guess={};rd.checked=false;rd.res=null;rd.view="diff";
    $("rd-q").innerHTML=rd.cur.prompt;
    $("rd-fb").innerHTML="";$("rd-view").hidden=true;$("rd-tools").hidden=false;
    $("rd-add").value="";$("rd-add").removeAttribute("aria-invalid");
    renderGrid();renderSize();
  }

  /* One cell's look. While painting: painted or not. After checking: your range, the chart, or the differences. */
  function cellStyle(h){
    const g=rd.guess[h]||0,f=rd.cur.chart[h]||0,col=rd.cur.color;
    const part=x=>x>=0.999?col:`linear-gradient(to right,${col} 0 ${x*100}%,var(--fold) ${x*100}% 100%)`;
    if(!rd.checked||rd.view==="you")return{bg:g?col:"var(--fold)",cls:g?"":"zero",label:g?"in your range":"not in your range"};
    if(rd.view==="chart")return{bg:f?part(f):"var(--fold)",cls:f?"":"zero",label:f?`chart plays it ${pct(f)}`:"chart folds it"};
    if(g&&f)return{bg:part(f),cls:"",label:`in both${f<1?`, chart plays it ${pct(f)}`:""}`};
    if(f)return{bg:`color-mix(in srgb,${col} 35%,var(--fold))`,cls:"rd-miss",label:`missed, chart plays it ${pct(f)}`};
    if(g)return{bg:"var(--fold)",cls:"zero rd-extra",label:"extra, the chart doesn't play it"};
    return{bg:"var(--fold)",cls:"zero",label:"not in either"};
  }
  function paintCell(b){
    const h=b.dataset.h,st=cellStyle(h);
    b.className="cell"+(h.length===2?" pair":"")+(st.cls?" "+st.cls:"");
    b.style.background=st.bg;
    b.setAttribute("aria-label",`${h}: ${st.label}`);
    b.setAttribute("aria-pressed",!!rd.guess[h]);
  }
  function renderGrid(){
    const g=$("rd-grid");
    if(!g.children.length){
      let html="";
      for(let i=0;i<13;i++)for(let j=0;j<13;j++){const h=handAt(i,j);html+=`<button class="cell" data-h="${h}"><span class="r">${h.slice(0,2)}</span>${h.length===3?`<span class="s">${h[2]}</span>`:""}</button>`;}
      g.innerHTML=html;
    }
    g.classList.toggle("locked",rd.checked);
    g.querySelectorAll(".cell").forEach(paintCell);
  }
  function renderSize(){
    const target=rd.showSize||rd.checked?` <span class="rd-target">Chart: ${sizeText(rd.cur.chart)}</span>`:"";
    $("rd-size").innerHTML=`<span>Your range: <b>${sizeText(rd.guess)}</b></span>${target}`+
      (rd.checked?"":`<button class="linkbtn" id="rd-show">${rd.showSize?"Hide":"Show"} target size</button>`);
    if($("rd-show"))$("rd-show").onclick=()=>{rd.showSize=!rd.showSize;renderSize();};
  }
  function setHand(h,on){
    if(on)rd.guess[h]=1;else delete rd.guess[h];
    paintCell($("rd-grid").querySelector(`[data-h="${h}"]`));
  }

  /* Painting: press on a square to paint (or erase, if it was painted), drag across squares to keep going */
  let painting=null,last=null;
  function paintAt(x,y){
    const b=document.elementFromPoint(x,y)?.closest("#rd-grid .cell");
    if(b&&!!rd.guess[b.dataset.h]!==painting)setHand(b.dataset.h,painting);
  }
  function initPainting(){
    const g=$("rd-grid");
    g.addEventListener("pointerdown",e=>{
      const b=e.target.closest(".cell");
      if(!b||rd.checked)return;
      e.preventDefault();
      painting=!rd.guess[b.dataset.h];last=[e.clientX,e.clientY];
      setHand(b.dataset.h,painting);renderSize();
      g.setPointerCapture(e.pointerId);
    });
    g.addEventListener("pointermove",e=>{
      if(painting===null)return;
      // A fast drag skips squares between events, so paint every few pixels along the path
      const [x0,y0]=last,dx=e.clientX-x0,dy=e.clientY-y0,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6));
      for(let i=1;i<=steps;i++)paintAt(x0+dx*i/steps,y0+dy*i/steps);
      last=[e.clientX,e.clientY];renderSize();
    });
    const stop=()=>{painting=null;};
    g.addEventListener("pointerup",stop);g.addEventListener("pointercancel",stop);
    // Keyboard: Enter / Space on a focused square toggles it (pointer clicks are handled above)
    g.addEventListener("click",e=>{
      const b=e.target.closest(".cell");
      if(!b||rd.checked||e.detail!==0)return;
      setHand(b.dataset.h,!rd.guess[b.dataset.h]);renderSize();
    });
  }

  function addTyped(){
    const inp=$("rd-add"),txt=inp.value.trim();
    if(!txt)return;
    let m;
    try{m=parse(txt.split(",").filter(t=>t.trim()).join(","));}catch(e){m=null;}
    if(!m||!Object.keys(m).length||!Object.keys(m).every(h=>ALL_HANDS.includes(h))){inp.setAttribute("aria-invalid","true");return;}
    inp.removeAttribute("aria-invalid");
    Object.keys(m).forEach(h=>{if(m[h]>0)setHand(h,true);});
    inp.value="";renderSize();
  }

  /* Biggest mistakes, grouped the way players think about ranges */
  function mistakes(){
    const by={};
    for(const h of ALL_HANDS){
      const g=rd.guess[h]||0,f=rd.cur.chart[h]||0,c=combos(h);
      for(const [type,x] of [["Missed",c*Math.max(f-g,0)],["Added",c*Math.max(g-f,0)]]){
        if(x<=0)continue;
        const k=type+"|"+handGroup(h);
        (by[k]||(by[k]={type,group:handGroup(h),combos:0,hands:[]})).combos+=x;
        by[k].hands.push([h,x]);
      }
    }
    return Object.values(by).filter(m=>m.combos>=3).sort((a,b)=>b.combos-a.combos).slice(0,3);
  }

  function check(){
    if(rd.checked)return;
    if(!Object.keys(rd.guess).length){$("rd-fb").innerHTML=`<p class="hint">Paint at least one hand first: click or drag across the grid, or type a range like TT+, AJs+.</p>`;return;}
    const r=rangeOverlap(rd.guess,rd.cur.chart);
    rd.checked=true;rd.res=r;rd.n++;rd.sum+=r.score;
    const grade=r.score>=0.85?"good":r.score>=0.7?"ok":"bad";
    if(grade==="good")rd.good++;
    const head={good:"Spot on",ok:"Close",bad:"Off"}[grade],color={good:"var(--good)",ok:"var(--warn)",bad:"var(--red)"}[grade];
    const gC=sizeOf(rd.guess),cC=sizeOf(rd.cur.chart);
    const sizeLine=Math.abs(gC-cC)<cC*0.1?"About the right size."
      :gC>cC?`Your range is ${fmtC(gC-cC)} combos too wide.`:`Your range is ${fmtC(cC-gC)} combos too tight.`;
    const ms=mistakes();
    const list=ms.map(m=>{
      const hs=m.hands.sort((a,b)=>b[1]-a[1]),names=hs.slice(0,6).map(x=>x[0]).join(", ")+(hs.length>6?` and ${hs.length-6} more`:"");
      return`<li><strong>${m.type}: ${m.group.toLowerCase()}</strong>, ${fmtC(m.combos)} combos <span class="sub">${names}</span></li>`;
    }).join("");
    const offsuit=ms.length&&ms[0].group.startsWith("Offsuit")
      ?`<p>Offsuit hands are 12 combos each, three times a suited hand, so they move a range's size the most (theory chapter 4).</p>`:"";
    $("rd-fb").innerHTML=`
      <div class="fb ${grade}">
        <div class="head"><span class="dot" style="background:${color}"></span>${head}</div>
        <p>Your range overlaps the chart by <strong>${pct(r.score)}</strong>. You match ${fmtC(r.hit)} combos, missed ${fmtC(r.missed)} and added ${fmtC(r.extra)} it doesn't play. ${sizeLine}</p>
        ${list?`<div><div class="label" style="margin-bottom:6px">Biggest differences</div><ul class="takeaways rd-list">${list}</ul></div>`:"<p>No differences worth mentioning.</p>"}
        ${offsuit}
        <div class="rd-legend"><span><i class="sw" style="background:${rd.cur.color}"></i>In both</span><span><i class="sw rd-miss-sw" style="background:color-mix(in srgb,${rd.cur.color} 35%,var(--fold))"></i>Missed</span><span><i class="sw rd-extra-sw"></i>Added</span></div>
        <div class="btns"><button class="btn primary" id="rd-next">Next spot <span style="opacity:.6;font-weight:500">(Enter)</span></button>
        <button class="btn" id="rd-see">See in chart</button></div>
      </div>`;
    $("rd-next").onclick=deal;
    $("rd-see").onclick=()=>openInChart(rd.cur.spot,ms.length?ms[0].hands[0][0]:"AA");
    $("rd-tools").hidden=true;$("rd-view").hidden=false;setView("diff");renderSize();
    $("rd-next").focus({preventScroll:true});
    $("rd-n").textContent=rd.n;$("rd-avg").textContent=pct(rd.sum/rd.n);$("rd-good").textContent=rd.good;
  }
  function setView(v){
    rd.view=v;
    document.querySelectorAll("[data-rv]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.rv===v));
    renderGrid();
  }

  let ready=false;
  window.Reading={
    show(){
      if(!ready){
        ready=true;initPainting();
        document.querySelectorAll("[data-rp]").forEach(b=>b.onclick=()=>{
          rd.pool=b.dataset.rp;document.querySelectorAll("[data-rp]").forEach(x=>x.setAttribute("aria-pressed",x===b));deal();
        });
        document.querySelectorAll("[data-rv]").forEach(b=>b.onclick=()=>setView(b.dataset.rv));
        $("rd-new").onclick=deal;$("rd-check").onclick=check;$("rd-clear").onclick=()=>{rd.guess={};renderGrid();renderSize();};
        $("rd-add-btn").onclick=addTyped;
        $("rd-add").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addTyped();}};
      }
      if(!rd.cur)deal();
    },
    key(e){
      if(e.key!=="Enter")return false;
      if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest("button"))return false;
      if(rd.checked)deal();else check();
      return true;
    }
  };
})();
