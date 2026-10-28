// src/simulator.js
const NS = 'http://www.w3.org/2000/svg';

let svg, terrainGroup, tempTextA, tempTextB;
let glowA, glowB;
let flowG, labelG, captionG, isobarG;
let glowFactor = 1.0, glowGrowing = true;

let timeouts = [];
let intervals = [];
let animTimer = null;
let glowTimer = null;
let particles = [];

function $(id) { return document.getElementById(id); }

function el(tag, attrs, parent) {
  var e = document.createElementNS(NS, tag);
  var k;
  if (attrs) {
    for (k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) {
        e.setAttribute(k, attrs[k]);
      }
    }
  }
  if (parent) { parent.appendChild(e); }
  return e;
}

function clear(node) {
  while (node.firstChild) { node.removeChild(node.firstChild); }
}

function fadeTo(node, target, dur, cb) {
  var start = parseFloat(node.getAttribute('opacity') || '0');
  if (isNaN(start)) { start = 0; }
  var steps = Math.max(1, Math.round(dur / 40));
  var i = 0;
  var iv = setInterval(function () {
    if (!node.parentNode) { clearInterval(iv); return; }
    i++;
    var v = start + (target - start) * i / steps;
    if (i >= steps) {
      v = target;
      clearInterval(iv);
      if (cb) { cb(); }
    }
    node.setAttribute('opacity', v.toFixed(3));
  }, 40);
  intervals.push(iv);
  return iv;
}

export function getTerrainConfig(currentMode, currentScenarioKey, SCENARIOS) {
  var terrainType = 'flat';
  if (currentMode === 'scenario') {
    terrainType = SCENARIOS[currentScenarioKey].terrain;
  }
  if (terrainType === 'mountain') {
    return {
      type: 'mountain',
      ax: 450, ay: 500, aLabelY: 535, tempAy: 565,
      bx: 225, by: 430, bLabelY: 410, tempBy: 385,
      surfY: 360, upperY: 130
    };
  } else {
    return {
      type: terrainType,
      ax: 225, ay: 460, aLabelY: 500, tempAy: 545,
      bx: 675, by: 460, bLabelY: 500, tempBy: 545,
      surfY: 380, upperY: 140
    };
  }
}

export function initSimulator() {
  svg = $('svg');
  buildBase();
}

function buildBase() {
  clear(svg);
  el('rect', { x: 0, y: 0, width: 900, height: 460, fill: '#f4f9fd' }, svg);
  terrainGroup = el('g', {}, svg);

  isobarG = el('g', {}, svg);
  flowG = el('g', {}, svg);
  labelG = el('g', {}, svg);
  captionG = el('g', {}, svg);
}

