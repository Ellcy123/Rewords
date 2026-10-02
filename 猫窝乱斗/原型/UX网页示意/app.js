const $ = id => document.getElementById(id);
const state = {gold:10, owned:false, pos:null, catPos:null, phase:'prep', adUsed:false, speed:1};
let timer=null, drag=null, lastFocus=null;
let combat=null;
function resize(){document.documentElement.style.setProperty('--scale', Math.min(1,(window.innerWidth-24)/390));}
resize();window.addEventListener('resize',resize);
function setView(mode){document.body.classList.toggle('show-battle',mode==='battle');for(const name of ['prep','battle']){$('view-'+name).classList.toggle('active',name===mode);$('view-'+name).setAttribute('aria-pressed',name===mode);}}
$('view-prep').onclick=()=>setView('prep');$('view-battle').onclick=()=>setView('battle');
const widths = {cat:3, feather:2};
const positions = {cat:'catPos', feather:'pos'};
function fromIndex(i){return i===null?null:{x:i%4,y:Math.floor(i/4)};}
function cellsFor(kind,p){return p===null?[]:Array.from({length:widths[kind]},(_,dx)=>({x:p.x+dx,y:p.y}));}
function valid(kind,p){
 if(!p||p.x<0||p.x+widths[kind]>4||p.y<0||p.y>3)return false;
 const other=kind==='cat'?'feather':'cat';
 const occupied=cellsFor(other,fromIndex(state[positions[other]]));
 return cellsFor(kind,p).every(c=>!occupied.some(o=>o.x===c.x&&o.y===c.y));
}
function touching(catPos,toyPos){
 if(catPos===null||toyPos===null)return false;
 return cellsFor('cat',catPos).some(a=>cellsFor('feather',toyPos).some(b=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1));
}
function connected(){return touching(fromIndex(state.catPos),fromIndex(state.pos));}
function hint(text){$('hint').textContent=text;}
function defaultHint(){return state.catPos===null?'先把待放区的面条拖进猫窝':!state.owned?'给面条买件玩具，再拖到它旁边':state.pos===null?'把待放区的逗猫棒拖到面条旁边':connected()?'已连接面条 · 出爪更快了':'玩具还没贴到猫，拖近一点试试';}
for(let i=0;i<16;i++){const cell=document.createElement('div');cell.className='cell';cell.dataset.i=i;$('cells').append(cell);}
function render(){
 $('coins').textContent=state.gold;
 $('item').hidden=state.owned;document.querySelector('.shop-copy').hidden=state.owned;$('sold').hidden=!state.owned;
 const hasCat=state.catPos!==null;
 $('stored-cat').hidden=hasCat;$('cat').hidden=!hasCat;$('fight-cat').hidden=!hasCat;$('cat-name').hidden=!hasCat;
 $('stored').hidden=!state.owned||state.pos!==null;
 const waiting=Number(!hasCat)+Number(state.owned&&state.pos===null);
 $('storage-count').textContent=waiting;$('storage-empty').hidden=waiting!==0;
 $('storage-note').textContent=waiting?'按住拖入':'可拖回暂存';
 $('placed').hidden=state.pos===null;$('fight-feather').hidden=state.pos===null;
 for(const [kind,ids] of [['cat',['cat','fight-cat']],['feather',['placed','fight-feather']]]){
  const i=state[positions[kind]];if(i!==null){for(const id of ids){$(id).style.left=i%4*25+'%';$(id).style.top=Math.floor(i/4)*25+'%';}}
 }
 if(hasCat){$('cat-name').style.left=(state.catPos%4===0?77:1)+'%';$('cat-name').style.top=(Math.floor(state.catPos/4)*25+6)+'%';$('link').style.top=Math.min(88,Math.floor(state.catPos/4)*25+25)+'%';}
 $('link').hidden=!connected();$('buff').hidden=!connected();$('connection').textContent=connected()?'玩具加速已生效':hasCat?'放件玩具在猫旁边':'先拖入面条';
 $('battle-screen').dataset.phase=state.phase;
 const busy=state.phase!=='prep';for(const el of document.querySelectorAll('.shop,.board,.storage'))el.inert=busy;
 $('start').disabled=busy||!hasCat;$('start').innerHTML=state.phase==='result'?'本夜已完成':busy?'正在守梦…':hasCat?'开始守梦 <span>→</span>':'先放入猫咪';
 $('play-demo').disabled=busy||!hasCat;
 $('speed').disabled=state.phase!=='battle';
 if(!busy){$('combat-message').textContent=hasCat?'猫咪已就位':'等待面条入窝';$('battle-state').textContent=hasCat?'阵容预览 · 等待开战':'先在准备页放入猫咪';}
}
function buy(){
 if(state.owned||state.phase!=='prep')return;
 if(state.gold<3){hint('金币不足');return;}
 state.gold-=3;state.owned=true;render();hint('已放入待放区 · 按住逗猫棒拖进猫窝');
}
$('buy').onclick=buy;
function clearDrag(){
 if(drag)drag.el.classList.remove('drag-origin');
 drag=null;$('ghost').hidden=true;$('drag-art').hidden=true;$('storage').classList.remove('drop-target');
 document.querySelectorAll('.cell').forEach(c=>c.classList.remove('target'));
}
function place(kind,p){
 if(state.phase!=='prep'||!valid(kind,p))return false;
 state[positions[kind]]=p.y*4+p.x;render();hint(defaultHint());return true;
}
function closeDialog(){ $('overlay').hidden=true; if(lastFocus?.isConnected&&!lastFocus.hidden)lastFocus.focus(); }
function dialog(title,copy,actions){setView('prep');lastFocus=document.activeElement;$('dialog-title').textContent=title;$('dialog-copy').textContent=copy;$('dialog-actions').replaceChildren();actions.forEach(([label,fn],i)=>{const b=document.createElement('button');b.className=i===0?'paper':'text-action';b.textContent=label;b.onclick=()=>{closeDialog();fn();};$('dialog-actions').append(b);});$('overlay').hidden=false;$('dialog-actions').firstChild.focus();}
$('overlay').addEventListener('keydown',e=>{if(e.key==='Escape'){closeDialog();return;}if(e.key==='Tab'){const buttons=[...$('dialog-actions').querySelectorAll('button')];if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}}});
$('item').onclick=()=>dialog('逗猫棒','占横向 2 格。上下左右贴着面条，出爪间隔从 2 秒缩短到 1.25 秒。',[['买下 · 3 金币',buy],['再看看',()=>{}]]);
function catDetails(){dialog('面条 · 连击猫',`占横向 3 格，喜欢玩具。当前出爪间隔 ${connected()?'1.25':'2'} 秒。此版先讨论布局，旋转和换姿势暂未模拟。`,[['知道了',()=>{}]]);}
$('ad').onclick=()=>{if(state.adUsed||state.phase!=='prep')return;dialog('视频补给 · +4 金币','这是模拟广告，每夜可领取一次；取消不会发奖。',[['模拟看完 · 领取',()=>{state.gold+=4;state.adUsed=true;$('ad').disabled=true;$('ad').setAttribute('aria-label','本夜视频奖励已领取');render();}],['取消',()=>{}]]);};
function requestFight(){if(state.phase!=='prep')return;if(state.catPos===null){setView('prep');hint('先把面条拖进猫窝');return;}if(state.owned&&!connected()){dialog('玩具还没发挥作用',state.pos===null?'逗猫棒还在待放区，不会参与战斗。':'逗猫棒还没贴着面条，这场不会获得加速。',[['继续摆放',()=>hint(defaultHint())],['仍然开战',fight]]);}else fight();}
$('start').onclick=requestFight;$('play-demo').onclick=requestFight;
function animateCombat(className){
 const screen=$('battle-screen');screen.classList.remove(className);void screen.offsetWidth;screen.classList.add(className);
}
$('battle-screen').addEventListener('animationend',e=>{
 if(e.animationName==='damage'&&e.target.id==='damage')$('battle-screen').classList.remove('attacking');
 if(e.animationName==='damage'&&e.target.id==='our-damage')$('battle-screen').classList.remove('boss-striking');
});
function updateCombatHud(){
 $('enemy-hp').style.width=combat.boss/32*100+'%';$('enemy-number').textContent=`${combat.boss} / 32`;
 $('our-hp').style.width=combat.ours/40*100+'%';$('our-number').textContent=`${combat.ours} / 40`;
 $('timer').innerHTML=Math.max(0,25-combat.elapsed/1000).toFixed(1)+'<small>秒</small>';
 const remaining=Math.max(0,combat.nextEnemy-combat.elapsed);
 $('intent-time').textContent=(remaining/1000).toFixed(1);
 $('intent-unit').hidden=false;
 $('intent-fill').style.width=(1-remaining/3000)*100+'%';
 document.querySelector('#battle-screen .boss-intent').classList.toggle('imminent',remaining<=700);
}
function endFight(){
 clearInterval(timer);timer=null;state.phase='result';render();
 $('intent-time').textContent='已结束';$('intent-unit').hidden=true;$('intent-fill').style.width='0%';
 document.querySelector('#battle-screen .boss-intent').classList.remove('imminent');
 $('combat-message').textContent='梦魇退散';$('battle-state').textContent='第 1 夜已完成';
 setTimeout(()=>{if(state.phase==='result')$('result').hidden=false;},650);
}
function fight(){
 clearInterval(timer);clearDrag();state.phase='battle';state.speed=1;
 combat={elapsed:0,boss:32,ours:40,nextEnemy:3000,nextCat:connected()?1250:2000,catPeriod:connected()?1250:2000,last:performance.now()};
 render();setView('battle');
 $('battle-screen').classList.remove('attacking','boss-striking');
 $('result').hidden=true;$('play-demo').hidden=true;renderSpeed();
 $('battle-state').textContent='自动战斗';$('combat-message').textContent='战斗开始';updateCombatHud();
 // Small local animation: basic attacks only, not the full Unity combat rules.
 // One clock drives the warning, strikes, life totals and fight time.
 timer=setInterval(()=>{
  const now=performance.now(),delta=Math.min(100,now-combat.last);combat.last=now;
  if(!$('overlay').hidden||document.hidden)return;
  combat.elapsed+=delta*state.speed;
  if(combat.elapsed>=combat.nextCat){combat.boss=Math.max(0,combat.boss-4);combat.nextCat+=combat.catPeriod;animateCombat('attacking');}
  if(combat.boss>0&&combat.elapsed>=combat.nextEnemy){combat.ours=Math.max(0,combat.ours-3);combat.nextEnemy+=3000;animateCombat('boss-striking');$('combat-message').textContent='床底的手攻击，猫窝生命减少 3';}
  updateCombatHud();
  if(combat.boss===0)endFight();
 },50);
}
function renderSpeed(){
 $('speed').textContent='×'+state.speed;
 $('speed').setAttribute('aria-label',`当前${state.speed}倍速，切换至${state.speed===1?2:1}倍速`);
 $('speed').setAttribute('aria-pressed',String(state.speed===2));
 $('battle-screen').style.setProperty('--combat-speed',state.speed);
 $('battle-state').textContent=state.speed===2?'自动战斗 · 2倍速':'自动战斗';
}
$('speed').onclick=()=>{
 if(state.phase!=='battle')return;
 state.speed=state.speed===1?2:1;
 renderSpeed();
};
$('reset').onclick=()=>{clearInterval(timer);location.reload();};
function boardGeometry(){const r=$('board').getBoundingClientRect(),border=6*r.width/330;return {left:r.left+border,top:r.top+border,step:(r.width-border*2)/4};}
function dropPosition(e){
 const g=boardGeometry(),p={x:Math.round((e.clientX-g.left)/g.step-drag.grabX),y:Math.round((e.clientY-g.top)/g.step-drag.grabY)};
 // Keep the whole footprint inside the nest when the pointer is inside it.
 // The preview and final drop use this same snapped position; occupied cells still reject.
 if(within(e,$('board'))){p.x=Math.max(0,Math.min(4-widths[drag.kind],p.x));p.y=Math.max(0,Math.min(3,p.y));}
 return p;
}
function within(e,el){const r=el.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom;}
function previewDrag(e){
 const p=dropPosition(e),g=boardGeometry(),art=$('drag-art');
 document.querySelectorAll('.cell').forEach(c=>c.classList.remove('target'));
 art.hidden=false;art.style.width=widths[drag.kind]*g.step+'px';art.style.height=g.step+'px';
 art.style.left=e.clientX-drag.grabX*g.step+'px';art.style.top=e.clientY-drag.grabY*g.step+'px';
 $('storage').classList.toggle('drop-target',within(e,$('storage')));
 const ghost=$('ghost');ghost.hidden=!within(e,$('board'));
 if(!ghost.hidden){ghost.style.left=p.x*25+'%';ghost.style.top=p.y*25+'%';ghost.style.width=widths[drag.kind]*25+'%';ghost.classList.toggle('invalid',!valid(drag.kind,p));
  const cat=drag.kind==='cat'?p:fromIndex(state.catPos),toy=drag.kind==='feather'?p:fromIndex(state.pos);
  if(valid(drag.kind,p))cellsFor(drag.kind,p).forEach(c=>$('cells').children[c.y*4+c.x].classList.add('target'));
  ghost.classList.toggle('connected',valid(drag.kind,p)&&touching(cat,toy));
  hint(valid(drag.kind,p)?(touching(cat,toy)?'松手放下 · 将连接面条':'松手放下'):'这里放不下，换一个位置');
 }
}
for(const [id,kind] of [['stored-cat','cat'],['cat','cat'],['stored','feather'],['placed','feather']]){
 const el=$(id);let suppressClick=false;
 el.draggable=false;
 el.addEventListener('dragstart',e=>e.preventDefault());
 el.addEventListener('click',e=>{if(suppressClick){e.preventDefault();suppressClick=false;return;}if(state.phase!=='prep')return;if(kind==='cat')catDetails();else dialog('逗猫棒','按住拖到面条旁边。也可以拖回待放区重新整理。',[['知道了',()=>{}]]);});
 el.addEventListener('pointerdown',e=>{
  if(state.phase!=='prep'||e.button!==0||e.isPrimary===false||drag)return;
  // Stop native image/text dragging from cancelling Pointer Events.
  e.preventDefault();
  suppressClick=false;const onBoard=id==='cat'||id==='placed',g=boardGeometry(),p=fromIndex(state[positions[kind]]);
  drag={el,kind,pointerId:e.pointerId,x:e.clientX,y:e.clientY,moved:false,grabX:onBoard?(e.clientX-g.left)/g.step-p.x:widths[kind]/2,grabY:onBoard?(e.clientY-g.top)/g.step-p.y:.5};
  try{el.setPointerCapture(e.pointerId);}catch{}
 });
 window.addEventListener('pointermove',e=>{
  if(!drag||drag.el!==el||e.pointerId!==drag.pointerId)return;
  e.preventDefault();
  if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;
  if(!drag.moved){drag.moved=true;el.classList.add('drag-origin');$('drag-art').querySelector('img').src=el.querySelector('img').src;}
  previewDrag(e);
 },{capture:true,passive:false});
 window.addEventListener('pointerup',e=>{
  if(!drag||drag.el!==el||e.pointerId!==drag.pointerId)return;
  if(drag.moved){suppressClick=true;let ok=false;
   if(within(e,$('storage'))){state[positions[kind]]=null;render();hint('已拖回待放区');ok=true;}
   else if(within(e,$('board')))ok=place(kind,dropPosition(e));
   if(!ok)hint('没有放下，已回到原处');
  }
  clearDrag();
 },true);
 const cancel=()=>{if(drag?.el===el){clearDrag();render();hint('已取消拖动，物品保留在原处');}};
 window.addEventListener('pointercancel',e=>{if(drag?.pointerId===e.pointerId)cancel();},true);
 // Losing capture alone is not a cancellation: window move/up keeps the drag alive.
}
window.addEventListener('blur',()=>{if(drag){clearDrag();render();}});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){clearDrag();render();hint('已取消拖动');}});
render();

