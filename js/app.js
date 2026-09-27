/**
 * app.js
 * Application Bootstrap, Event Listeners & Main Render Loop - 60 FPS Optimized
 */

var animCanvas = document.getElementById('animCanvas');
var meshCanvas = document.getElementById('meshCanvas');
var eyeCanvas = document.getElementById('eyeCanvas');
var mouthCanvas = document.getElementById('mouthCanvas');
var overlayCanvas = document.getElementById('overlayCanvas');
var webcamVideo = document.getElementById('webcamVideo');

var meshCtx = meshCanvas.getContext('2d');
var eyeCtx = eyeCanvas.getContext('2d');
var mouthCtx = mouthCanvas.getContext('2d');
var overlayCtx = overlayCanvas.getContext('2d');

var mainRenderer = new FaceRenderer(animCanvas, '#ff6a00', '#000', 0.85);

var demoConfigs = {
  neutral: { eyeOpen: 0.85, browRaise: 0.05, browFurrow: 0, mouthOpen: 0, smile: 0, jawDrop: 0, blinkL: 0, blinkR: 0, teeth: 0 },
  smile: { eyeOpen: 0.9, browRaise: 0.2, browFurrow: 0, mouthOpen: 0.3, smile: 0.85, jawDrop: 0, blinkL: 0, blinkR: 0, teeth: 0.65 },
  surprised: { eyeOpen: 1, browRaise: 0.9, browFurrow: 0, mouthOpen: 0.9, smile: 0, jawDrop: 0.9, blinkL: 0, blinkR: 0, teeth: 0.9 },
  angry: { eyeOpen: 0.7, browRaise: 0, browFurrow: 0.9, mouthOpen: 0.2, smile: 0, jawDrop: 0, blinkL: 0, blinkR: 0, teeth: 0.35 },
  blink: { eyeOpen: 0.2, browRaise: 0, browFurrow: 0, mouthOpen: 0, smile: 0.2, jawDrop: 0, blinkL: 1, blinkR: 1, teeth: 0 }
};

var demoRenderers = {};
var demoNames = ['neutral', 'smile', 'surprised', 'angry', 'blink'];
demoNames.forEach(function (name, i) {
  var c = document.getElementById('demo-' + name);
  var r = new FaceRenderer(c, '#ff6a00', '#000', 0.72);
  r.blendshapes = Object.assign({}, demoConfigs[name]);
  r.targetBS = Object.assign({}, demoConfigs[name]);
  r.phaseOffset = i * 1.2;
  demoRenderers[name] = r;
});

function setBar(bid, vid, val) {
  var b = document.getElementById(bid), v = document.getElementById(vid);
  if (b) b.style.width = (val * 100).toFixed(1) + '%';
  if (v) v.textContent = val.toFixed(2);
}

function updateUI(bs) {
  var dt = 0.15;
  for (var k in bs) smoothBS[k] = (smoothBS[k] || 0) + (bs[k] - smoothBS[k]) * dt;
  var s = smoothBS;

  setBar('b-eye', 'v-eye', s.eyeOpen);
  setBar('b-brow', 'v-brow', s.browRaise);
  setBar('b-furrow', 'v-furrow', s.browFurrow);
  setBar('b-mouth', 'v-mouth', s.mouthOpen);
  setBar('b-smile', 'v-smile', s.smile);
  setBar('b-jaw', 'v-jaw', s.jawDrop);
  setBar('b-teeth', 'v-teeth', s.teeth);

  setBar('bs-blinkL', 'bv-blinkL', s.blinkL);
  setBar('bs-blinkR', 'bv-blinkR', s.blinkR);
  setBar('bs-browL', 'bv-browL', s.browRaise);
  setBar('bs-browR', 'bv-browR', s.browRaise);
  setBar('bs-smileL', 'bv-smileL', s.smile);
  setBar('bs-smileR', 'bv-smileR', s.smile);
  setBar('bs-mouthOpen', 'bv-mouthOpen', s.mouthOpen);
  setBar('bs-teeth', 'bv-teeth', s.teeth);

  var teethActive = s.teeth > 0.15;
  document.getElementById('teethIndicator').classList.toggle('active', teethActive);
  var ts = document.getElementById('teethStatus');
  if (teethActive) {
    ts.textContent = 'VISIBLE';
    ts.style.color = '#e8f4ff';
  } else {
    ts.textContent = '—';
    ts.style.color = '#888';
  }

  var expr = classifyExpression(s);
  document.getElementById('exprBadge').textContent = expr;
  demoNames.forEach(function (n) {
    document.getElementById('card-' + n).classList.toggle('active', n.toUpperCase() === expr);
  });
}