export function renderTerrain(currentMode, currentScenarioKey, SCENARIOS, state, sim) {
  if (!terrainGroup) return;
  clear(terrainGroup);
  var cfg = getTerrainConfig(currentMode, currentScenarioKey, SCENARIOS);
  var aH = (state.A === 'heat');
  var bH = (state.B === 'heat');
  
  // 未运行时默认隐藏气团 (opacity: 0)，运行后显示 (0.25)
  var initialGlowOpacity = (sim.playing || sim.done) ? '0.25' : '0';

  if (cfg.type === 'sealand') {
    el('rect', { x: 0, y: 460, width: 450, height: 140, fill: '#85c1e9', stroke: '#2980b9', 'stroke-width': 2 }, terrainGroup);
    el('rect', { x: 450, y: 460, width: 450, height: 140, fill: '#d5dbdb', stroke: '#a8987c', 'stroke-width': 2 }, terrainGroup);
    
    for (var w = 100; w < 400; w += 80) {
      el('path', { d: 'M ' + w + ' 510 Q ' + (w+20) + ' 500, ' + (w+40) + ' 510', stroke: '#fff', 'stroke-width': '2.5', fill: 'none', opacity: '0.6' }, terrainGroup);
    }
    el('line', { x1: 450, y1: 460, x2: 450, y2: 600, stroke: '#1b4f72', 'stroke-width': 3, 'stroke-dasharray': '4 4' }, terrainGroup);

    glowA = el('circle', { cx: cfg.ax, cy: cfg.ay, r: 45, fill: aH ? '#e74c3c' : '#3498db', opacity: initialGlowOpacity }, terrainGroup);
    glowB = el('circle', { cx: cfg.bx, cy: cfg.by, r: 45, fill: bH ? '#e74c3c' : '#3498db', opacity: initialGlowOpacity }, terrainGroup);

    el('line', { x1: 40, y1: cfg.upperY, x2: 860, y2: cfg.upperY, stroke: '#9fb6c9', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, terrainGroup);
    el('line', { x1: 40, y1: cfg.surfY, x2: 860, y2: cfg.surfY, stroke: '#9fb6c9', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, terrainGroup);

    var sc = SCENARIOS[currentScenarioKey];
    var t1 = el('text', { id: 'labelAText', x: cfg.ax, y: cfg.aLabelY, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 'bold', fill: '#1b4f72' }, terrainGroup);
    t1.textContent = sc.zoneALabel;
    var t2 = el('text', { id: 'labelBText', x: cfg.bx, y: cfg.bLabelY, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 'bold', fill: '#5b4a33' }, terrainGroup);
    t2.textContent = sc.zoneBLabel;

    tempTextA = el('text', { x: cfg.ax, y: cfg.tempAy, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 'bold' }, terrainGroup);
    tempTextB = el('text', { x: cfg.bx, y: cfg.tempBy, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 'bold' }, terrainGroup);

  } else if (cfg.type === 'mountain') {
    var groundPathData = 'M 0 600 L 0 400 Q 225 480, 450 530 Q 675 480, 900 400 L 900 600 Z';
    el('path', { d: groundPathData, fill: '#c2b292', stroke: '#8c7853', 'stroke-width': 3 }, terrainGroup);

    el('line', { x1: 40, y1: cfg.upperY, x2: 860, y2: cfg.upperY, stroke: '#9fb6c9', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, terrainGroup);
    el('line', { x1: 100, y1: cfg.surfY, x2: 800, y2: cfg.surfY, stroke: '#9fb6c9', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, terrainGroup);

    glowA = el('circle', { cx: cfg.ax, cy: cfg.ay, r: 40, fill: aH ? '#e74c3c' : '#3498db', opacity: initialGlowOpacity }, terrainGroup);
    glowB = el('circle', { cx: cfg.bx, cy: cfg.by, r: 35, fill: bH ? '#e74c3c' : '#3498db', opacity: initialGlowOpacity }, terrainGroup);

    var sc2 = SCENARIOS[currentScenarioKey];
    var ta = el('text', { id: 'labelAText', x: cfg.ax, y: cfg.aLabelY, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 'bold', fill: '#5b4a33' }, terrainGroup);
    ta.textContent = sc2.zoneALabel;
    var tb = el('text', { id: 'labelBText', x: cfg.bx, y: cfg.bLabelY, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 'bold', fill: '#5b4a33' }, terrainGroup);
    tb.textContent = sc2.zoneBLabel;

    tempTextA = el('text', { x: cfg.ax, y: cfg.tempAy, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 'bold' }, terrainGroup);
    tempTextB = el('text', { x: cfg.bx, y: cfg.tempBy, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 'bold' }, terrainGroup);

  } else {
    el('rect', { x: 0, y: 460, width: 900, height: 140, fill: '#d5dbdb', stroke: '#a8987c', 'stroke-width': 2 }, terrainGroup);
    el('line', { x1: 450, y1: 460, x2: 450, y2: 600, stroke: '#a8987c', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, terrainGroup);

    glowA = el('circle', { cx: cfg.ax, cy: cfg.ay, r: 45, fill: aH ? '#e74c3c' : '#3498db', opacity: initialGlowOpacity }, terrainGroup);
    glowB = el('circle', { cx: cfg.bx, cy: cfg.by, r: 45, fill: bH ? '#e74c3c' : '#3498db', opacity: initialGlowOpacity }, terrainGroup);

    el('line', { x1: 40, y1: cfg.upperY, x2: 860, y2: cfg.upperY, stroke: '#9fb6c9', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, terrainGroup);
    el('line', { x1: 40, y1: cfg.surfY, x2: 860, y2: cfg.surfY, stroke: '#9fb6c9', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, terrainGroup);

    var labelAName = 'A: 地面', labelBName = 'B: 地面';
    if (currentMode === 'scenario') {
      labelAName = SCENARIOS[currentScenarioKey].zoneALabel;
      labelBName = SCENARIOS[currentScenarioKey].zoneBLabel;
    }

    var t1_ = el('text', { id: 'labelAText', x: cfg.ax, y: cfg.aLabelY, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 'bold', fill: '#5b4a33' }, terrainGroup);
    t1_.textContent = labelAName;
    var t2_ = el('text', { id: 'labelBText', x: cfg.bx, y: cfg.bLabelY, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 'bold', fill: '#5b4a33' }, terrainGroup);
    t2_.textContent = labelBName;

    tempTextA = el('text', { x: cfg.ax, y: cfg.tempAy, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 'bold' }, terrainGroup);
    tempTextB = el('text', { x: cfg.bx, y: cfg.tempBy, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 'bold' }, terrainGroup);
  }
}

export function updateVisuals(state) {
  var aH = (state.A === 'heat');
  var bH = (state.B === 'heat');

  if (tempTextA && tempTextB) {
    tempTextA.textContent = aH ? '受热 (暖)' : '冷却 (冷)';
    tempTextA.setAttribute('fill', aH ? '#c0392b' : '#1f5fa8');
    tempTextB.textContent = bH ? '受热 (暖)' : '冷却 (冷)';
    tempTextB.setAttribute('fill', bH ? '#c0392b' : '#1f5fa8');
  }
}

function drawIsobars(state, currentMode, currentScenarioKey, SCENARIOS, fade) {
  clear(isobarG);
  var aH = (state.A === 'heat');
  var bH = (state.B === 'heat');
  if (aH === bH) return;

  var cfg = getTerrainConfig(currentMode, currentScenarioKey, SCENARIOS);
  var g = el('g', {}, isobarG);
  if (fade) g.setAttribute('opacity', '0');

  var pathDataSurf = '';
  var pathDataUpper = '';

  if (cfg.type === 'mountain') {
    if (aH) {
      pathDataSurf = 'M 100 360 Q 450 395, 800 360';
      pathDataUpper = 'M 100 130 Q 450 100, 800 130';
    } else {
      pathDataSurf = 'M 100 360 Q 450 325, 800 360';
      pathDataUpper = 'M 100 130 Q 450 160, 800 130';
    }
  } else {
    if (aH) {
      pathDataSurf = 'M 100 380 Q 225 415, 450 380 T 800 380';
      pathDataUpper = 'M 100 140 Q 225 105, 450 140 T 800 140';
    } else {
      pathDataSurf = 'M 100 380 Q 225 345, 450 380 T 800 380';
      pathDataUpper = 'M 100 140 Q 225 175, 450 140 T 800 140';
    }
  }

  el('path', { d: pathDataSurf, stroke: '#e67e22', 'stroke-width': '3', 'stroke-dasharray': '6 6', fill: 'none' }, g);
  el('path', { d: pathDataUpper, stroke: '#3498db', 'stroke-width': '3', 'stroke-dasharray': '6 6', fill: 'none' }, g);

  var tSurf = el('text', { x: 710, y: aH ? 340 : 395, 'font-size': '13', fill: '#e67e22', 'font-weight': 'bold' }, g);
  tSurf.textContent = '近地面等压面弯曲';

  var tUpper = el('text', { x: 710, y: aH ? 110 : 155, 'font-size': '13', fill: '#3498db', 'font-weight': 'bold' }, g);
  tUpper.textContent = '高空等压面弯曲';

  if (fade) { fadeTo(g, 0.9, 300); } else { g.setAttribute('opacity', '0.9'); }
}

function startGlowAnimation() {
  if (glowA) glowA.setAttribute('opacity', '0.25');
  if (glowB) glowB.setAttribute('opacity', '0.25');
  if (glowTimer) clearInterval(glowTimer);
  glowTimer = setInterval(function() {
    if (glowGrowing) {
      glowFactor += 0.02;
      if (glowFactor >= 1.25) glowGrowing = false;
    } else {
      glowFactor -= 0.02;
      if (glowFactor <= 0.85) glowGrowing = true;
    }
    if (glowA && glowB) {
      glowA.setAttribute('r', (42 * glowFactor));
      glowB.setAttribute('r', (42 * (2 - glowFactor)));
    }
  }, 120);
  intervals.push(glowTimer);
}

function ensureAnim() {
  if (!animTimer) {
    animTimer = setInterval(tick, 35);
  }
}

export function stopAnim() {
  if (animTimer) { clearInterval(animTimer); animTimer = null; }
  if (glowTimer) { clearInterval(glowTimer); glowTimer = null; }
}

function tick() {
  var i, p, pos;
  for (i = 0; i < particles.length; i++) {
    p = particles[i];
    var dynamicSpeed = p.baseSpeed;
    if (p.zoneType === 'rising') {
      dynamicSpeed *= 2.2;
    } else if (p.zoneType === 'sinking') {
      dynamicSpeed *= 0.5;
    } else {
      dynamicSpeed *= 1.2;
    }

    p.phase += dynamicSpeed * 3.5;
    if (p.phase < 0) { p.phase += p.path.total; }
    pos = pointAt(p.path, p.phase);
    p.el.setAttribute('cx', pos[0].toFixed(2));
    p.el.setAttribute('cy', pos[1].toFixed(2));
  }
}

export function clearParticles() {
  var i;
  for (i = 0; i < particles.length; i++) {
    if (particles[i].el.parentNode) {
      particles[i].el.parentNode.removeChild(particles[i].el);
    }
  }
  particles = [];
}

function getBaseSpeed(intensity) {
  if (intensity === 'weak') return 1.0;
  if (intensity === 'strong') return 2.8;
  return 1.8;
}

function addVerticalParticles(x, y1, y2, up, count, intensity) {
  var pts = up ? [[x, y1], [x, y2]] : [[x, y2], [x, y1]];
  var path = buildPath(pts, false);
  var i, c;
  var spd = getBaseSpeed(intensity);
  var zType = up ? 'rising' : 'sinking';
  for (i = 0; i < count; i++) {
    c = el('circle', { r: up ? 6.5 : 5.5, fill: up ? '#e8663c' : '#3b7dd8', opacity: '0.95' }, flowG);
    particles.push({ el: c, path: path, phase: path.total * i / count, baseSpeed: spd, zoneType: zType });
  }
  ensureAnim();
}

function addHorizParticles(x1, x2, y, count, intensity) {
  var pts = [[x1, y], [x2, y]];
  var path = buildPath(pts, false);
  var i, c;
  var spd = getBaseSpeed(intensity);
  for (i = 0; i < count; i++) {
    c = el('circle', { r: 6, fill: '#3d7fd6', opacity: '0.95' }, flowG);
    particles.push({ el: c, path: path, phase: path.total * i / count, baseSpeed: spd, zoneType: 'horiz' });
  }
  ensureAnim();
}

function addLoopParticles(cw, count, intensity, currentMode, currentScenarioKey, SCENARIOS) {
  var cfg = getTerrainConfig(currentMode, currentScenarioKey, SCENARIOS);
  var pts = [];
  if (cfg.type === 'mountain') {
    pts = [
      [450, 500], [330, 465], [225, 430],
      [225, 130], [450, 130], [675, 130],
      [675, 430], [570, 465], [450, 500]
    ];
  } else {
    pts = roundedRectPoints(225, cfg.upperY, 675, cfg.surfY, 50);
  }
  if (!cw) { pts.reverse(); }
  var path = buildPath(pts, true);
  var i, c;
  var spd = getBaseSpeed(intensity);
  for (i = 0; i < count; i++) {
    c = el('circle', { r: 6, fill: '#2f6fc4', opacity: '0.95' }, flowG);
    particles.push({ el: c, path: path, phase: path.total * i / count, baseSpeed: spd, zoneType: 'loop' });
  }
  ensureAnim();
}

export function clearScene(currentMode, currentScenarioKey, SCENARIOS, state, sim) {
  clearParticles();
  stopAnim();
  if (flowG) { clear(flowG); }
  if (labelG) { clear(labelG); }
  if (captionG) { clear(captionG); }
  if (isobarG) { clear(isobarG); }
  renderTerrain(currentMode, currentScenarioKey, SCENARIOS, state, sim);
}

function showCaption(text) {
  clear(captionG);
  var w = 580, h = 46;
  var x = 450 - w / 2, y = 12;
  var bg = el('rect', { x: x, y: y, width: w, height: h, rx: 8, fill: '#1e4e79', opacity: '0' }, captionG);
  var t = el('text', { x: 450, y: y + 29, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 'bold', fill: '#fff', opacity: '0' }, captionG);
  t.textContent = text;
  fadeTo(bg, 0.95, 200);
  fadeTo(t, 1, 200);
}

function pulseGround() {
  var r = el('rect', { x: 100, y: 360, width: 700, height: 180, fill: '#ff5a2a', opacity: '0' }, flowG);
  fadeTo(r, 0.3, 300, function () {
    fadeTo(r, 0, 400, function () {
      if (r.parentNode) r.parentNode.removeChild(r);
    });
  });
}

function addPressureLabel(x, y, text, isHigh, fade) {
  var w = 96, h = 36;
  var g = el('g', {}, labelG);
  if (fade) { g.setAttribute('opacity', '0'); }
  el('rect', {
    x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 6,
    fill: '#ffffff',
    stroke: isHigh ? '#c0392b' : '#2471a3',
    'stroke-width': 3
  }, g);
  var t = el('text', {
    x: x, y: y + 6, 'text-anchor': 'middle',
    'font-size': 18, 'font-weight': 'bold',
    fill: isHigh ? '#c0392b' : '#2471a3'
  }, g);
  t.textContent = text;
  if (fade) { fadeTo(g, 1, 300); }
}

function buildLabels(state, currentMode, currentScenarioKey, SCENARIOS, fade) {
  clear(labelG);
  var aH = (state.A === 'heat');
  var bH = (state.B === 'heat');
  var cfg = getTerrainConfig(currentMode, currentScenarioKey, SCENARIOS);

  addPressureLabel(cfg.ax, cfg.type === 'mountain' ? 465 : 400, aH ? '低压' : '高压', !aH, fade);
  addPressureLabel(cfg.ax, cfg.upperY - 35, aH ? '高压' : '低压', aH, fade);

  addPressureLabel(cfg.bx, cfg.type === 'mountain' ? 395 : 400, bH ? '低压' : '高压', !bH, fade);
  addPressureLabel(cfg.bx, cfg.upperY - 35, bH ? '高压' : '低压', !bH, fade);
}

function arrow(x, y, dir, fade, color) {
  var pts, s;
  if (dir === 'up') {
    pts = [[x, y - 14], [x - 12, y + 10], [x + 12, y + 10]];
  } else if (dir === 'down') {
    pts = [[x, y + 14], [x - 12, y - 10], [x + 12, y - 10]];
  } else if (dir === 'left') {
    pts = [[x - 14, y], [x + 10, y - 12], [x + 10, y + 12]];
  } else {
    pts = [[x + 14, y], [x - 10, y - 12], [x - 10, y + 12]];
  }
  s = pts[0][0] + ',' + pts[0][1] + ' ' + pts[1][0] + ',' + pts[1][1] + ' ' + pts[2][0] + ',' + pts[2][1];
  var poly = el('polygon', { points: s, fill: color || '#3d7fd6', opacity: fade ? '0' : '0.9' }, flowG);
  if (fade) { fadeTo(poly, 0.9, 250); }
  return poly;
}

export function clearTimers() {
  var i;
  for (i = 0; i < timeouts.length; i++) { clearTimeout(timeouts[i]); }
  for (i = 0; i < intervals.length; i++) { clearInterval(intervals[i]); }
  timeouts = [];
  intervals = [];
}

export function scheduleStages(state, currentMode, currentScenarioKey, SCENARIOS, onComplete) {
  var cfg = getTerrainConfig(currentMode, currentScenarioKey, SCENARIOS);
  var aH = (state.A === 'heat');
  var bH = (state.B === 'heat');
  var same = (aH === bH);

  startGlowAnimation();

  timeouts.push(setTimeout(function () {
    showCaption('① 地面冷热不均（受热区粒子上升快，冷却区下沉慢）');
    pulseGround();
  }, 0));

  timeouts.push(setTimeout(function () {
    showCaption('② 空气垂直运动（受热区膨胀上升冲力强，冷却区收缩下沉平缓）');
    arrow(cfg.ax, cfg.type === 'mountain' ? 460 : 260, aH ? 'up' : 'down', true, aH ? '#e8663c' : '#3b7dd8');
    addVerticalParticles(cfg.ax, cfg.type === 'mountain' ? 500 : cfg.surfY, cfg.upperY, aH, 6, state.intensity);
    arrow(cfg.bx, cfg.type === 'mountain' ? 390 : 260, bH ? 'up' : 'down', true, bH ? '#e8663c' : '#3b7dd8');
    addVerticalParticles(cfg.bx, cfg.type === 'mountain' ? 430 : cfg.surfY, cfg.upperY, bH, 6, state.intensity);
  }, 900));

  timeouts.push(setTimeout(function () {
    if (same) {
      showCaption('③ 气压同时变化，同一水平面无气压差');
    } else {
      showCaption('③ 形成气压差并带动高低空等压面弯曲（见虚线）');
    }
    buildLabels(state, currentMode, currentScenarioKey, SCENARIOS, true);
    drawIsobars(state, currentMode, currentScenarioKey, SCENARIOS, true);
  }, 2400));

  timeouts.push(setTimeout(function () {
    if (same) {
      showCaption('④ 无水平气压梯度，空气不发生水平运动');
    } else {
      showCaption('④ 水平气流（高压流向低压，气流受热/冷影响速率不同）');
      var cw = aH;
      if (cw) {
        arrow(450, cfg.upperY, 'right', true, '#3d7fd6');
        addHorizParticles(cfg.ax, cfg.bx, cfg.upperY, 6, state.intensity);
        arrow(450, cfg.surfY - 40, 'left', true, '#3d7fd6');
        addHorizParticles(cfg.bx, cfg.ax, cfg.surfY - 40, 6, state.intensity);
      } else {
        arrow(450, cfg.upperY, 'left', true, '#3d7fd6');
        addHorizParticles(cfg.bx, cfg.ax, cfg.upperY, 6, state.intensity);
        arrow(450, cfg.surfY - 40, 'right', true, '#3d7fd6');
        addHorizParticles(cfg.ax, cfg.bx, cfg.surfY - 40, 6, state.intensity);
      }
    }
  }, 3800));

  timeouts.push(setTimeout(function () {
    if (same) {
      showCaption('⑤ 未形成闭合热力环流');
    } else {
      showCaption('⑤ 首尾相接，形成动态闭合热力环流系统');
      clearParticles();
      addLoopParticles(aH, 12, state.intensity, currentMode, currentScenarioKey, SCENARIOS);
    }
  }, 5200));

  timeouts.push(setTimeout(function () {
    if (onComplete) onComplete();
  }, 6200));
}

export function buildFinalScene(state, currentMode, currentScenarioKey, SCENARIOS) {
  var cfg = getTerrainConfig(currentMode, currentScenarioKey, SCENARIOS);
  var aH = (state.A === 'heat');
  var bH = (state.B === 'heat');
  var same = (aH === bH);

  startGlowAnimation();
  arrow(cfg.ax, cfg.type === 'mountain' ? 460 : 260, aH ? 'up' : 'down', false, aH ? '#e8663c' : '#3b7dd8');
  arrow(cfg.bx, cfg.type === 'mountain' ? 390 : 260, bH ? 'up' : 'down', false, bH ? '#3498db' : '#3498db');

  if (!same) {
    var cw = aH;
    if (cw) {
      arrow(450, cfg.upperY, 'right', false, '#3d7fd6');
      arrow(450, cfg.surfY - 40, 'left', false, '#3d7fd6');
    } else {
      arrow(450, cfg.upperY, 'left', false, '#3d7fd6');
      arrow(450, cfg.surfY - 40, 'right', false, '#3d7fd6');
    }
  }
  buildLabels(state, currentMode, currentScenarioKey, SCENARIOS, false);
  drawIsobars(state, currentMode, currentScenarioKey, SCENARIOS, false);
  if (same) {
    addVerticalParticles(cfg.ax, cfg.type === 'mountain' ? 500 : cfg.surfY, cfg.upperY, aH, 6, state.intensity);
    addVerticalParticles(cfg.bx, cfg.type === 'mountain' ? 430 : cfg.surfY, cfg.upperY, bH, 6, state.intensity);
  } else {
    addLoopParticles(aH, 12, state.intensity, currentMode, currentScenarioKey, SCENARIOS);
  }
}

export function evalAnswers(state) {
  var aH = (state.A === 'heat');
  var bH = (state.B === 'heat');
  if (aH === bH) return ['same', 'same', 'none'];
  if (aH) return ['low', 'high', 'ba'];
  return ['high', 'low', 'ab'];
}

export function getExplanationText(state, currentMode, currentScenarioKey) {
  if (currentMode === 'scenario') {
    if (currentScenarioKey === 'seaLandDay') {
      return '<strong>【海陆风·白天原理解析】</strong><br>白天陆地增温快，气温高、气压低（上升气流）；海洋增温慢，气温低、气压高（下沉气流）。近地面气流由气压高的<strong>海洋吹向陆地</strong>，形成“海风”。';
    } else if (currentScenarioKey === 'seaLandNight') {
      return '<strong>【海陆风·夜晚原理解析】</strong><br>夜晚陆地降温快，气温低、气压高（下沉气流）；海洋降温慢，气温高、气压低（上升气流）。近地面气流由气压高的<strong>陆地吹向海洋</strong>，形成“陆风”。';
    } else if (currentScenarioKey === 'mountainDay') {
      return '<strong>【山谷风·白天谷风原理解析】</strong><br>白天山坡受热快，空气增温沿山坡上升，形成低压；谷底同高度空气增温较慢，形成高压。近地面风由<strong>谷底吹向山坡</strong>，称为“谷风”。';
    } else if (currentScenarioKey === 'mountainNight') {
      return '<strong>【山谷风·夜晚山风原理解析】</strong><br>夜晚山坡辐射冷却迅速，冷空气沿山坡下滑注入谷底，形成高压；谷底气温相对较高，形成低压。近地面风由<strong>山坡吹向谷底</strong>，称为“山风”。';
    } else if (currentScenarioKey === 'urbanIsland') {
      return '<strong>【城市热岛效应原理解析】</strong><br>城区由于热岛效应气温高、气流上升形成低压；郊区气温较低、气流下沉形成高压。近地面气流由<strong>郊区吹向城区</strong>。';
    }
  }

  var aH = (state.A === 'heat');
  var bH = (state.B === 'heat');
  if (aH === bH) {
    return '当前两侧地面受热情况相同，空气垂直运动趋势一致，同一水平面上气压处处相等，不存在水平气压梯度力，因此无法形成热力环流。<br><strong>核心规律：</strong>热力环流形成的根本原因是地面冷热不均。';
  }

  var hot = aH ? 'A' : 'B';
  var cold = aH ? 'B' : 'A';
  var s = '';
  s += '① <strong>地面受热不均与速度差</strong>：' + hot + ' 区地面受热，空气迅速膨胀上升（粒子运动快）；' + cold + ' 区地面冷却，空气收缩缓慢下沉（粒子运动慢）。<br>';
  s += '② <strong>等压面弯曲与气压对比</strong>：受热区近地面等压面向下凹陷形成<strong>相对低压</strong>，高空向上凸起形成<strong>相对高压</strong>；冷却区则相反。<br>';
  s += '③ <strong>水平气流驱动</strong>：同一水平面上，气流总是由<strong>高压流向低压</strong>。<br>';
  s += '④ <strong>形成环流</strong>：垂直运动与水平气流首尾相接，构成了闭合的热力环流。';
  return s;
}