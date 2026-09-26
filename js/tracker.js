/**
 * tracker.js
 * MediaPipe Face Mesh Landmark Analysis, Blendshapes & Teeth Detection
 */

var LM = {
  leftEyeTop: 159, leftEyeBot: 145, leftEyeL: 33, leftEyeR: 133,
  rightEyeTop: 386, rightEyeBot: 374, rightEyeL: 362, rightEyeR: 263,
  leftBrowTop: 105, rightBrowTop: 334,
  mouthTop: 13, mouthBot: 14, mouthL: 61, mouthR: 291,
  innerLipTop: 12, innerLipBot: 15,
  innerLipTopL: 11, innerLipTopR: 13,
  innerLipBotL: 16, innerLipBotR: 14,
  chin: 152, forehead: 10, noseTip: 4
};

var UPPER_TEETH_LMS = [11, 12, 13];
var LOWER_TEETH_LMS = [14, 15, 16];

var FACE_EDGES = [
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454],
  [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400],
  [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
  [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54],
  [54, 103], [103, 67], [67, 109], [109, 10],
  [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154], [154, 155], [155, 133],
  [33, 246], [246, 161], [161, 160], [160, 159], [159, 158], [158, 157], [157, 173], [173, 133],
  [362, 382], [382, 381], [381, 380], [380, 374], [374, 373], [373, 390], [390, 249], [249, 263],
  [466, 388], [388, 387], [387, 386], [386, 385], [385, 384], [384, 398], [398, 362],
  [168, 6], [6, 197], [197, 195], [195, 5], [5, 4], [4, 1], [1, 19], [19, 94], [94, 2],
  [61, 185], [185, 40], [40, 39], [39, 37], [37, 0], [0, 267], [267, 269], [269, 270], [270, 409], [409, 291],
  [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405], [405, 321], [321, 375], [375, 291],
  [13, 312], [312, 311], [311, 310], [310, 415], [415, 308], [308, 324], [324, 318], [318, 402], [402, 317], [317, 14],
  [14, 87], [87, 178], [178, 88], [88, 95], [95, 78], [78, 191], [191, 80], [80, 81], [81, 82], [82, 13]
];

var KEY_DOTS = [33, 133, 362, 263, 61, 291, 1, 4, 152, 10, 234, 454, 159, 386, 145, 374];

