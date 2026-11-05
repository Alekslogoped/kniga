(() => {
 'use strict';
 const $=s=>document.querySelector(s), book=$('#book'), modal=$('#chapters-dialog');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const total=BOOK.scenes.length;
 let current=0,turning=false,speaking=false,speechId=0,animationId=0,audioContext;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const art=(sheet,tile)=>`<span class="art" style="background-image:url('assets/frames/${sheet}-${tile}.webp')"></span>`;
 function weather(season,seed=0){
  const snowy=season==='snow'||season==='dusk',frost=season==='frost';
  if(!snowy&&!frost){
   return `<span class="weather leaves" aria-hidden="true">${Array.from({length:5},(_,i)=>`<i style="--x:${(i*29+9+seed*7)%92}%;--leaf-size:${6+(i%3)*1.3}%;--leaf-opacity:${.36+(i%3)*.055};--turn:${i*47+seed*13}deg;--duration:${9+i%4}s;--delay:-${(i*2.1+seed*.8)%11}s;background-image:url('assets/leaves/maple-${(i+seed)%6+1}.webp')"></i>`).join('')}</span>`;
  }
  return `<span class="weather ${snowy?'snow':'frost'}" aria-hidden="true">${Array.from({length:snowy?13:6},(_,i)=>`<i style="--x:${(i*29+9)%100}%;--y:${(i*17+13)%88}%;--size:${snowy?2+i%3:5}px;--duration:${snowy?5+i%4:8+i%4}s;--delay:-${i*.6}s"></i>`).join('')}</span>`;
 }
 function cover(){return `<article class="page left illustrated-cover approved-left"><h1 class="sr-only">Заяц и главный зимний секрет</h1><p class="sr-only">Александра Мирнова</p><div class="approved-cover-art" role="img" aria-label="Осенне-зимнее название книги. Александра Мирнова в голубой блузке и чёрных очках держит открытую книгу."></div><button class="primary-button cover-open" data-goto="1">Открыть книгу <span aria-hidden="true">→</span></button></article><article class="page right illustrated-cover approved-right"><div class="approved-cover-art" role="img" aria-label="Зайчонок на лесной тропинке между золотой осенью и снежной зимой. Рядом Белка, Ёж, Медведь, Лиса и Волк."></div></article><button class="primary-button cover-open-mobile" data-goto="1">Открыть книгу <span aria-hidden="true">→</span></button>`;}
 function panel(s,n,large=false){const [text,quote]=s.frames[n];return `<section class="panel ${large?'large-panel':'small-panel'}" data-frame="${n}"><button class="illustration" data-animate="${n}" aria-label="Оживить кадр ${n+1}${quote?': '+esc(quote):''}">${art(s.sheet,s.row*3+n)}${weather(s.season,s.row*3+n)}<span class="frame-number" aria-hidden="true">${n+1}</span><span class="tap-hint" aria-hidden="true">✧</span></button><div class="panel-copy"><p class="narration">${esc(text)}</p>${quote?`<p class="speech"><span aria-hidden="true">— </span>${esc(quote)}</p>`:''}</div></section>`;}
 function spread(i){const s=BOOK.scenes[i-1];return `<article class="page left story-left"><div class="page-heading"><span class="eyebrow">${esc(s.chapter)}</span><span class="scene-index">${String(i).padStart(2,'0')} / ${total}</span></div><h2>${esc(s.title)}</h2>${panel(s,0,true)}<span class="folio">${i*2-1}</span></article><article class="page right story-right"><span class="right-eyebrow" aria-hidden="true">ЗАЯЦ И ГЛАВНЫЙ ЗИМНИЙ СЕКРЕТ</span><div class="following-panels"><div class="mobile-first">${panel(s,0)}</div>${panel(s,1)}${panel(s,2)}</div>${s.after?`<p class="afterword ${i===total?'final-lesson':''}">${esc(s.after)}</p>`:''}<div class="scene-tools"><button class="animate-button" data-play><span aria-hidden="true">✧</span> Оживить разворот</button><button class="question-button" data-question aria-expanded="false">Подумаем? <span aria-hidden="true">↗</span></button></div><div class="question-box" hidden><p>${esc(s.question)}</p></div>${i===total?'<button class="restart-button" data-goto="0">Читать сначала ↻</button>':''}<span class="folio">${i*2}</span></article>`;}
 const markup=i=>i===0?cover():spread(i);
 function render(){
  book.innerHTML=markup(current);book.classList.toggle('is-cover',current===0);book.dataset.season=current?BOOK.scenes[current-1].season:'autumn';
  book.insertAdjacentHTML('beforeend',`${current>0?'<button class="corner prev" data-page="-1" aria-label="Перелистнуть назад"></button>':''}${current<total?'<button class="corner next" data-page="1" aria-label="Перелистнуть вперёд"></button>':''}`);
  updateControls();
 }
 function updateControls(){
  $('#prev').disabled=current===0||turning;$('#next').disabled=current===total||turning;
  $('#page-title').textContent=current?BOOK.scenes[current-1].title:'Заяц и главный зимний секрет';
  $('#page-count').textContent=current?`СЦЕНА ${current} ИЗ ${total}`:'НАЧАЛО ПУТЕШЕСТВИЯ';
  $('#chapter-label').textContent=current?BOOK.scenes[current-1].chapter.toLocaleUpperCase('ru'):'ИСТОРИЯ ДЛЯ МАЛЕНЬКИХ ЧИТАТЕЛЕЙ';
  $('#season-label').textContent=current>10?'Снег укрывает лес':current>8?'Первые снежинки':'Золотая осень';
  $('#progress').style.width=current/total*100+'%';$('#announcement').textContent=$('#page-title').textContent;
 }
 function stopSpeech(){speechId++;if('speechSynthesis' in window)speechSynthesis.cancel();speaking=false;$('#narrate').classList.remove('active');$('#narrate').setAttribute('aria-label','Прочитать вслух');book.querySelectorAll('.reading').forEach(el=>el.classList.remove('reading'));}
 function cancelAnimation(){animationId++;book.classList.remove('playing');book.querySelectorAll('.panel').forEach(el=>el.classList.remove('awake','current-frame'));}
 async function goTo(target){
  target=Number(target);if(turning||!Number.isInteger(target)||target<0||target>total||target===current)return;
  stopSpeech();cancelAnimation();turning=true;updateControls();
  try{
   if(innerWidth<=760||reduced.matches){current=target;render();book.classList.remove('mobile-turn');void book.offsetWidth;book.classList.add('mobile-turn');await new Promise(r=>setTimeout(r,reduced.matches?0:320));}
   else{
    const forward=target>current,temp=document.createElement('div');temp.innerHTML=markup(target);
    const sheet=document.createElement('div');sheet.className='page-sheet '+(forward?'forward':'backward');sheet.setAttribute('aria-hidden','true');
    sheet.innerHTML=`<div class="sheet-face front">${book.querySelector(forward?'.right':'.left').outerHTML}</div><div class="sheet-face back">${temp.querySelector(forward?'.left':'.right').outerHTML}</div>`;
    book.querySelector(forward?'.right':'.left').replaceWith(temp.querySelector(forward?'.right':'.left'));book.appendChild(sheet);
    await new Promise(r=>setTimeout(r,900));current=target;render();
   }
  }finally{turning=false;updateControls();}
 }
 function animateFrame(n){book.querySelectorAll('.current-frame').forEach(p=>p.classList.remove('current-frame'));book.querySelectorAll(`[data-frame="${n}"]`).forEach(el=>{el.classList.remove('awake');void el.offsetWidth;el.classList.add('awake','current-frame');const s=BOOK.scenes[current-1];if(s)el.dataset.effect=s.effect;});}
 async function playSpread(){
  if(!current||turning)return;stopSpeech();cancelAnimation();const id=animationId;book.classList.add('playing');
  for(let i=0;i<3;i++){if(id!==animationId)return;animateFrame(i);if(BOOK.scenes[current-1].effect==='howl'&&i===0)sound('howl');if(['rustle','listen'].includes(BOOK.scenes[current-1].effect)&&i===1)sound('rustle');await new Promise(r=>setTimeout(r,reduced.matches?100:1600));}
  if(id===animationId){book.classList.remove('playing');$('#announcement').textContent='Сцена ожила. Можно повторить или листать дальше.';}
 }
 function read(custom,frame){
  if(!('speechSynthesis' in window)){ $('#announcement').textContent='В этом браузере чтение вслух недоступно.';return; }
  stopSpeech();const id=speechId;
  let parts;
  if(custom)parts=[{text:custom,frame}];
  else if(!current)parts=[{text:BOOK.title+'. '+BOOK.subtitle+'. Все знают, как готовиться к зиме. А Зайчонок — ещё нет.'}];
  else{const s=BOOK.scenes[current-1];parts=s.frames.map(([text,quote],i)=>({text:text+' '+quote,frame:i}));parts[0].text=s.title+'. '+parts[0].text;if(s.after)parts.push({text:s.after});}
  speaking=true;$('#narrate').classList.add('active');$('#narrate').setAttribute('aria-label','Остановить чтение');
  function next(index){if(id!==speechId)return;if(index>=parts.length){speaking=false;$('#narrate').classList.remove('active');$('#narrate').setAttribute('aria-label','Прочитать вслух');book.querySelectorAll('.reading').forEach(e=>e.classList.remove('reading'));return;}
   const part=parts[index],u=new SpeechSynthesisUtterance(part.text);u.lang='ru-RU';u.rate=.83;const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('ru'));if(voice)u.voice=voice;
   u.onstart=()=>{if(id!==speechId)return;book.querySelectorAll('.reading').forEach(e=>e.classList.remove('reading'));if(part.frame!==undefined){animateFrame(part.frame);book.querySelectorAll(`[data-frame="${part.frame}"]`).forEach(el=>el.classList.add('reading'));}};
   u.onend=()=>next(index+1);u.onerror=()=>{if(id===speechId){speaking=false;$('#narrate').classList.remove('active');$('#narrate').setAttribute('aria-label','Прочитать вслух');}};speechSynthesis.speak(u);
  }next(0);
 }
 function sound(kind){try{audioContext||=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const t=audioContext.currentTime,g=audioContext.createGain();g.connect(audioContext.destination);g.gain.setValueAtTime(0,t);if(kind==='rustle'){const b=audioContext.createBuffer(1,audioContext.sampleRate*.7,audioContext.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.sin(i/450)**2;const src=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1300;src.buffer=b;src.connect(filter);filter.connect(g);g.gain.linearRampToValueAtTime(.09,t+.1);g.gain.linearRampToValueAtTime(0,t+.65);src.start();}else{const o=audioContext.createOscillator();o.type='sine';o.frequency.setValueAtTime(230,t);o.frequency.exponentialRampToValueAtTime(360,t+.5);o.frequency.exponentialRampToValueAtTime(260,t+1.5);o.connect(g);g.gain.linearRampToValueAtTime(.04,t+.15);g.gain.linearRampToValueAtTime(0,t+1.7);o.start();o.stop(t+1.8);}}catch(_){}}
 function openContents(){stopSpeech();cancelAnimation();if(!modal.open)modal.showModal();}
 book.addEventListener('click',e=>{
  if(turning)return;const goto=e.target.closest('[data-goto]');if(goto){goTo(goto.dataset.goto);return;}const page=e.target.closest('[data-page]');if(page){goTo(current+Number(page.dataset.page));return;}
  const frame=e.target.closest('[data-animate]');if(frame){cancelAnimation();const n=Number(frame.dataset.animate),s=BOOK.scenes[current-1];animateFrame(n);if(s){const words=s.frames[n][1]||s.frames[n][0];read(words,n);}return;}
  if(e.target.closest('[data-play]')){playSpread();return;}const q=e.target.closest('[data-question]');if(q){const box=book.querySelector('.question-box');box.hidden=!box.hidden;q.setAttribute('aria-expanded',String(!box.hidden));}
 });
 $('#home').addEventListener('click',()=>goTo(0));$('#prev').addEventListener('click',()=>goTo(current-1));$('#next').addEventListener('click',()=>goTo(current+1));$('#contents').addEventListener('click',openContents);
 $('#narrate').addEventListener('click',()=>{cancelAnimation();speaking?stopSpeech():read();});if(!('speechSynthesis' in window)){$('#narrate').disabled=true;$('#narrate').title='Чтение вслух недоступно в этом браузере';}
 $('#close-dialog').addEventListener('click',()=>modal.close());$('#intro-link').addEventListener('click',()=>{modal.close();goTo(1);});
 $('#chapters-grid').innerHTML=BOOK.scenes.map((s,i)=>`<button class="chapter-card" data-chapter="${i+1}" aria-label="Сцена ${i+1}: ${esc(s.title)}"><span class="chapter-thumb">${art(s.sheet,s.row*3)}</span><span class="chapter-copy"><small>${String(i+1).padStart(2,'0')}</small><strong>${esc(s.title)}</strong></span></button>`).join('');
 $('#chapters-grid').addEventListener('click',e=>{const b=e.target.closest('[data-chapter]');if(b){modal.close();goTo(b.dataset.chapter);}});
 modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
 $('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else $('#announcement').textContent='Полноэкранный режим недоступен.';}catch(_){$('#announcement').textContent='Полноэкранный режим недоступен.';}});
 document.addEventListener('keydown',e=>{if(modal.open||e.altKey||e.ctrlKey||e.metaKey||e.target.matches('input,textarea,select'))return;if(e.key==='ArrowRight'){e.preventDefault();goTo(current+1);}if(e.key==='ArrowLeft'){e.preventDefault();goTo(current-1);}});
 let start;
 book.addEventListener('pointerdown',e=>{if(e.target.closest('button,input'))return;start={x:e.clientX,y:e.clientY,id:e.pointerId};});
 book.addEventListener('pointerup',e=>{if(!start||start.id!==e.pointerId)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.3)goTo(current+(dx<0?1:-1));});book.addEventListener('pointercancel',()=>{start=null;});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopSpeech();cancelAnimation();}});window.addEventListener('pagehide',()=>{stopSpeech();cancelAnimation();});
 render();for(const s of BOOK.scenes){for(let n=0;n<3;n++){const image=new Image();image.src=`assets/frames/${s.sheet}-${s.row*3+n}.webp`;}}
})();