var fpsFrames = 0, fpsLast = performance.now();
function tickFPS() {
  fpsFrames++;
  var now = performance.now();
  if (now - fpsLast >= 1000) {
    document.getElementById('fpsCount').textContent = fpsFrames;
    fpsFrames = 0;
    fpsLast = now;
  }
}

var faceMesh = null, camera = null, running = false, currentLandmarks = [];

function initFaceMesh() {
  faceMesh = new FaceMesh({
    locateFile: function (f) {
      return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + f;
    }
  });
  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  faceMesh.onResults(function (results) {
    tickFPS();
    if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
      var lms = results.multiFaceLandmarks[0];
      currentLandmarks = lms;
      document.getElementById('landmarkCount').textContent = lms.length;
      computeBlendshapes(lms);
      mainRenderer.setBlendshapes(currentBS);
      updateUI(currentBS);
      drawMesh(lms);
      drawEyeDetail(lms);
      drawMouthDetail(lms);
      drawOverlay(lms);
    } else {
      currentLandmarks = [];
      document.getElementById('landmarkCount').textContent = '0';
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
  });
}

function startCamera() {
  if (running) return;
  running = true;
  var btn = document.getElementById('startBtn');
  btn.textContent = '⏳ Initializing...';
  btn.disabled = true;

  navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 640, height: 480 },
    audio: false
  })
    .then(function (stream) {
      webcamVideo.srcObject = stream;
      return webcamVideo.play();
    })
    .then(function () {
      initFaceMesh();
      camera = new Camera(webcamVideo, {
        onFrame: function () {
          return faceMesh.send({ image: webcamVideo });
        },
        width: 640,
        height: 480
      });
      return camera.start();
    })
    .then(function () {
      btn.textContent = '⏹ Stop Camera';
      btn.disabled = false;
      btn.onclick = stopCamera;
      document.getElementById('statusDot').classList.remove('off');
      document.getElementById('statusText').textContent = 'LIVE';
    })
    .catch(function (err) {
      console.error(err);
      btn.textContent = '✕ Error — Retry';
      btn.disabled = false;
      btn.onclick = startCamera;
      running = false;
    });
}

function stopCamera() {
  if (camera) { camera.stop(); camera = null; }
  if (webcamVideo.srcObject) {
    webcamVideo.srcObject.getTracks().forEach(function (t) { t.stop(); });
    webcamVideo.srcObject = null;
  }
  if (faceMesh) { faceMesh.close(); faceMesh = null; }
  running = false;
  var btn = document.getElementById('startBtn');
  btn.textContent = '▶ Start Camera';
  btn.onclick = startCamera;
  document.getElementById('statusDot').classList.add('off');
  document.getElementById('statusText').textContent = 'OFFLINE';
  currentLandmarks = [];
}

document.getElementById('startBtn').onclick = startCamera;

var animTime = 0;
function resize(c) {
  var dw = c.offsetWidth * devicePixelRatio;
  var dh = c.offsetHeight * devicePixelRatio;
  if (c.width !== dw || c.height !== dh) {
    c.width = dw;
    c.height = dh;
  }
}

function loop() {
  requestAnimationFrame(loop);
  animTime += 0.016;
  resize(animCanvas);
  demoNames.forEach(function (n) {
    resize(demoRenderers[n].canvas);
  });
  var mw = meshCanvas.offsetWidth * devicePixelRatio;
  var mh = meshCanvas.offsetHeight * devicePixelRatio;
  if (meshCanvas.width !== mw || meshCanvas.height !== mh) {
    meshCanvas.width = mw;
    meshCanvas.height = mh;
  }

  if (!running || !currentLandmarks.length) {
    mainRenderer.rotY = Math.sin(animTime * 0.4) * 0.15;
    mainRenderer.rotX = Math.sin(animTime * 0.3) * 0.05;
    var blinkP = animTime % 4 < 0.12 ? 1 : 0;
    mainRenderer.setBlendshapes({
      eyeOpen: 0.85 + Math.sin(animTime * 2.3) * 0.02,
      browRaise: 0,
      browFurrow: 0,
      mouthOpen: 0,
      smile: 0.1 + Math.sin(animTime * 1.1) * 0.05,
      jawDrop: 0,
      blinkL: blinkP,
      blinkR: blinkP,
      teeth: 0
    });
  } else {
    mainRenderer.rotY *= 0.92;
    mainRenderer.rotX *= 0.92;
  }
  mainRenderer.update();
  mainRenderer.draw();

  demoNames.forEach(function (name) {
    var r = demoRenderers[name];
    r.rotY = Math.sin(animTime * 0.5 + r.phaseOffset) * 0.08;
    r.update();
    r.draw();
  });
}

loop();
