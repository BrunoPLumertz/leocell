/* Léo Cell · site.js */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const WA = '5551995791329';
  const waLink = msg => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;

  /* ---------- ajudante comum: um agendador de scroll para a página toda ---------- */
  const scrollers = new Set();
  let scrollRaf = null;
  function onPageScroll() {
    if (scrollRaf === null) scrollRaf = requestAnimationFrame(() => { scrollRaf = null; scrollers.forEach(fn => fn()); });
  }
  addEventListener('scroll', onPageScroll, { passive: true });
  addEventListener('resize', onPageScroll);

  /* ---------- elementos vivos só quando visíveis; tudo pausa com a aba escondida ---------- */
  const liveIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('live', e.isIntersecting)), { rootMargin: '60px' });
  $$('.hero, .order, .store').forEach(el => liveIO.observe(el));
  $('.statusbar').classList.add('live');
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));

  /* ---------- texto que decodifica (efeito 1); fonte mono, então nada pula ---------- */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+/';
  function scrambleTo(el, final, { duration = 520, stagger = 26 } = {}) {
    if (el._scr) cancelAnimationFrame(el._scr);
    if (RM.matches) { el.textContent = final; return; }
    const t0 = performance.now(); let last = 0;
    const frame = now => {
      if (now - last < 45) { el._scr = requestAnimationFrame(frame); return; }
      last = now;
      const t = now - t0; let done = true;
      const out = [...final].map((ch, i) => {
        if (ch === ' ' || ch === '·' || t >= duration + i * stagger) return ch;
        done = false; return GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }).join('');
      if (el.textContent !== out) el.textContent = out;
      el._scr = done ? null : requestAnimationFrame(frame);
    };
    el._scr = requestAnimationFrame(frame);
  }
  $$('[data-scramble]').forEach(el => {
    const final = el.textContent;
    const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = final;
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true'); vis.textContent = final;
    el.textContent = ''; el.append(sr, vis);
    scrambleTo(vis, final, { duration: 700, stagger: 30 });
  });

  /* ---------- a barra de status: hora, aberto agora e a bateria ---------- */
  const TZ = 'America/Sao_Paulo';
  const HOURS = { 0: null, 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [9, 15] };
  const DAYN = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const partsFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function nowHere() {
    const p = {}; partsFmt.formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
    return { d: WD[p.weekday], h: (+p.hour) % 24, m: +p.minute };
  }
  function openStatus() {
    const { d, h, m } = nowHere(); const t = h + m / 60; const today = HOURS[d];
    if (today && t >= today[0] && t < today[1]) return { open: true, long: `Aberto agora · fecha às ${today[1]}h`, short: 'Aberto', d, h, m };
    if (today && t < today[0]) return { open: false, long: `Fechado · abre hoje às ${today[0]}h`, short: 'Fechado', d, h, m };
    for (let k = 1; k <= 7; k++) {
      const nd = (d + k) % 7;
      if (HOURS[nd]) return { open: false, long: `Fechado · abre ${k === 1 ? 'amanhã' : DAYN[nd]} às ${HOURS[nd][0]}h`, short: 'Fechado', d, h, m };
    }
    return { open: false, long: 'Fechado', short: 'Fechado', d, h, m };
  }
  const clocks = $$('[data-clock]'), openEl = $('[data-open]'), openLong = $('[data-open-long]'), openShort = $('[data-open-short]'), openTag = $('[data-open-tag]');
  let lastClock = '', lastOpen = '';
  function tickStatus() {
    const s = openStatus();
    const clock = String(s.h).padStart(2, '0') + ':' + String(s.m).padStart(2, '0');
    if (clock !== lastClock) { lastClock = clock; clocks.forEach(c => { c.textContent = clock; }); }
    if (s.long !== lastOpen) {
      lastOpen = s.long;
      openEl.classList.toggle('is-open', s.open);
      openLong.textContent = s.long; openShort.textContent = s.short;
      if (openTag) { openTag.textContent = s.open ? 'Aberto agora' : 'Fechado agora'; openTag.classList.toggle('is-open', s.open); }
      $$('[data-hours] tr').forEach(tr => tr.classList.toggle('today', +tr.dataset.day === s.d));
    }
  }
  tickStatus();
  setInterval(tickStatus, 15000);

  const batt = $('[data-batt]'), battPct = $('[data-batt-pct]');
  let lastLvl = -1;
  function battUpdate() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 1;
    const lvl = Math.round(12 + 88 * p);
    if (lvl === lastLvl) return;
    lastLvl = lvl;
    batt.style.setProperty('--lvl', (lvl / 100).toFixed(2));
    battPct.textContent = lvl + '%';
    batt.classList.toggle('low', lvl < 20);
    batt.classList.toggle('full', lvl >= 100);
  }
  scrollers.add(battUpdate);
  battUpdate();

  /* ---------- o topo: raio-x do defeito ---------- */
  const rect = (x1, y1, x2, y2) => { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; return [[x1, y1], [mx, y1], [x2, y1], [x2, my], [x2, y2], [mx, y2], [x1, y2], [x1, my]]; };
  const CENTER = Array.from({ length: 8 }, () => [50, 50]);
  const TEST = 'Antes de trocar, a gente testa';
  const PARTS = {
    tela: { label: 'VIDRO + DISPLAY', a: [620, 850], title: 'Tela trincada',
      ser: 'O vidro e o display vêm colados. Se o toque ou a imagem falham, troca o conjunto.', teste: 'Toque, imagem e brilho, antes e depois da troca.' },
    bateria: { label: 'BATERIA', a: [70, 640], poly: [[8.6, 25.7], [63.2, 25.7], [63.2, 56.5], [91.9, 56.5], [91.9, 84.8], [50, 84.8], [8.6, 84.8], [8.6, 55]], title: 'Bateria não dura',
      ser: 'Bateria gasta ou estufada. Estufada é para trocar logo: ela empurra a tela.', teste: 'A saúde da bateria e o consumo, para ver se não é um aplicativo gastando.' },
    conector: { label: 'CONECTOR DE CARGA', a: [160, 1372], poly: rect(20, 91.4, 66, 98.4), title: 'Não carrega',
      ser: 'Sujeira ou desgaste no conector. Muitas vezes uma limpeza resolve.', teste: 'O cabo, a fonte e o conector, antes de falar em troca.' },
    placa: { label: 'PLACA', a: [470, 430], poly: [[43.3, 2.8], [92.8, 2.8], [92.8, 30], [92.8, 56.1], [64.6, 56.1], [64.6, 25.2], [43.3, 25.2], [43.3, 14]], title: 'Caiu na água',
      ser: 'Oxidação na placa. Quanto antes abrir e limpar, mais chance de salvar.', testeLabel: 'Faça agora', teste: 'Desligue e não carregue. Arroz não seca por dentro.' },
    camera: { label: 'MÓDULO DA CÂMERA', a: [62, 170], poly: rect(7.6, 3.6, 43.3, 22.8), title: 'Câmera falhando',
      ser: 'Lente trincada, foco travado ou o módulo solto depois de uma queda.', teste: 'Foco e cada lente, uma por uma.' },
    som: { label: 'ALTO-FALANTE E MICROFONE', a: [86, 1288], poly: rect(11, 85.6, 49.5, 92), title: 'Sem som ou microfone',
      ser: 'Sujeira na grade ou o alto-falante queimado.', teste: 'Chamada, viva-voz e gravação.' },
    sistema: { label: 'MEMÓRIA E SISTEMA', a: [548, 724], poly: rect(75.2, 44, 94.6, 56.2), title: 'Lento ou travando',
      ser: 'Memória cheia ou sistema com problema. Nem sempre é peça.', teste: 'O armazenamento e o sistema. Se for só software, a gente te diz.' },
    pc: { label: 'PC E NOTEBOOK', a: [40, 724], title: 'É no PC ou notebook',
      ser: 'Lentidão, aquecimento, tela ou teclado. Limpeza, formatação e troca de SSD resolvem muita coisa.', testeLabel: 'Antes de orçar, a gente testa', teste: 'Temperatura, disco e memória antes de orçar.' }
  };
  const stage = $('[data-stage]');
  if (stage) {
    const real = $('.real', stage), coLabel = $('[data-co-label]', stage);
    const chips = $$('[data-chips] .chip');
    const ro = $('[data-readout]'), roTag = $('[data-ro-tag]'), roTitle = $('[data-ro-title]'), roRows = $('[data-ro-rows]'),
      roSer = $('[data-ro-ser]'), roTeste = $('[data-ro-teste]'), roTesteLabel = $('[data-ro-teste-label]'),
      roActions = $('[data-ro-actions]'), roWa = $('[data-ro-wa]'), roForm = $('[data-ro-form]');
    const polyCSS = pts => `polygon(${pts.map(([x, y]) => `${x}% ${y}%`).join(',')})`;
    let current = null, drawTimer = 0, roTimer = 0;

    function callout(P, delay) {
      clearTimeout(drawTimer);
      stage.classList.remove('drawn');
      if (!P) return;
      stage.style.setProperty('--ax', ((440 + P.a[0]) / 1160 * 100).toFixed(3) + '%');
      stage.style.setProperty('--ay', (P.a[1] / 1448 * 100).toFixed(3) + '%');
      coLabel.textContent = P.label;
      drawTimer = setTimeout(() => {
        void stage.offsetWidth;
        stage.classList.add('drawn');
        scrambleTo(coLabel, P.label);
      }, RM.matches ? 0 : delay);
    }
    function readout(id) {
      const P = id && PARTS[id];
      const write = () => {
        if (!P) {
          roTag.textContent = 'Raio-x';
          roTitle.textContent = 'Toque no problema e veja onde ele mora.';
          roRows.hidden = true; roActions.hidden = true;
        } else {
          roTag.textContent = 'Raio-x · ' + P.label.toLowerCase();
          roTitle.textContent = P.title;
          roSer.textContent = P.ser;
          roTesteLabel.textContent = P.testeLabel || TEST;
          roTeste.textContent = P.teste;
          roRows.hidden = false; roActions.hidden = false;
          const msg = id === 'pc' ? 'Oi, Léo! Meu PC ou notebook está com problema. Queria um orçamento.'
            : `Oi, Léo! Meu celular está com este problema: ${P.title.toLowerCase()}. Queria um orçamento.`;
          roWa.href = waLink(msg);
          roForm.dataset.part = id;
        }
        ro.classList.remove('swap');
      };
      clearTimeout(roTimer);
      if (RM.matches) { write(); return; }
      ro.classList.add('swap');
      roTimer = setTimeout(write, 170);
    }
    function apply(id, { demo = false } = {}) {
      const P = id ? PARTS[id] : null;
      const wasTela = stage.dataset.part === 'tela';
      stage.dataset.part = id || '';
      stage.classList.toggle('has-part', !!(P && P.poly));
      real.style.clipPath = polyCSS(P && P.poly ? P.poly : CENTER);
      const flipping = (id === 'tela') !== wasTela;
      callout(P, flipping ? 760 : (id === 'pc' ? 380 : 180));
      if (!demo) {
        current = id;
        chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.part === id)));
        readout(id);
      }
    }
    chips.forEach((c, i) => {
      c.addEventListener('click', () => { stopDemo(); apply(current === c.dataset.part ? null : c.dataset.part); });
      c.addEventListener('keydown', e => {
        const k = e.key; let j = -1;
        if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % chips.length;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + chips.length) % chips.length;
        else if (k === 'Home') j = 0; else if (k === 'End') j = chips.length - 1;
        if (j < 0) return;
        e.preventDefault(); chips[j].focus();
      });
    });
    // "Montar pedido completo": leva o problema escolhido para o formulário
    roForm.addEventListener('click', () => {
      const id = roForm.dataset.part;
      if (id === 'pc') { const r = $('input[name="aparelho"][value="PC ou notebook"]'); if (r) r.checked = true; }
      else if (id) { const cb = $(`input[name="problema"][data-part="${id}"]`); if (cb) cb.checked = true; }
      updateOrder();
    });

    // uma demonstração curta (menos de 5 s) para mostrar que o raio-x responde; para no primeiro toque
    let demoTimers = [], demoDone = false;
    function stopDemo() {
      if (demoDone) return; demoDone = true;
      demoTimers.forEach(clearTimeout); demoTimers = [];
      if (current === null && stage.dataset.part) apply(null, { demo: true });
    }
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => addEventListener(t, stopDemo, { once: true, passive: true }));
    if (!RM.matches) {
      demoTimers.push(setTimeout(() => { if (!demoDone) apply('bateria', { demo: true }); }, 1500));
      demoTimers.push(setTimeout(() => { if (!demoDone) apply('conector', { demo: true }); }, 3200));
      demoTimers.push(setTimeout(() => { if (!demoDone) { apply(null, { demo: true }); demoDone = true; } }, 5000));
    }
  }

  /* ---------- palavra que gira no título dos serviços (B7) ---------- */
  $$('.rotate').forEach(r => {
    const words = r.dataset.words.split('|');
    if (words.length < 2) return;
    const sr = document.createElement('span'); sr.className = 'sr';
    sr.textContent = words.slice(0, -1).join(', ') + ' e ' + words[words.length - 1];
    r.before(sr); r.setAttribute('aria-hidden', 'true');
    r.textContent = '';
    const spans = words.map((w, i) => { const s = document.createElement('span'); s.textContent = w; if (i === 0) s.className = 'on'; r.append(s); return s; });
    let cur = 0, timer = null;
    const step = () => {
      if (document.hidden || RM.matches) return;
      const prev = spans[cur]; cur = (cur + 1) % spans.length;
      prev.className = 'out'; spans[cur].className = 'on';
      setTimeout(() => { if (prev.className === 'out') prev.className = ''; }, 650);
    };
    new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (e.isIntersecting) timer = setInterval(step, 2200);
    }).observe(r);
  });

  /* ---------- entradas coreografadas ---------- */
  const revealIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; revealIO.unobserve(el);
    el.classList.add('in');
    const n = $$('.r', el).reduce((m, r) => Math.max(m, +(r.style.getPropertyValue('--i') || 0)), 0);
    setTimeout(() => el.classList.add('settled'), n * 90 + 900);
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach(el => revealIO.observe(el));

  /* ---------- cartões que viram (efeito 6) ---------- */
  const flipIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); flipIO.unobserve(e.target); }
  }), { threshold: 0.35 });
  $$('.flip').forEach(c => flipIO.observe(c));

  /* ---------- o pedido: a mensagem se monta na tela ---------- */
  const form = $('[data-order]'), previews = $$('[data-order-preview]'), send = $('[data-order-send]'), bairroBox = $('[data-bairro]'), bubble = $('.bubble');
  const listPT = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1];
  function buildMsg() {
    const fd = new FormData(form);
    const ap = fd.get('aparelho');
    const modelo = String(fd.get('modelo') || '').trim();
    const probs = fd.getAll('problema');
    const ent = fd.get('entrega');
    const bairro = String(fd.get('bairro') || '').trim();
    const nome = String(fd.get('nome') || '').trim();
    let dev;
    if (ap === 'PC ou notebook') dev = 'Meu PC ou notebook' + (modelo ? ` (${modelo})` : '');
    else if (!ap || ap === 'Outro') dev = 'Meu celular' + (modelo ? ` ${modelo}` : '');
    else dev = modelo && modelo.toLowerCase().startsWith(ap.toLowerCase()) ? `Meu ${modelo}` : `Meu ${ap}` + (modelo ? ` ${modelo}` : '');
    const prob = probs.length ? `está com: ${listPT(probs)}.` : 'precisa de conserto.';
    const entrega = ent === 'busca' ? ` Podem buscar aqui${bairro ? ` no bairro ${bairro}` : ''}?` : ent === 'loja' ? ' Vou levar na loja.' : '';
    return `Oi, Léo!${nome ? ` Sou ${nome}.` : ''} ${dev} ${prob}${entrega} Queria um orçamento.`;
  }
  let lastMsg = '';
  function updateOrder() {
    if (!form) return;
    const busca = form.querySelector('input[name="entrega"][value="busca"]').checked;
    if (bairroBox.hidden === busca) bairroBox.hidden = !busca;
    const msg = buildMsg();
    if (msg === lastMsg) return;
    lastMsg = msg;
    previews.forEach(p => { p.textContent = msg; });
    send.href = waLink(msg);
    if (!RM.matches) { bubble.classList.add('bump'); setTimeout(() => bubble.classList.remove('bump'), 180); }
  }
  if (form) {
    form.addEventListener('input', updateOrder);
    form.addEventListener('change', updateOrder);
    form.addEventListener('submit', e => { e.preventDefault(); send.click(); });
    updateOrder();
  }
})();
