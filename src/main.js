// src/main.js
import { renderQuiz } from './quiz.js';
import { 
  initSimulator, 
  updateVisuals, 
  renderTerrain,
  scheduleStages, 
  buildFinalScene, 
  clearScene, 
  clearTimers, 
  evalAnswers, 
  getExplanationText,
  stopAnim 
} from './simulator.js';

(function () {
  'use strict';

  var currentMode = 'basic';
  var currentScenarioKey = 'seaLandDay';

  var SCENARIOS = {
    seaLandDay: {
      name: '海陆风（白天）',
      desc: '白天太阳辐射下，陆地增温比海洋快，陆地气温高、海洋气温低。',
      stateA: 'cool', stateB: 'heat',
      zoneALabel: 'A: 海洋 (冷)', zoneBLabel: 'B: 陆地 (热)',
      terrain: 'sealand'
    },
    seaLandNight: {
      name: '海陆风（夜晚）',
      desc: '夜晚陆地降温比海洋快，陆地气温低、海洋气温高。',
      stateA: 'heat', stateB: 'cool',
      zoneALabel: 'A: 海洋 (热)', zoneBLabel: 'B: 陆地 (冷)',
      terrain: 'sealand'
    },
    mountainDay: {
      name: '山谷风（白天·谷风）',
      desc: '白天山坡受热快，空气增温沿山坡上升；谷地同高度增温慢。',
      stateA: 'cool', stateB: 'heat',
      zoneALabel: 'A: 谷底 (冷)', zoneBLabel: 'B: 山坡 (热)',
      terrain: 'mountain'
    },
    mountainNight: {
      name: '山谷风（夜晚·山风）',
      desc: '夜晚山坡辐射冷却迅速，冷空气沿山坡下滑注入谷底。',
      stateA: 'heat', stateB: 'cool',
      zoneALabel: 'A: 谷底 (热)', zoneBLabel: 'B: 山坡 (冷)',
      terrain: 'mountain'
    },
    urbanIsland: {
      name: '城市热岛效应',
      desc: '城区人口密集、热源多形成“热岛”；郊区气温较低。',
      stateA: 'cool', stateB: 'heat',
      zoneALabel: 'A: 郊区 (冷)', zoneBLabel: 'B: 城区 (热)',
      terrain: 'urban'
    }
  };

  var state = { A: 'heat', B: 'cool', intensity: 'medium' };
  var quizAnswers = [null, null, null];
  var sim = { playing: false, done: false, resultOpen: false };

  var mainEl, resultEl;

  function $(id) { return document.getElementById(id); }

  function on(node, ev, fn) {
    if (!node) { return; }
    if (node.addEventListener) { node.addEventListener(ev, fn, false); }
  }

  function updateUI() {
    updateVisuals(state);

    var aH = (state.A === 'heat');
    var bH = (state.B === 'heat');
    var intName = state.intensity;

    $('btnAh').className = 'seg' + (aH ? ' active-heat' : '');
    $('btnAc').className = 'seg' + (!aH ? ' active-cool' : '');
    $('btnBh').className = 'seg' + (bH ? ' active-heat' : '');
    $('btnBc').className = 'seg' + (!bH ? ' active-cool' : '');

    $('btnIntWeak').className = 'seg' + (intName === 'weak' ? ' active-intensity' : '');
    $('btnIntMed').className = 'seg' + (intName === 'medium' ? ' active-intensity' : '');
    $('btnIntStrong').className = 'seg' + (intName === 'strong' ? ' active-intensity' : '');

    var locked = sim.playing;
    $('btnAh').disabled = locked;
    $('btnAc').disabled = locked;
    $('btnBh').disabled = locked;
    $('btnBc').disabled = locked;
    $('btnIntWeak').disabled = locked;
    $('btnIntMed').disabled = locked;
    $('btnIntStrong').disabled = locked;

    var allAnswered = (quizAnswers[0] !== null && quizAnswers[1] !== null && quizAnswers[2] !== null);

    var rb = $('runBtn');
    if (sim.playing) {
      rb.innerHTML = '动画演示中…';
    } else if (sim.done) {
      rb.innerHTML = '✓ 模型已运行 (可直接修改上方条件重测)';
    } else {
      rb.innerHTML = '③ 运行模型验证';
    }
    rb.disabled = !(allAnswered && !sim.playing);

    var hint = $('runHint');
    if (sim.done) {
      hint.innerHTML = '模拟完成！您可以直接修改上方条件观察白板实时响应。';
      hint.className = 'ok';
    } else if (sim.playing) {
      hint.innerHTML = '正在演示因果演练，请观察舞台';
      hint.className = '';
    } else if (allAnswered) {
      hint.innerHTML = '预测已就绪，可以点击上方按钮运行模型';
      hint.className = 'ok';
    } else {
      hint.innerHTML = '请先完成上方全部 3 道预测题才能运行模型';
      hint.className = '';
    }

    $('skipBtn').style.display = sim.playing ? 'block' : 'none';
  }

  function runModel() {
    if (sim.playing) return;
    if (quizAnswers[0] === null || quizAnswers[1] === null || quizAnswers[2] === null) return;

    sim.playing = true;
    updateUI();
    renderTerrain(currentMode, currentScenarioKey, SCENARIOS, state, sim);
    clearScene(currentMode, currentScenarioKey, SCENARIOS, state, sim);
    
    scheduleStages(state, currentMode, currentScenarioKey, SCENARIOS, function() {
      sim.playing = false;
      sim.done = true;
      updateUI();
      showResultPanel();
    });
  }

  function skipAnim() {
    if (!sim.playing) return;
    clearTimers();
    clearScene(currentMode, currentScenarioKey, SCENARIOS, state, sim);
    buildFinalScene(state, currentMode, currentScenarioKey, SCENARIOS);
    sim.playing = false;
    sim.done = true;
    updateUI();
    showResultPanel();
  }

  function openResultDrawer() {
    var h = 0, targetH = 220;
    var iv = setInterval(function () {
      h += 15;
      if (h >= targetH) { h = targetH; clearInterval(iv); }
      resultEl.style.height = h + 'px';
      mainEl.style.bottom = h + 'px';
    }, 15);
  }

  function closeResultDrawer() {
    var h = parseInt(resultEl.style.height, 10) || 0;
    var iv = setInterval(function () {
      h -= 15;
      if (h <= 0) { h = 0; clearInterval(iv); }
      resultEl.style.height = h + 'px';
      mainEl.style.bottom = h + 'px';
    }, 15);
  }

  function toggleResultDrawer() {
    if (!sim.done) return;
    if (sim.resultOpen) {
      closeResultDrawer();
      sim.resultOpen = false;
      $('toggleRes').innerHTML = '展开';
    } else {
      openResultDrawer();
      sim.resultOpen = true;
      $('toggleRes').innerHTML = '收起';
    }
  }

  function showResultPanel() {
    var correct = evalAnswers(state);
    var names = {
      high: '更高', low: '更低', same: '相同',
      ab: 'A → B', ba: 'B → A', none: '无水平气流'
    };
    var qs = [
      '1. 近地面：A 处气压比 B 处',
      '2. 高空：A 处上空气压比 B 处上空',
      '3. 近地面水平气流方向'
    ];

    var body = $('resBody');
    body.innerHTML = '';

    var rows = [];
    var i, ok, d, html;
    for (i = 0; i < 3; i++) {
      ok = (quizAnswers[i] === correct[i]);
      html = '<span class="rq">' + qs[i] + '</span>' +
             '<span class="ry">您的预测：<b>' + names[quizAnswers[i]] + '</b></span>' +
             '<span class="rm ' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓ 正确' : '✗ 需修正') + '</span>' +
             '<span class="rr">实际规律：<b>' + names[correct[i]] + '</b></span>';
      d = document.createElement('div');
      d.className = 'resrow';
      d.style.display = 'none';
      d.innerHTML = html;
      body.appendChild(d);
      rows.push(d);
    }

    var exp = document.createElement('div');
    exp.className = 'resexp';
    exp.style.display = 'none';
    exp.innerHTML = getExplanationText(state, currentMode, currentScenarioKey);
    body.appendChild(exp);

    openResultDrawer();
    sim.resultOpen = true;
    $('toggleRes').innerHTML = '收起';

    var idx = 0;
    function revealNext() {
      if (idx < rows.length) {
        rows[idx].style.display = 'block';
        idx++;
        setTimeout(revealNext, 250);
      } else {
        exp.style.display = 'block';
      }
    }
    setTimeout(revealNext, 250);
  }

  function resetAll() {
    clearTimers();
    clearScene(currentMode, currentScenarioKey, SCENARIOS, state, sim);
    stopAnim();

    sim.playing = false;
    sim.done = false;
    sim.resultOpen = false;

    quizAnswers = [null, null, null];
    if (currentMode === 'basic') {
      state.A = 'heat';
      state.B = 'cool';
    } else {
      applyScenarioState(currentScenarioKey);
    }
    state.intensity = 'medium';

    resultEl.style.height = '0px';
    mainEl.style.bottom = '0px';
    $('resBody').innerHTML = '';
    $('toggleRes').innerHTML = '收起';

    refreshQuiz();
    renderTerrain(currentMode, currentScenarioKey, SCENARIOS, state, sim);
    updateUI();
  }

  window.switchMode = function(mode) {
    if (sim.playing) return;
    currentMode = mode;

    if (mode === 'basic') {
      $('modeBasicBtn').className = 'mode-btn active';
      $('modeScenarioBtn').className = 'mode-btn';
      $('basicCtrlCard').style.display = 'block';
      $('scenarioCtrlCard').style.display = 'none';
      state.A = 'heat';
      state.B = 'cool';
    } else {
      $('modeBasicBtn').className = 'mode-btn';
      $('modeScenarioBtn').className = 'mode-btn active';
      $('basicCtrlCard').style.display = 'none';
      $('scenarioCtrlCard').style.display = 'block';
      onScenarioChange();
    }

    quizAnswers = [null, null, null];
    renderTerrain(currentMode, currentScenarioKey, SCENARIOS, state, sim);
    refreshQuiz();
    updateUI();
    clearScene(currentMode, currentScenarioKey, SCENARIOS, state, sim);
    if (sim.done) {
      sim.done = false;
      closeResultDrawer();
    }
  };

  function onScenarioChange() {
    var selKey = $('scenarioSelect').value;
    currentScenarioKey = selKey;
    var sc = SCENARIOS[selKey];
    $('scenarioDesc').innerHTML = sc.desc;
    applyScenarioState(selKey);
    quizAnswers = [null, null, null];
    renderTerrain(currentMode, currentScenarioKey, SCENARIOS, state, sim);
    refreshQuiz();
    updateUI();
    clearScene(currentMode, currentScenarioKey, SCENARIOS, state, sim);
    if (sim.done) {
      sim.done = false;
      closeResultDrawer();
    }
  }

  function applyScenarioState(key) {
    var sc = SCENARIOS[key];
    state.A = sc.stateA;
    state.B = sc.stateB;
  }

  function handleConditionChange(type, val) {
    if (sim.playing) return;
    if (type === 'A') state.A = val;
    if (type === 'B') state.B = val;
    if (type === 'intensity') state.intensity = val;

    updateUI();
    renderTerrain(currentMode, currentScenarioKey, SCENARIOS, state, sim);

    if (sim.done) {
      clearTimers();
      clearScene(currentMode, currentScenarioKey, SCENARIOS, state, sim);
      buildFinalScene(state, currentMode, currentScenarioKey, SCENARIOS);
    }
  }

  function refreshQuiz() {
    renderQuiz('quizContainer', quizAnswers, function() {
      return sim.playing;
    }, function(qIdx, val) {
      quizAnswers[qIdx] = val;
      refreshQuiz();
      updateUI();
    });
  }

  function bindEvents() {
    on($('btnAh'), 'click', function () { handleConditionChange('A', 'heat'); });
    on($('btnAc'), 'click', function () { handleConditionChange('A', 'cool'); });
    on($('btnBh'), 'click', function () { handleConditionChange('B', 'heat'); });
    on($('btnBc'), 'click', function () { handleConditionChange('B', 'cool'); });

    on($('btnIntWeak'), 'click', function () { handleConditionChange('intensity', 'weak'); });
    on($('btnIntMed'), 'click', function () { handleConditionChange('intensity', 'medium'); });
    on($('btnIntStrong'), 'click', function () { handleConditionChange('intensity', 'strong'); });

    on($('scenarioSelect'), 'change', onScenarioChange);

    on($('runBtn'), 'click', runModel);
    on($('skipBtn'), 'click', skipAnim);
    on($('resetBtn'), 'click', resetAll);
    on($('toggleRes'), 'click', toggleResultDrawer);
  }

  function init() {
    mainEl = $('main');
    resultEl = $('result');

    initSimulator();
    renderTerrain(currentMode, currentScenarioKey, SCENARIOS, state, sim);
    bindEvents();
    refreshQuiz();
    updateUI();
  }

  init();

})();