function dist(a, b) {
  var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

var currentBS = { eyeOpen: 0.8, browRaise: 0, browFurrow: 0, mouthOpen: 0, smile: 0, jawDrop: 0, blinkL: 0, blinkR: 0, teeth: 0 };
var smoothBS = Object.assign({}, currentBS);

/**
 * Computes normalized facial blendshapes and teeth visibility
 * @param {Array} lms - 468 MediaPipe landmark coordinates
 */
function computeBlendshapes(lms) {
  var refDist = dist(lms[LM.forehead], lms[LM.chin]) || 1;

  // Eyes (Eye Aspect Ratio - EAR)
  var lEH = dist(lms[LM.leftEyeTop], lms[LM.leftEyeBot]) / refDist;
  var rEH = dist(lms[LM.rightEyeTop], lms[LM.rightEyeBot]) / refDist;
  var lEW = dist(lms[LM.leftEyeL], lms[LM.leftEyeR]) / refDist;
  var rEW = dist(lms[LM.rightEyeL], lms[LM.rightEyeR]) / refDist;
  var lEAR = lEH / (lEW || 0.01), rEAR = rEH / (rEW || 0.01);
  var thresh = 0.18, openT = 0.32;
  var blinkL = Math.max(0, 1 - (lEAR - thresh) / (openT - thresh));
  var blinkR = Math.max(0, 1 - (rEAR - thresh) / (openT - thresh));
  var eyeOpen = Math.min(1, ((lEAR + rEAR) / 2 - 0.1) / 0.3);

  // Brows
  var lbD = Math.abs(lms[LM.leftBrowTop].y - lms[LM.leftEyeTop].y) / refDist;
  var rbD = Math.abs(lms[LM.rightBrowTop].y - lms[LM.rightEyeTop].y) / refDist;
  var browRaise = Math.min(1, Math.max(0, ((lbD + rbD) / 2 - 0.04) / 0.06));
  var browInner = dist(lms[66], lms[296]) / refDist;
  var browFurrow = Math.min(1, Math.max(0, 1 - (browInner - 0.12) / 0.10));

  // Mouth
  var mH = dist(lms[LM.mouthTop], lms[LM.mouthBot]) / refDist;
  var mW = dist(lms[LM.mouthL], lms[LM.mouthR]) / refDist;
  var mouthOpen = Math.min(1, Math.max(0, (mH - 0.02) / 0.12));
  var jawDrop = Math.min(1, Math.max(0, (mH - 0.01) / 0.15));
  var faceW = dist(lms[234], lms[454]) / refDist || 1;
  var smile = Math.min(1, Math.max(0, (mW / faceW - 0.28) / 0.18));

  // Teeth detection using inner lip distance
  var innerGap = dist(lms[12], lms[15]) / refDist;
  var teethRaw = Math.min(1, Math.max(0, (innerGap - 0.04) / 0.08));
  var teeth = teethRaw * Math.min(1, mouthOpen * 4) * Math.min(1, (lEAR + rEAR));

  currentBS = {
    eyeOpen: Math.max(0, Math.min(1, eyeOpen)),
    browRaise: browRaise,
    browFurrow: browFurrow,
    mouthOpen: mouthOpen,
    smile: smile,
    jawDrop: jawDrop,
    blinkL: Math.min(1, blinkL),
    blinkR: Math.min(1, blinkR),
    teeth: Math.min(1, teeth)
  };
}

/**
 * Classifies the active dominant facial expression
 * @param {Object} bs - Blendshape values
 * @returns {string} Expression label
 */
function classifyExpression(bs) {
  if ((bs.blinkL + bs.blinkR) / 2 > 0.65) return 'BLINK';
  if (bs.mouthOpen > 0.5 && bs.browRaise > 0.4) return 'SURPRISED';
  if (bs.teeth > 0.3 && bs.smile > 0.3) return 'SMILE';
  if (bs.smile > 0.45) return 'SMILE';
  if (bs.browFurrow > 0.5) return 'ANGRY';
  return 'NEUTRAL';
}

function drawMesh(lms) {
  var w = meshCanvas.width, h = meshCanvas.height;
  meshCtx.clearRect(0, 0, w, h);
  meshCtx.fillStyle = '#000';
  meshCtx.fillRect(0, 0, w, h);

  function pt(i) {
    return { x: (1 - lms[i].x) * w, y: lms[i].y * h };
  }

  meshCtx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
  meshCtx.lineWidth = 0.5;
  meshCtx.beginPath();
  for (var e = 0; e < FACE_EDGES.length; e++) {
    var a = FACE_EDGES[e][0], b = FACE_EDGES[e][1];
    if (!lms[a] || !lms[b]) continue;
    var pa = pt(a), pb = pt(b);
    meshCtx.moveTo(pa.x, pa.y);
    meshCtx.lineTo(pb.x, pb.y);
  }
  meshCtx.stroke();

  meshCtx.fillStyle = '#ff4400';
  for (var d = 0; d < KEY_DOTS.length; d++) {
    if (!lms[KEY_DOTS[d]]) continue;
    var p = pt(KEY_DOTS[d]);
    meshCtx.beginPath();
    meshCtx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    meshCtx.fill();
  }

  var teethLMs = [11, 12, 13, 14, 15, 16];
  meshCtx.fillStyle = 'rgba(220, 240, 255, 0.9)';
  for (var tl = 0; tl < teethLMs.length; tl++) {
    if (!lms[teethLMs[tl]]) continue;
    var tp = pt(teethLMs[tl]);
    meshCtx.beginPath();
    meshCtx.arc(tp.x, tp.y, 2.5, 0, Math.PI * 2);
    meshCtx.fill();
  }
}

function drawEyeDetail(lms) {
  var w = eyeCanvas.width, h = eyeCanvas.height;
  eyeCtx.clearRect(0, 0, w, h);
  eyeCtx.fillStyle = '#000';
  eyeCtx.fillRect(0, 0, w, h);

  var eyeH = Math.abs(lms[10].y - lms[152].y) * 0.18;
  var eyePtsL = [33, 7, 163, 144, 145, 153, 154, 155, 133, 246, 161, 160, 159, 158, 157, 173];
  var eyePtsR = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

  function drawE(pts, ox, oy) {
    eyeCtx.strokeStyle = '#00d4ff';
    eyeCtx.lineWidth = 1.5;
    eyeCtx.beginPath();
    pts.forEach(function (i, idx) {
      if (!lms[i]) return;
      var x = ((1 - lms[i].x) - ox) * 6 * w + w * 0.25;
      var y = (lms[i].y - oy) * 6 * h + h * 0.3;
      if (idx === 0) eyeCtx.moveTo(x, y); else eyeCtx.lineTo(x, y);
    });
    eyeCtx.closePath();
    eyeCtx.stroke();
  }

  drawE(eyePtsL, 1 - lms[33].x - 0.04, lms[159].y - eyeH);
  drawE(eyePtsR, 1 - lms[263].x - 0.04, lms[386].y - eyeH);
}

function drawMouthDetail(lms) {
  var w = mouthCanvas.width, h = mouthCanvas.height;
  mouthCtx.clearRect(0, 0, w, h);
  mouthCtx.fillStyle = '#000';
  mouthCtx.fillRect(0, 0, w, h);

  var outerPts = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
  var innerUpperPts = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
  var innerLowerPts = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];
  var ox = 1 - lms[0].x - 0.03, oy = lms[0].y - 0.04;

  function drawPoly(pts, color, lw) {
    mouthCtx.strokeStyle = color;
    mouthCtx.lineWidth = lw;
    mouthCtx.beginPath();
    pts.forEach(function (i, idx) {
      if (!lms[i]) return;
      var x = ((1 - lms[i].x) - ox) * 7 * w + w * 0.2;
      var y = (lms[i].y - oy) * 7 * h + h * 0.15;
      if (idx === 0) mouthCtx.moveTo(x, y); else mouthCtx.lineTo(x, y);
    });
    mouthCtx.closePath();
    mouthCtx.stroke();
  }

  drawPoly(outerPts, 'rgba(0, 212, 255, 0.8)', 1.5);
  drawPoly(innerUpperPts, 'rgba(220, 240, 255, 0.7)', 1.2);
  drawPoly(innerLowerPts, 'rgba(180, 210, 240, 0.5)', 1.0);

  var teethPts = [11, 12, 13, 14, 15, 16];
  teethPts.forEach(function (i) {
    if (!lms[i]) return;
    var x = ((1 - lms[i].x) - ox) * 7 * w + w * 0.2;
    var y = (lms[i].y - oy) * 7 * h + h * 0.15;
    mouthCtx.beginPath();
    mouthCtx.arc(x, y, 3, 0, Math.PI * 2);
    mouthCtx.fillStyle = 'rgba(230, 245, 255, 0.9)';
    mouthCtx.fill();
    mouthCtx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
    mouthCtx.lineWidth = 0.5;
    mouthCtx.stroke();
  });

  var teethV = currentBS.teeth || 0;
  if (teethV > 0.1) {
    mouthCtx.fillStyle = 'rgba(220, 240, 255, ' + (teethV * 0.8) + ')';
    mouthCtx.font = 'bold ' + Math.round(w * 0.06) + 'px Orbitron, monospace';
    mouthCtx.textAlign = 'center';
    mouthCtx.fillText('TEETH', w / 2, h * 0.9);
  }
}

