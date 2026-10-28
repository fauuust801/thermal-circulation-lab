import { renderQuiz } from './quiz.js';
import { 
  initSimulator, 
  updateVisuals, 
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
      hint.innerHTML = '您现在可以直接修改上方A/B区条件，白板动画将实时响应！';
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
    clearScene();
    scheduleStages(state, function() {
      sim.playing = false;
      sim.done = true;
      updateUI();
      showResultPanel();
    });
  }

  function skipAnim() {
    if (!sim.playing) return;
    clearTimers();
    clearScene();
    buildFinalScene(state);
    sim.playing = false;
    sim.done = true;
    updateUI();
    showResultPanel();
  }

  function openResultDrawer() {
    var h = 0, targetH = 210;
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
    exp.innerHTML = getExplanationText(state);
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
    clearScene();
    stopAnim();

    sim.playing = false;
    sim.done = false;
    sim.resultOpen = false;

    quizAnswers = [null, null, null];
    state.A = 'heat';
    state.B = 'cool';
    state.intensity = 'medium';

    resultEl.style.height = '0px';
    mainEl.style.bottom = '0px';
    $('resBody').innerHTML = '';
    $('toggleRes').innerHTML = '收起';

    refreshQuiz();
    updateUI();
  }

  function handleConditionChange(type, val) {
    if (sim.playing) return;
    if (type === 'A') state.A = val;
    if (type === 'B') state.B = val;
    if (type === 'intensity') state.intensity = val;

    updateUI();

    if (sim.done) {
      clearTimers();
      clearScene();
      buildFinalScene(state);
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

    on($('runBtn'), 'click', runModel);
    on($('skipBtn'), 'click', skipAnim);
    on($('resetBtn'), 'click', resetAll);
    on($('toggleRes'), 'click', toggleResultDrawer);
  }

  function init() {
    mainEl = $('main');
    resultEl = $('result');

    initSimulator();
    bindEvents();
    refreshQuiz();
    updateUI();
  }

  init();

})();