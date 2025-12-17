/* ---------- настройки ---------- */
const COLORS = [
  '#e41a1c','#377eb8','#4daf4a','#984ea3',
  '#ff7f00','#ffff33','#a65628','#f781bf'
];
const PLAYER_NAMES = ['К','С','З','Ф','О','Ж','Б','Р'];

/* ---------- состояние ---------- */
let n, possible;   // possible[pid] = Set ключей "r,c"
let detected;      // detected[pid] = true, если игрока хоть раз находили

const $ = q => document.querySelector(q);
const sizeSel = $('#sizeSel');
const wrap = $('#fieldWrap');

sizeSel.addEventListener('change', startGame);
$('#newGameBtn').addEventListener('click', startGame);
startGame();

/* ---------- инициализация ---------- */
function startGame(){
  n = +sizeSel.value;
  possible = Array.from({length:8},()=>new Set());
  detected   = Array(8).fill(false);
  /* изначально каждый игрок может быть в любой клетке */
  for(let pid=0;pid<8;pid++){
    for(let r=0;r<n;r++) for(let c=0;c<n;c++) possible[pid].add(key(r,c));
  }
  render();
}

/* ---------- отрисовка поля ---------- */
function render(){
  const tbl = document.createElement('table');
  for(let r=0;r<n;r++){
    const tr = tbl.insertRow();
    for(let c=0;c<n;c++){
      const td = tr.insertCell();
      td.dataset.r = r;
      td.dataset.c = c;

      /* стрелки */
      if(r===0) td.append(arrow('↑','col',c,-1));
      if(r===n-1) td.append(arrow('↓','col',c, 1));
      if(c===0) td.append(arrow('←','row',r,-1));
      if(c===n-1) td.append(arrow('→','row',r, 1));

      /* карточка */
      const card = document.createElement('div');
      card.className = 'card';
      card.addEventListener('click',()=>checkPresence(r,c));
      td.append(card);
    }
  }
  wrap.innerHTML = '';
  wrap.appendChild(tbl);
  updateProbs();
}

/* ---------- стрелки ---------- */
function arrow(sym,type,idx,dir){
  const a = document.createElement('div');
  a.className = 'arrow '+(type==='col'?(dir===-1?'top':'bot'):(dir===-1?'left':'right'));
  a.textContent = sym;
  a.addEventListener('click',e=>{e.stopPropagation(); shift(type,idx,dir);});
  return a;
}

/* ---------- сдвиг строки/столбца ---------- */
function shift(type, idx, dir) {
  const newPoss = Array.from({ length: 8 }, () => new Set());

  if (type === 'col') {               /* сдвигаем СТОЛБЕЦ idx */
    for (let pid = 0; pid < 8; pid++) {
      for (const k of possible[pid]) {
        const { r, c } = unkey(k);
        if (c === idx) {              /* только этот столбец */
          let nr = (dir === 1) ? ((r + 1) % n) : ((r - 1 + n) % n);
          newPoss[pid].add(key(nr, c));
        } else {                      /* остальные не трогаем */
          newPoss[pid].add(k);
        }
      }
    }
  } else {                            /* сдвигаем СТРОКУ idx */
    for (let pid = 0; pid < 8; pid++) {
      for (const k of possible[pid]) {
        const { r, c } = unkey(k);
        if (r === idx) {              /* только эта строка */
          let nc = (dir === 1) ? ((c + 1) % n) : ((c - 1 + n) % n);
          newPoss[pid].add(key(r, nc));
        } else {                      /* остальные не трогаем */
          newPoss[pid].add(k);
        }
      }
    }
  }

  for (let pid = 0; pid < 8; pid++) possible[pid] = newPoss[pid];
  updateProbs();
}

