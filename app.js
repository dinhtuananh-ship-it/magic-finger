// Finger Count AI - MediaPipe Hands + JS thuần
const videoEl = document.getElementById('video');
const canvasEl = document.getElementById('canvas');
const ctx = canvasEl.getContext('2d');

const bigNumberEl = document.getElementById('bigNumber');
const detailEl = document.getElementById('detail');
const leftCountEl = document.getElementById('leftCount');
const rightCountEl = document.getElementById('rightCount');
const leftFingersEl = document.getElementById('leftFingers');
const rightFingersEl = document.getElementById('rightFingers');
const statusEl = document.getElementById('status');
const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const mirrorCheckbox = document.getElementById('mirror');
const scanningOverlay = document.getElementById('scanning-overlay');

const FINGER_NAMES = ['Cái', 'Trỏ', 'Giữa', 'Áp út', 'Út'];

let hands = null;
let camera = null;
let running = false;

// Áp dụng mirror cho canvas
function applyMirror() {
  if (mirrorCheckbox.checked) {
    canvasEl.classList.add('mirror');
    videoEl.classList.add('mirror');
  } else {
    canvasEl.classList.remove('mirror');
    videoEl.classList.remove('mirror');
  }
}
mirrorCheckbox.addEventListener('change', applyMirror);
applyMirror();

/**
 * Đếm ngón tay đang giơ.
 * landmarks: 21 điểm của MediaPipe
 * handedness: 'Left' | 'Right'
 */
function countFingers(landmarks, handedness) {
  // Tip: 4,8,12,16,20 | PIP: 3,6,10,14,18
  const open = [false, false, false, false, false];

  // --- Ngón cái: so sánh trục X (vì ngón cái mở ngang) ---
  // Khi camera selfie, MediaPipe vẫn trả handedness theo ảnh gốc.
  // Logic chuẩn được dùng phổ biến:
  if (handedness === 'Right') {
    open[0] = landmarks[4].x < landmarks[3].x;
  } else {
    // Left
    open[0] = landmarks[4].x > landmarks[3].x;
  }

  // --- 4 ngón còn lại: so sánh trục Y (đầu ngón cao hơn khớp giữa là đang giơ) ---
  const pairs = [[8, 6], [12, 10], [16, 14], [20, 18]];
  for (let i = 0; i < 4; i++) {
    const [tip, pip] = pairs[i];
    open[i + 1] = landmarks[tip].y < landmarks[pip].y;
  }

  const count = open.filter(Boolean).length;
  return { count, open };
}

function fingersText(openArr) {
  const raised = [];
  openArr.forEach((isOpen, i) => {
    if (isOpen) raised.push(FINGER_NAMES[i]);
  });
  return raised.length ? 'Giơ: ' + raised.join(', ') : 'Nắm tay (0)';
}

function updateNumberWithAnimation(el, newValue) {
  if (el.textContent !== String(newValue)) {
    el.textContent = newValue;
    el.classList.remove('pop');
    void el.offsetWidth; // trigger reflow
    el.classList.add('pop');
  }
}

