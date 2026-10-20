function keepCaptionEndingTogether(text) {
  return text.replace(/ (\S+)$/, '\u00a0$1');
}

const gallery = document.getElementById('gallery');
const viewer = document.getElementById('viewer');
const viewerImage = document.getElementById('viewer-image');
let selected = 0;
let lastTrigger;

images.forEach((item, index) => {
  const figure = document.createElement('figure');
  figure.className = 'figure';
  const button = document.createElement('button');
  button.className = 'image-button';
  button.setAttribute('aria-label', `View Fig. ${String(item.id).padStart(2, '0')}: ${item.caption}`);
  const frame = document.createElement('span');
  frame.className = 'image-frame';
  const img = document.createElement('img');
  img.src = item.thumb;
  img.alt = item.caption;
  img.width = item.width;
  img.height = item.height;
  img.loading = index < 8 ? 'eager' : 'lazy';
  img.decoding = 'async';
  frame.append(img);
  button.append(frame);
  const caption = document.createElement('figcaption');
  caption.textContent = keepCaptionEndingTogether(`Fig. ${String(item.id).padStart(2, '0')}. ${item.caption}`);
  button.addEventListener('click', () => {
    if (button.dataset.dragged === 'true') { button.dataset.dragged = 'false'; return; }
    lastTrigger = button;
    showImage(index);
    viewer.showModal();
    document.body.classList.add('viewing');
    document.getElementById('close-viewer').focus();
  });
  figure.append(button, caption);
  gallery.append(figure);
});

function showImage(index) {
  selected = (index + images.length) % images.length;
  const item = images[selected];
  viewerImage.src = item.src;
  viewerImage.alt = item.caption;
  document.getElementById('viewer-caption').textContent = keepCaptionEndingTogether(`Fig. ${String(item.id).padStart(2, '0')}. ${item.caption}`);
  document.getElementById('viewer-file').textContent = item.file;
  document.getElementById('viewer-count').textContent = `${String(item.id).padStart(2, '0')} / ${images.length}`;
}
document.getElementById('close-viewer').addEventListener('click', () => viewer.close());
document.getElementById('previous-image').addEventListener('click', () => showImage(selected - 1));
document.getElementById('next-image').addEventListener('click', () => showImage(selected + 1));
viewer.addEventListener('close', () => {
  document.body.classList.remove('viewing');
  lastTrigger?.focus({ preventScroll: true });
});
viewer.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); showImage(selected - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); showImage(selected + 1); }
});
// The masthead stays independent of the reading surface. Later chapters can
// change its typography without changing the gallery's initial ordered state.

// Reserve exactly the masthead's measured height, including its equal padding.
// This also follows any typography changes introduced by later chapters.
const masthead = document.querySelector('.masthead');
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--masthead-height', `${masthead.getBoundingClientRect().height}px`);
}).observe(masthead);

function fitTitle() {
  const title = document.querySelector('.masthead h1');
  const available = document.documentElement.clientWidth - 40;
  title.style.fontSize = `${available / 10}px`;
  const measured = title.getBoundingClientRect().width;
  if (measured > 0) title.style.fontSize = `${available / 10 * available / measured - 2}px`;
}
addEventListener('resize', fitTitle);
document.fonts.ready.then(fitTitle);
fitTitle();

