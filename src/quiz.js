// 预测题目配置数据
export const QUESTIONS = [
  {
    id: 0,
    text: '1. 近地面：A 处气压比 B 处',
    opts: [
      { v: 'high', t: '更高' },
      { v: 'low', t: '更低' },
      { v: 'same', t: '相同' }
    ]
  },
  {
    id: 1,
    text: '2. 高空：A 处上空气压比 B 处上空',
    opts: [
      { v: 'high', t: '更高' },
      { v: 'low', t: '更低' },
      { v: 'same', t: '相同' }
    ]
  },
  {
    id: 2,
    text: '3. 近地面水平气流的方向',
    opts: [
      { v: 'ab', t: 'A → B' },
      { v: 'ba', t: 'B → A' },
      { v: 'none', t: '无水平气流' }
    ]
  }
];

/**
 * 渲染预测题目到指定容器
 * @param {string} containerId 容器元素的ID
 * @param {Array} quizAnswers 当前用户的答案数组 [null, null, null]
 * @param {Function} isPlayingFn 获取动画是否正在播放的函数
 * @param {Function} onAnswerChange 选项改变时的回调函数 (qIdx, val) => void
 */
export function renderQuiz(containerId, quizAnswers, isPlayingFn, onAnswerChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  var html = '';
  var i, j;

  for (i = 0; i < QUESTIONS.length; i++) {
    var q = QUESTIONS[i];
    html += '<div class="quiz-item">';
    html += '<div class="qt">' + q.text + '</div>';
    html += '<div class="opts">';
    for (j = 0; j < q.opts.length; j++) {
      var opt = q.opts[j];
      var isSelected = (quizAnswers[i] === opt.v);
      html += '<button class="opt' + (isSelected ? ' active' : '') + '" data-q="' + i + '" data-v="' + opt.v + '">' + opt.t + '</button>';
    }
    html += '</div></div>';
  }
  container.innerHTML = html;

  var buttons = container.querySelectorAll('.opt');
  for (i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function () {
      if (isPlayingFn && isPlayingFn()) return;
      var qIdx = parseInt(this.getAttribute('data-q'), 10);
      var val = this.getAttribute('data-v');
      if (onAnswerChange) {
        onAnswerChange(qIdx, val);
      }
    });
  }
}