function drawOverlay(lms) {
  var vw = webcamVideo.videoWidth || overlayCanvas.offsetWidth;
  var vh = webcamVideo.videoHeight || overlayCanvas.offsetHeight;
  overlayCanvas.width = vw;
  overlayCanvas.height = vh;
  var w = vw, h = vh;

  overlayCtx.clearRect(0, 0, w, h);
  if (!lms.length) return;

  var minX = 1, maxX = 0, minY = 1, maxY = 0;
  lms.forEach(function (l) {
    if (l.x < minX) minX = l.x;
    if (l.x > maxX) maxX = l.x;
    if (l.y < minY) minY = l.y;
    if (l.y > maxY) maxY = l.y;
  });

  overlayCtx.strokeStyle = '#00d4ff';
  overlayCtx.lineWidth = 1.5;
  overlayCtx.setLineDash([6, 4]);
  overlayCtx.strokeRect(minX * w - 8, minY * h - 8, (maxX - minX) * w + 16, (maxY - minY) * h + 16);
  overlayCtx.setLineDash([]);

  overlayCtx.fillStyle = 'rgba(0, 212, 255, 0.4)';
  lms.forEach(function (l) {
    overlayCtx.beginPath();
    overlayCtx.arc(l.x * w, l.y * h, 0.8, 0, Math.PI * 2);
    overlayCtx.fill();
  });

  var teethPts = [11, 12, 13, 14, 15, 16];
  teethPts.forEach(function (i) {
    if (!lms[i]) return;
    overlayCtx.beginPath();
    overlayCtx.arc(lms[i].x * w, lms[i].y * h, 3.5, 0, Math.PI * 2);
    overlayCtx.fillStyle = 'rgba(220, 245, 255, 0.85)';
    overlayCtx.fill();
    overlayCtx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
    overlayCtx.lineWidth = 1;
    overlayCtx.stroke();
  });
}