const readingPanel = document.getElementById('reading-panel');
const navigationRows = [...document.querySelectorAll('.navigation li[data-section]')];
function returnToChapter(id) {
  const section = document.getElementById(id);
  if (!section) return;
  const top = section.getBoundingClientRect().top - readingPanel.getBoundingClientRect().top
    + readingPanel.scrollTop - (id === 'image-index' ? parseFloat(getComputedStyle(readingPanel).paddingTop) : 0);
  // Scroll the actual reading container, rather than the fixed page body.
  readingPanel.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  updateCurrentChapter();
}
let previousChapter;
let headingHintTimer;
function playBelongingHint() {
  clearTimeout(headingHintTimer);
  masthead.classList.remove('belonging-hint');
  void masthead.offsetWidth;
  masthead.classList.add('belonging-hint');
  headingHintTimer = setTimeout(() => masthead.classList.remove('belonging-hint'), 1100);
}
function updateCurrentChapter() {
  const sections = navigationRows.map(row => document.getElementById(row.dataset.section)).filter(Boolean);
  let active = sections[0];
  const headerHeight = masthead.getBoundingClientRect().height;
  const chapterLine = headerHeight + (innerHeight - headerHeight) * .25;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= chapterLine) active = section;
  }
  const fullBleed = active?.id === 'order-disorder';
  if (document.body.classList.contains('entropy-reading') !== fullBleed) {
    const oldTop = readingPanel.getBoundingClientRect().top;
    document.body.classList.toggle('entropy-reading', fullBleed);
    // Expand the viewport without moving the words currently being read.
    readingPanel.scrollTo({ top: readingPanel.scrollTop + readingPanel.getBoundingClientRect().top - oldTop, behavior: 'instant' });
  }
  masthead.dataset.chapter = active?.id || 'image-index';
  if (active?.id !== previousChapter) {
    if (active?.id === 'belonging') playBelongingHint();
    else {
      clearTimeout(headingHintTimer);
      masthead.classList.remove('belonging-hint');
    }
    previousChapter = active?.id;
  }
  navigationRows.forEach(row => {
    const current = row.dataset.section === active?.id;
    row.classList.toggle('current', current);
    row.querySelector('.chapter-return').hidden = !current;
    const link = row.querySelector('a');
    if (link) {
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  });
}
navigationRows.forEach(row => {
  row.querySelector('.chapter-return').addEventListener('click', () => returnToChapter(row.dataset.section));
  row.querySelector('a')?.addEventListener('click', event => {
    event.preventDefault();
    returnToChapter(row.dataset.section);
  });
});
readingPanel.addEventListener('scroll', updateCurrentChapter, { passive: true });
addEventListener('resize', updateCurrentChapter);
updateCurrentChapter();

// Each paragraph slips once as it arrives; attention brings it back into register.
const paragraphObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('has-arrived');
    else entry.target.classList.remove('has-arrived');
  });
}, { root: readingPanel, threshold: 0.12 });
document.querySelectorAll('.estranged-paragraph').forEach(paragraph => paragraphObserver.observe(paragraph));

const driftingBlocks = [...document.querySelectorAll('.derive-block')];

// Keep the original line breaks stable while tracking expands and contracts.
const chanceSection = document.getElementById('chance');
let typographyFrame;
let lineBuildFrame;
function buildDriftingLines() {
  document.querySelectorAll('.derive-body p').forEach(paragraph => {
    const text = paragraph.dataset.originalText || paragraph.textContent;
    paragraph.dataset.originalText = text;
    paragraph.replaceChildren();
    const words = text.split(/\s+/);
    const spans = words.map((word, index) => {
      const span = document.createElement('span');
      span.textContent = word + (index < words.length - 1 ? ' ' : '');
      paragraph.append(span);
      return span;
    });
    const lines = [];
    let top;
    spans.forEach(span => {
      const nextTop = span.offsetTop;
      if (top !== nextTop) { lines.push([]); top = nextTop; }
      lines[lines.length - 1].push(span.textContent);
    });
    paragraph.replaceChildren();
    lines.forEach(wordsInLine => {
      const line = document.createElement('span');
      line.className = 'derive-line';
      const lineText = wordsInLine.join('').trimEnd();
      // Some familiar words conceal a change in the surrounding paragraph.
      const pieces = lineText.split(/(\b(?:chance|drifting|encounters|habit)\b)/i);
      pieces.forEach(piece => {
        if (/^(?:chance|drifting|encounters|habit)$/i.test(piece)) {
          const button = document.createElement('button');
          button.className = 'chance-word';
          button.type = 'button';
          button.textContent = piece;
          button.setAttribute('aria-label', `${piece}: shift or restore this paragraph`);
          button.setAttribute('aria-pressed', 'false');
          button.addEventListener('click', () => {
            const block = paragraph.closest('.derive-block');
            const changed = block.classList.toggle('surprise');
            block.querySelectorAll('.chance-word').forEach(word => word.setAttribute('aria-pressed', String(changed)));
          });
          line.append(button);
        } else line.append(document.createTextNode(piece));
      });
      line.append(document.createTextNode(' '));
      paragraph.append(line);
    });
  });
  updateDriftingTypography();
}
function updateDriftingTypography() {
  const panel = readingPanel.getBoundingClientRect();
  const chapter = chanceSection.getBoundingClientRect();
  const progress = Math.max(0, Math.min(1, (panel.top - chapter.top) / Math.max(1, chapter.height - panel.height)));
  masthead.style.setProperty('--heading-drop', `${progress * 34}px`);
  masthead.style.setProperty('--heading-turn', `${progress * 2}deg`);
  driftingBlocks.forEach(block => {
    const box = block.getBoundingClientRect();
    if (box.bottom < panel.top || box.top > panel.bottom) return;
    const phase = Math.max(0, Math.min(1, (panel.bottom - box.top) / panel.height));
    const tracking = phase < .5 ? .44 * (1 - phase * 2) : -.12 * (phase * 2 - 1);
    block.style.setProperty('--reading-tracking', `${tracking.toFixed(3)}em`);
  });
}
readingPanel.addEventListener('scroll', () => {
  cancelAnimationFrame(typographyFrame);
  typographyFrame = requestAnimationFrame(updateDriftingTypography);
}, { passive: true });
addEventListener('resize', () => {
  cancelAnimationFrame(lineBuildFrame);
  lineBuildFrame = requestAnimationFrame(buildDriftingLines);
});
document.fonts.ready.then(buildDriftingLines);