/* ---------- проверка присутствия ---------- */
function checkPresence(r,c){
  const circle = new Set();
  forEachNeigh(r,c,(nr,nc)=> circle.add(key(nr,nc)));

  /* уникальные игроки, которые теоретически могут быть в кругу */
  const variants = new Set();
  for(let pid=0;pid<8;pid++){
    for(const k of possible[pid]) if(circle.has(k)) { variants.add(pid); break; }
  }
  if(!variants.size){ alert('Тут никого не может быть'); return; }

  /* модальное окно */
  const cover = document.createElement('div');
  cover.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:100';
  const box = document.createElement('div');
  box.style.cssText = 'background:#222;padding:1rem;border:1px solid #666;border-radius:6px';
  box.innerHTML = `<div>Отметьте игроков, которых вы видите рядом с (${r},${c}):</div>`;

  [...variants].sort((a,b)=>a-b).forEach(pid=>{
    const lbl = document.createElement('label');
    lbl.style.cssText='display:flex;align-items:center;margin:.3em 0;cursor:pointer';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.value = pid;
    lbl.append(cb);
    const sq = document.createElement('div');
    sq.className='colorBox'; sq.style.background=COLORS[pid];
    lbl.append(sq);
    const nameSpan = document.createElement('span');
    nameSpan.style.color = COLORS[pid];          // <-- цвет текста = цвет игрока
    nameSpan.textContent = ` ${PLAYER_NAMES[pid]}`;
    lbl.append(nameSpan);
    box.append(lbl);
  });

  const btnWrap = document.createElement('div');
  btnWrap.style.marginTop = '.5rem';
  const ok = document.createElement('button');
  ok.textContent = 'Применить';
  const cancel = document.createElement('button');
  cancel.textContent = 'Отменить';
  cancel.style.marginLeft = '.5rem';
  btnWrap.append(ok, cancel);
  box.append(btnWrap);
  cover.append(box);
  document.body.append(cover);

  /* кнопка «Отменить» – просто закрываем окно */
  cancel.onclick = () => document.body.removeChild(cover);

  ok.onclick=()=>{
    const seen = new Set([...box.querySelectorAll('input:checked')].map(i=>+i.value));
    seen.forEach(pid=>detected[pid]=true);

    /* фильтрация по правилам */
    for(let pid=0;pid<8;pid++){
      const old = possible[pid];
      const upd = new Set();
      if(seen.has(pid)){             // найден → остаётся только пересечение с кругом
        for(const k of old) if(circle.has(k)) upd.add(k);
      }else{                         // не найден → исключаем круг
        for(const k of old) if(!circle.has(k)) upd.add(k);
      }
      possible[pid] = upd;
    }

    /* если у игрока осталась ровно 1 клетка – вычищаем её от других */
    for(let pid=0;pid<8;pid++){
      if(possible[pid].size===1){
        const onlyK = [...possible[pid]][0];
        for(let other=0;other<8;other++){
          if(other!==pid) possible[other].delete(onlyK);
        }
      }
    }

    document.body.removeChild(cover);
    updateProbs();
  };
}

/* ---------- пересчёт и вывод вероятностей ---------- */
function updateProbs(){
  const counts = Array.from({length:8},(_,pid)=>possible[pid].size);
  for(let r=0;r<n;r++){
    for(let c=0;c<n;c++){
      const card = document.querySelector(`td[data-r="${r}"][data-c="${c}"] .card`);
      card.innerHTML = '';
      if(detected.some(Boolean)){
        for(let pid=0;pid<8;pid++){
          if(possible[pid].has(key(r,c))){
            const line = document.createElement('div');
            line.className = 'probLine';
            line.style.color = COLORS[pid];
            line.textContent = `${PLAYER_NAMES[pid]} 1/${counts[pid]}`;
            card.append(line);
          }
        }
      }
    }
  }
}

/* ---------- мелкие хелперы ---------- */
function key(r,c){ return `${r},${c}`; }
function unkey(k){ const [r,c]=k.split(','); return {r:+r,c:+c}; }
function forEachNeigh(r,c,fn){
  for(let dr=-1;dr<=1;dr++){
    for(let dc=-1;dc<=1;dc++){
      const nr=r+dr, nc=c+dc;
      if(nr>=0&&nr<n&&nc>=0&&nc<n) fn(nr,nc);
    }
  }
}