const layoutNames={a:'上下分区',b:'顶部对照',c:'贴近主体'};
const layoutCopy={a:'Boss 信息在上，猫窝生命在下。双方各守一端，中间完整留给战斗。',b:'双方血量并列放在顶部，一眼比较消耗。攻击预告留在 Boss 上方。',c:'已选定的 C 布局。血条与下一击放在一起，放大倒计时；猫咪状态移到窝上方，布艺小窝保持不变。'};
function setLayout(layout,scroll=false){
 if(!layoutNames[layout])return;
 $('battle-screen').dataset.layout=layout;
 $('layout-current').textContent=`当前方案 ${layout.toUpperCase()} · ${layoutNames[layout]}`;
 document.querySelectorAll('[data-layout-choice]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.layoutChoice===layout));
 if(scroll){setView('battle');$('live-study').scrollIntoView({behavior:'instant',block:'start'});}
}
function buildLayoutOptions(){
 for(const layout of ['c','a','b']){
  const card=document.createElement('article');card.className='option-card';card.id='option-'+layout;
  card.innerHTML=`<div class="option-heading"><span class="option-letter">${layout.toUpperCase()}</span><h3>${layoutNames[layout]}</h3>${layout==='c'?'<small>已选定 · 本轮优化</small>':'<small>之前的方案</small>'}</div><div class="option-frame"></div><p class="option-description">${layoutCopy[layout]}</p><button class="option-apply" data-layout-choice="${layout}" aria-pressed="${layout==='c'}">试用 ${layout.toUpperCase()} →</button>`;
  const mock=$('battle-screen').cloneNode(true);mock.dataset.layout=layout;mock.dataset.phase='sample';
  mock.setAttribute('aria-label',`${layout.toUpperCase()} ${layoutNames[layout]}，静态战斗示例`);
  mock.querySelector('#timer').innerHTML='20.5<small>秒</small>';
  mock.querySelector('#enemy-number').textContent='20 / 32';mock.querySelector('#enemy-hp').style.width='62.5%';
  mock.querySelector('#our-number').textContent='37 / 40';mock.querySelector('#our-hp').style.width='92.5%';
  mock.querySelector('#intent-time').textContent='1.5';mock.querySelector('#intent-unit').hidden=false;mock.querySelector('#intent-fill').style.width='50%';
  for(const [id,top] of [['fight-cat',25],['fight-feather',50]]){const el=mock.querySelector('#'+id);el.hidden=false;el.style.left='0%';el.style.top=top+'%';}
  const name=mock.querySelector('#cat-name');name.hidden=false;name.style.left='77%';name.style.top='31%';
  mock.querySelector('#buff').hidden=false;
  mock.querySelector('#battle-state').textContent='自动战斗';
  mock.querySelector('#result').remove();mock.querySelector('#combat-message').remove();
  const speed=mock.querySelector('#speed'),symbol=document.createElement('span');symbol.className='speed-toggle';symbol.textContent='×1';symbol.setAttribute('aria-hidden','true');speed.replaceWith(symbol);
  mock.removeAttribute('id');mock.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  card.querySelector('.option-frame').append(mock);$('layout-options').append(card);
 }
 document.querySelectorAll('[data-layout-choice]').forEach(b=>b.onclick=()=>setLayout(b.dataset.layoutChoice,b.classList.contains('option-apply')));
}
buildLayoutOptions();