const entropySection = document.getElementById('order-disorder');
const entropyUnits = [...document.querySelectorAll('.entropy-unit')];
// A quotation loses words to other locations, rather than merely changing its appearance.
const quoteDebris = document.createElement('div');
quoteDebris.className = 'quote-debris-layer';
document.body.append(quoteDebris);
const displacedQuotations = new Map();
function restoreQuotation(quote) {
  const fragments = displacedQuotations.get(quote) || [];
  fragments.forEach(({ source, loose }) => {
    source.classList.remove('word-missing');
    loose.remove();
  });
  displacedQuotations.delete(quote);
  quote.setAttribute('aria-pressed', 'false');
}
function scatterQuotation(quote) {
  const words = [...quote.querySelectorAll('.quotation-word')];
  const candidates = words.filter((word, index) => index % 2 === 0 || words.length < 7);
  const chosen = candidates.filter((word, index) => index % Math.max(1, Math.ceil(candidates.length / 18)) === 0);
  const rail = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail')) || 140;
  // Sample fresh positions on every click, including across different quotations.
  const occupied = [...quoteDebris.children].map(word => {
    const rect = word.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  const fragments = chosen.map((source, index) => {
    const origin = source.getBoundingClientRect();
    const loose = document.createElement('button');
    loose.type = 'button';
    loose.className = 'displaced-word';
    loose.textContent = source.textContent;
    loose.setAttribute('aria-label', `${source.textContent}: return words to the quotation`);
    const fontSize = Math.max(19, Math.min(38, parseFloat(getComputedStyle(quote).fontSize) * (index % 3 === 0 ? 1.3 : 1)));
    loose.style.fontSize = `${fontSize}px`;
    quoteDebris.append(loose);
    const angle = Math.random() < .18 ? (Math.random() < .5 ? -90 : 90) : (Math.random() - .5) * 64;
    const radians = angle * Math.PI / 180;
    const rotatedWidth = Math.abs(loose.offsetWidth * Math.cos(radians)) + Math.abs(loose.offsetHeight * Math.sin(radians));
    const rotatedHeight = Math.abs(loose.offsetWidth * Math.sin(radians)) + Math.abs(loose.offsetHeight * Math.cos(radians));
    const minX = Math.min(rail + 16 + rotatedWidth / 2, innerWidth / 2);
    const maxX = Math.max(minX, innerWidth - 16 - rotatedWidth / 2);
    const minY = 16 + rotatedHeight / 2;
    const maxY = Math.max(minY, innerHeight - 16 - rotatedHeight / 2);
    let landing;
    let bestDistance = -1;
    for (let attempt = 0; attempt < 14; attempt++) {
      const candidate = { x: minX + Math.random() * (maxX - minX), y: minY + Math.random() * (maxY - minY) };
      const distance = occupied.length ? Math.min(...occupied.map(point => Math.hypot(candidate.x - point.x, candidate.y - point.y))) : Infinity;
      if (distance > bestDistance) { landing = candidate; bestDistance = distance; }
      if (distance > 72) break;
    }
    occupied.push(landing);
    const x = landing.x - loose.offsetWidth / 2;
    const y = landing.y - loose.offsetHeight / 2;
    loose.style.left = `${Math.max(12, x)}px`;
    loose.style.top = `${y}px`;
    loose.style.transform = `rotate(${angle}deg)`;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      loose.animate([
        { transform: `translate(${origin.left - x}px,${origin.top - y}px) rotate(0deg)` },
        { transform: `rotate(${angle}deg)` }
      ], { duration: 750 + Math.random() * 450, easing: 'cubic-bezier(.16,.75,.25,1)' });
    }
    source.classList.add('word-missing');
    loose.addEventListener('click', () => restoreQuotation(quote));
    return { source, loose };
  });
  displacedQuotations.set(quote, fragments);
  quote.setAttribute('aria-pressed', 'true');
}
document.querySelectorAll('.quotation-trigger').forEach(quote => {
  const original = quote.textContent;
  quote.setAttribute('aria-label', `${original}: scatter or restore the words`);
  quote.replaceChildren();
  original.split(/(\s+)/).forEach(piece => {
    if (/^\s+$/.test(piece)) quote.append(document.createTextNode(piece));
    else {
      const word = document.createElement('span');
      word.className = 'quotation-word';
      word.textContent = piece;
      quote.append(word);
    }
  });
  quote.addEventListener('click', () => {
    if (displacedQuotations.has(quote)) restoreQuotation(quote);
    else scatterQuotation(quote);
  });
});
addEventListener('resize', () => [...displacedQuotations.keys()].forEach(restoreQuotation));
let entropyFrame;
function updateEntropy() {
  const panel = readingPanel.getBoundingClientRect();
  const chapter = entropySection.getBoundingClientRect();
  const progress = Math.max(0, Math.min(1, (panel.top - chapter.top) / Math.max(1, chapter.height - panel.height)));
  // The first movement continues chapter three; the descent then crosses the reading plane.
  const fall = Math.pow(progress, .65) * panel.height * .62;
  masthead.style.setProperty('--entropy-fall', `${fall}px`);
  masthead.style.setProperty('--entropy-title-angle', `${progress * -5}deg`);
  masthead.style.setProperty('--entropy-word-fall', `${progress * 65}px`);
  entropyUnits.forEach((unit, index) => {
    const rect = unit.getBoundingClientRect();
    if (rect.bottom < panel.top - 250 || rect.top > panel.bottom + 250) return;
    const amount = Math.max(0, Math.min(1, (panel.bottom - rect.top) / panel.height));
    const intensity = .25 + progress * .75;
    unit.style.setProperty('--entropy-x', `${Math.sin(index * 2.3 + amount * 2) * 68 * intensity}px`);
    unit.style.setProperty('--entropy-y', `${-amount * 75 * intensity}px`);
    unit.style.setProperty('--entropy-angle', `${Math.sin(index * 1.7) * amount * 7 * intensity}deg`);
    unit.style.setProperty('--entropy-tracking', `${Math.sin(amount * Math.PI * 2 + index) * .09 * intensity}em`);
    unit.style.setProperty('--entropy-space', `${-.16 * amount * intensity}em`);
  });
}
readingPanel.addEventListener('scroll', () => {
  cancelAnimationFrame(entropyFrame);
  entropyFrame = requestAnimationFrame(updateEntropy);
}, { passive: true });
addEventListener('resize', updateEntropy);
updateEntropy();

// Independent masses, depths and responses: no shared carousel or single drift direction.
const galleryModeButton = document.getElementById('gallery-mode');
const spaceModeButton = document.getElementById('out-of-place-mode');
const spaceHint = document.getElementById('space-hint');
const spaceCaptionLayer = document.createElement('div');
spaceCaptionLayer.className = 'space-caption-layer';
spaceCaptionLayer.setAttribute('aria-hidden', 'true');
gallery.append(spaceCaptionLayer);
const reducedSpaceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let spatialMode = false;
let spaceFrame;
let spaceLastTime = 0;
let spaceCards = [];
let sceneWidth = 0;
let sceneHeight = 0;
let spaceDrag;
const spacePointer = { x: -1000, y: -1000, inside: false };
const clampSpace = (value, min, max) => Math.max(min, Math.min(max, value));
function layoutSpace() {
  const width = gallery.clientWidth;
  const height = gallery.clientHeight;
  if (spaceCards.length) {
    spaceCards.forEach(card => {
      card.x = card.homeX = card.homeX / sceneWidth * width;
      card.y = card.homeY = card.homeY / sceneHeight * height;
      card.vx = card.vy = 0;
    });
  } else {
    spaceCards = [...gallery.querySelectorAll('.figure')].map((figure, index) => {
      const label = document.createElement('span');
      label.className = 'space-caption';
      label.textContent = figure.querySelector('figcaption').textContent;
      spaceCaptionLayer.append(label);
      const depth = Math.random();
      let landing;
      let best = -1;
      for (let attempt = 0; attempt < 10; attempt++) {
        const point = { x: 90 + Math.random() * Math.max(1,width - 180), y: 85 + Math.random() * (height - 170) };
        const distance = spaceCards.length ? Math.min(...spaceCards.map(card => Math.hypot(point.x-card.x,point.y-card.y))) : Infinity;
        if (distance > best) { landing = point; best = distance; }
      }
      const card = { figure, label, index, x:landing.x, y:landing.y, homeX:landing.x, homeY:landing.y, vx:0, vy:0,
        depth, scale:.43+depth*1.02, angle:(Math.random()-.5)*28, tiltX:(Math.random()-.5)*24, tiltY:(Math.random()-.5)*38,
        phase:Math.random()*Math.PI*2, speed:.4+Math.random()*.8, response:Math.random()<.55 ? 1 : -1, spin:Math.random()<.5 ? -1 : 1 };
      spaceCards.push(card);
      return card;
    });
  }
  sceneWidth = width;
  sceneHeight = height;
}
function drawSpace(time) {
  if (!spatialMode) return;
  const dt = Math.min(2, (time - (spaceLastTime || time-16.7))/16.7);
  spaceLastTime = time;
  const visible = gallery.getBoundingClientRect();
  const animate = visible.bottom > 0 && visible.top < innerHeight && !viewer.open;
  spaceCards.forEach(card => {
    let hover = false;
    if (animate && spaceDrag?.card !== card) {
      let fx = 0, fy = 0;
      const dx = card.x - spacePointer.x, dy = card.y - spacePointer.y;
      const distance = Math.hypot(dx,dy);
      if (spacePointer.inside && distance < 175 && !reducedSpaceMotion.matches) {
        const force = (1-distance/175) * .6 * (.35+card.depth);
        fx = (dx/Math.max(20,distance)*card.response - dy/Math.max(20,distance)*card.spin*.4)*force;
        fy = (dy/Math.max(20,distance)*card.response + dx/Math.max(20,distance)*card.spin*.4)*force;
        hover = distance < 60;
      }
      const wobble = reducedSpaceMotion.matches ? 0 : Math.sin(time*.00035*card.speed+card.phase)*3;
      card.vx = (card.vx + ((card.homeX + wobble-card.x)*.008 + fx)*dt)*Math.pow(.9,dt);
      card.vy = (card.vy + ((card.homeY + wobble*card.spin-card.y)*.008 + fy)*dt)*Math.pow(.9,dt);
      card.x = clampSpace(card.x+card.vx*dt,60,Math.max(60,sceneWidth-60));
      card.y = clampSpace(card.y+card.vy*dt,65,sceneHeight-65);
    }
    const dragged = spaceDrag?.card === card;
    card.label.style.transform = `translate(${card.x}px,${card.y}px) translate(-50%,-50%)`;
    card.label.classList.toggle('visible', dragged || card.figure.matches(':hover, :focus-within'));
    const lift = dragged ? 1.14 : hover ? 1.06 : 1;
    card.figure.style.zIndex = dragged ? 200 : String(Math.round(card.depth*50));
    card.figure.style.transform = `translate3d(${card.x}px,${card.y}px,0) translate(-50%,-50%) rotateX(${dragged?0:card.tiltX}deg) rotateY(${dragged?0:card.tiltY}deg) rotateZ(${card.angle}deg) scale(${card.scale*lift})`;
  });
  spaceFrame = requestAnimationFrame(drawSpace);
}
function setIndexMode(space) {
  if (space === spatialMode) return;
  spatialMode = space;
  galleryModeButton.setAttribute('aria-pressed',String(!space));
  spaceModeButton.setAttribute('aria-pressed',String(space));
  spaceHint.hidden = !space;
  gallery.classList.toggle('is-space',space);
  cancelAnimationFrame(spaceFrame);
  spaceLastTime = 0;
  if (space) {
    layoutSpace();
    spaceFrame = requestAnimationFrame(drawSpace);
  } else {
    spaceCards.forEach(card => { card.figure.style.transform=''; card.figure.style.zIndex=''; card.figure.classList.remove('is-dragging'); });
    spaceDrag = undefined;
  }
  updateCurrentChapter();
}
galleryModeButton.addEventListener('click',()=>setIndexMode(false));
spaceModeButton.addEventListener('click',()=>setIndexMode(true));
gallery.addEventListener('pointermove',event=>{
  if (!spatialMode) return;
  const rect = gallery.getBoundingClientRect();
  spacePointer.x=event.clientX-rect.left; spacePointer.y=event.clientY-rect.top; spacePointer.inside=true;
  if (!spaceDrag || event.pointerId!==spaceDrag.pointerId) return;
  const dx=event.clientX-spaceDrag.startX,dy=event.clientY-spaceDrag.startY;
  if (!spaceDrag.moved && Math.hypot(dx,dy)<5) return;
  spaceDrag.moved=true;
  const card=spaceDrag.card;
  const nextX=clampSpace(spaceDrag.originX+dx,65,Math.max(65,sceneWidth-65));
  const nextY=clampSpace(spaceDrag.originY+dy,65,sceneHeight-65);
  card.vx=(nextX-card.x)*.7; card.vy=(nextY-card.y)*.7;
  card.x=nextX; card.y=nextY;
  card.figure.classList.add('is-dragging');
});
gallery.addEventListener('pointerleave',()=>{spacePointer.inside=false;});
gallery.addEventListener('pointerdown',event=>{
  if (!spatialMode || event.button!==0) return;
  const button=event.target.closest('.image-button');
  if (!button) return;
  const card=spaceCards.find(card=>card.figure.contains(button));
  button.dataset.dragged='false';
  spaceDrag={card,button,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originX:card.x,originY:card.y,moved:false};
  button.setPointerCapture(event.pointerId);
});
function finishSpaceDrag(event) {
  if (!spaceDrag || event.pointerId!==spaceDrag.pointerId) return;
  const {card,button,moved}=spaceDrag;
  if (moved) {
    button.dataset.dragged='true';
    card.homeX=clampSpace(card.x+card.vx*8,70,Math.max(70,sceneWidth-70));
    card.homeY=clampSpace(card.y+card.vy*8,70,sceneHeight-70);
    card.angle=clampSpace(card.angle+card.vx*.4,-30,30);
  }
  card.figure.classList.remove('is-dragging');
  spaceDrag=undefined;
}
gallery.addEventListener('pointerup',finishSpaceDrag);
gallery.addEventListener('pointercancel',finishSpaceDrag);
gallery.addEventListener('dragstart',event=>{if(spatialMode)event.preventDefault();});
addEventListener('resize',()=>{if(spatialMode)layoutSpace();});