function onResults(results) {
  // Cập nhật kích thước canvas theo video thực tế để tránh méo ảnh trên mobile
  if (canvasEl.width !== results.image.width || canvasEl.height !== results.image.height) {
    canvasEl.width = results.image.width;
    canvasEl.height = results.image.height;
  }

  ctx.save();
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  // Vẽ ảnh camera lên canvas (để vẽ skeleton đè lên)
  ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

  let left = null, right = null;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const landmarks = results.multiHandLandmarks[i];
      const handed = results.multiHandedness[i]?.label || 'Right'; // 'Left' | 'Right'

      // Vẽ skeleton
      drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#22c55e', lineWidth: 4 });
      drawLandmarks(ctx, landmarks, { color: '#fff', lineWidth: 2, radius: 4 });

      const { count, open } = countFingers(landmarks, handed);
      const info = { count, open };

      // MediaPipe trả handedness theo ảnh gốc (chưa mirror).
      // Vì ta hiển thị mirror selfie, nên đảo lại cho đúng với mắt người dùng:
      // Tay Right trong ảnh gốc = Tay Left trên màn hình selfie? Thực tế giữ nguyên label
      // sẽ dễ hiểu hơn nếu ta map: hiển thị theo label gốc.
      if (handed === 'Left') left = info;
      else right = info;
    }
    statusEl.textContent = `Phát hiện ${results.multiHandLandmarks.length} bàn tay`;
  } else {
    statusEl.textContent = 'Đang quét... giơ tay trước camera';
  }

  // Cập nhật UI
  const leftCount = left ? left.count : null;
  const rightCount = right ? right.count : null;

  updateNumberWithAnimation(leftCountEl, leftCount !== null ? leftCount : '–');
  updateNumberWithAnimation(rightCountEl, rightCount !== null ? rightCount : '–');
  leftFingersEl.textContent = left ? fingersText(left.open) : '—';
  rightFingersEl.textContent = right ? fingersText(right.open) : '—';

  let total = 0;
  let hasHand = false;
  if (left) { total += left.count; hasHand = true; }
  if (right) { total += right.count; hasHand = true; }

  if (!hasHand) {
    updateNumberWithAnimation(bigNumberEl, '–');
    detailEl.textContent = 'Hãy bật camera và giơ tay';
  } else if (left && right) {
    updateNumberWithAnimation(bigNumberEl, total);
    detailEl.textContent = `Trái ${left.count} + Phải ${right.count} = ${total} (tổng 2 tay 0–10)`;
  } else {
    const single = left || right;
    updateNumberWithAnimation(bigNumberEl, single.count);
    detailEl.textContent = `Đang giơ ${single.count} ngón (${fingersText(single.open)})`;
  }

  ctx.restore();
}

async function initHands() {
  if (hands) return hands;
  if (typeof Hands === 'undefined') {
    throw new Error('Không tải được MediaPipe Hands. Kiểm tra mạng / CDN.');
  }
  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
  });
  hands.onResults(onResults);
  return hands;
}

btnStart.addEventListener('click', async () => {
  try {
    statusEl.textContent = 'Đang khởi động AI...';
    btnStart.disabled = true;
    await initHands();

    if (typeof Camera === 'undefined') {
      throw new Error('Không tải được camera_utils. Kiểm tra mạng.');
    }

    let isProcessing = false;
    camera = new Camera(videoEl, {
      onFrame: async () => {
        if (running && !isProcessing) {
          isProcessing = true;
          await hands.send({ image: videoEl });
          isProcessing = false;
        }
      },
      facingMode: 'user',
      width: 1280,
      height: 720
    });

    running = true;
    scanningOverlay.classList.remove('hidden');
    await camera.start();
    // video element cần play (một số trình duyệt)
    try { await videoEl.play(); } catch (e) {}

    statusEl.textContent = 'Camera đã bật — giơ tay lên!';
    btnStop.disabled = false;
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Lỗi: ' + err.message;
    detailEl.textContent = 'Mẹo: mở bằng http://localhost (không mở file://), cấp quyền camera, dùng Chrome/Edge.';
    btnStart.disabled = false;
    running = false;
    scanningOverlay.classList.add('hidden');
  }
});

btnStop.addEventListener('click', () => {
  running = false;
  try { camera?.stop(); } catch (e) {}
  const stream = videoEl.srcObject;
  if (stream) stream.getTracks().forEach(t => t.stop());
  videoEl.srcObject = null;
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  scanningOverlay.classList.add('hidden');
  statusEl.textContent = 'Đã dừng camera';
  updateNumberWithAnimation(bigNumberEl, '–');
  updateNumberWithAnimation(leftCountEl, '–');
  updateNumberWithAnimation(rightCountEl, '–');
  leftFingersEl.textContent = '—';
  rightFingersEl.textContent = '—';
  btnStart.disabled = false;
  btnStop.disabled = true;
});
