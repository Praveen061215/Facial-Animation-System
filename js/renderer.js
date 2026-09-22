/**
 * renderer.js
 * 3D Face Wireframe & Dynamic Feature Renderer
 */

function FaceRenderer(canvas, color, bgColor, scale) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.color = color || '#ff6a00';
  this.bgColor = bgColor || '#000';
  this.scale = scale || 0.85;
  this.rotY = 0;
  this.rotX = 0;
  this.time = 0;
  this.phaseOffset = 0;
  this.blendshapes = {
    eyeOpen: 0.85,
    browRaise: 0,
    browFurrow: 0,
    mouthOpen: 0,
    smile: 0,
    jawDrop: 0,
    blinkL: 0,
    blinkR: 0,
    teeth: 0
  };
  this.targetBS = Object.assign({}, this.blendshapes);
}

FaceRenderer.prototype.setBlendshapes = function (bs) {
  Object.assign(this.targetBS, bs);
};

FaceRenderer.prototype.update = function () {
  var dt = 0.12;
  var tb = this.targetBS;
  var b = this.blendshapes;
  for (var k in tb) {
    b[k] = b[k] + (tb[k] - b[k]) * dt;
  }
  this.time += 0.016;
};

FaceRenderer.prototype.project = function (x, y, z, w, h) {
  var ry = this.rotY;
  var rx = this.rotX;
  var cosY = Math.cos(ry), sinY = Math.sin(ry);
  var cosX = Math.cos(rx), sinX = Math.sin(rx);

  var x1 = x * cosY + z * sinY;
  var z1 = -x * sinY + z * cosY;
  var y1 = y * cosX - z1 * sinX;
  var z2 = y * sinX + z1 * cosX;

  var fov = 2.2;
  var pz = z2 + fov;

  return {
    px: w / 2 + (x1 / pz) * w * this.scale,
    py: h / 2 - (y1 / pz) * h * this.scale,
    depth: pz
  };
};

FaceRenderer.prototype.draw = function () {
  var c = this.canvas, ctx = this.ctx, w = c.width, h = c.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = this.bgColor;
  ctx.fillRect(0, 0, w, h);

  var self = this;
  var proj = HEAD_VERTS.map(function (v) {
    return self.project(v[0], v[1], v[2], w, h);
  });

  ctx.strokeStyle = this.color;
  ctx.lineWidth = 0.7;
  for (var i = 0; i < HEAD_EDGES.length; i++) {
    var a = HEAD_EDGES[i][0], b = HEAD_EDGES[i][1];
    if (!proj[a] || !proj[b]) continue;
    var df = Math.min(1, (proj[a].depth + proj[b].depth) / 4);
    ctx.globalAlpha = 0.18 * df;
    ctx.beginPath();
    ctx.moveTo(proj[a].px, proj[a].py);
    ctx.lineTo(proj[b].px, proj[b].py);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  var feat = makeFaceFeatures(this.blendshapes);
  this._drawEye(ctx, w, h, feat.leftEye);
  this._drawEye(ctx, w, h, feat.rightEye);
  this._drawBrow(ctx, w, h, 0.22, feat.leftBrowY, feat.leftBrowTilt);
  this._drawBrow(ctx, w, h, -0.22, feat.rightBrowY, feat.rightBrowTilt);
  this._drawNose(ctx, w, h);
  this._drawMouth(ctx, w, h, feat.mouth, feat.smileCurve, feat.teethVisible, feat.mouthOpen);
};

FaceRenderer.prototype._drawEye = function (ctx, w, h, eye) {
  var c = this.project(eye.cx, eye.cy, 0.48, w, h);
  var r = this.project(eye.cx + eye.ow, eye.cy, 0.46, w, h);
  var rx2 = Math.abs(r.px - c.px);
  var ry2 = Math.max(2, eye.oh * h * 0.5);

  ctx.save();
  ctx.strokeStyle = this.color;
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = 8;
  ctx.shadowColor = this.color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.ellipse(c.px, c.py, Math.max(4, rx2), Math.max(1.5, ry2), 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(c.px, c.py, Math.max(1.5, ry2 * 0.4), 0, Math.PI * 2);
  ctx.fillStyle = this.color;
  ctx.globalAlpha = 0.5;
  ctx.fill();
  ctx.restore();
};

FaceRenderer.prototype._drawBrow = function (ctx, w, h, bx, by, tilt) {
  var l = this.project(bx - 0.1, by + tilt, 0.5, w, h);
  var r = this.project(bx + 0.1, by - tilt, 0.5, w, h);

  ctx.save();
  ctx.strokeStyle = this.color;
  ctx.lineWidth = 2.2;
  ctx.shadowBlur = 6;
  ctx.shadowColor = this.color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(l.px, l.py);
  ctx.lineTo(r.px, r.py);
  ctx.stroke();
  ctx.restore();
};

FaceRenderer.prototype._drawNose = function (ctx, w, h) {
  var top = this.project(0, 0.15, 0.55, w, h);
  var tip = this.project(0, -0.10, 0.62, w, h);
  var nl = this.project(-0.07, -0.13, 0.58, w, h);
  var nr = this.project(0.07, -0.13, 0.58, w, h);

  ctx.save();
  ctx.strokeStyle = this.color;
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(top.px, top.py);
  ctx.lineTo(tip.px, tip.py);
  ctx.moveTo(nl.px, nl.py);
  ctx.quadraticCurveTo(tip.px, tip.py + 2, nr.px, nr.py);
  ctx.stroke();
  ctx.restore();
};

FaceRenderer.prototype._drawMouth = function (ctx, w, h, mouth, smileCurve, teethVisible, mouthOpenVal) {
  var cornerY = mouth.cy + smileCurve * 0.8;
  var centerY = mouth.cy - smileCurve * 0.15;
  var ml = this.project(-mouth.w / 2, cornerY, 0.5, w, h);
  var mr = this.project(mouth.w / 2, cornerY, 0.5, w, h);
  var ctrl = this.project(0, centerY, 0.51, w, h);
  var mc = this.project(0, mouth.cy - mouth.h * 0.5 - smileCurve * 0.1, 0.52, w, h);

  ctx.save();

  // Dark mouth interior when open
  if (mouth.h > 0.005) {
    ctx.beginPath();
    ctx.moveTo(ml.px, ml.py);
    ctx.quadraticCurveTo(ctrl.px, ctrl.py, mr.px, mr.py);
    ctx.quadraticCurveTo(mc.px, mc.py, ml.px, ml.py);
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.globalAlpha = 0.9;
    ctx.fill();
  }

  // Real-time procedural teeth rendering
  if (teethVisible > 0.05 && mouth.h > 0.005) {
    var teethAlpha = Math.min(1, teethVisible * 2.5);
    var mouthW = Math.abs(mr.px - ml.px);
    var mouthCX = (ml.px + mr.px) / 2;
    var mouthTopY = Math.min(ml.py, mr.py, ctrl.py);
    var teethH = Math.min(mouth.h * h * 0.35, mouthOpenVal * h * 0.045 + 3);
    var toothCount = 8;
    var gap = 1.5;
    var totalW = mouthW * 0.82;
    var toothW = (totalW - (toothCount - 1) * gap) / toothCount;

    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(220,240,255,0.8)';

    // Upper dental arch
    for (var t = 0; t < toothCount; t++) {
      var tx = mouthCX - totalW / 2 + t * (toothW + gap);
      var ty = mouthTopY + 2;
      var tw = toothW;
      var th = teethH;
      var r = Math.min(3, tw / 2, th / 2);

      ctx.beginPath();
      ctx.moveTo(tx + r, ty);
      ctx.lineTo(tx + tw - r, ty);
      ctx.quadraticCurveTo(tx + tw, ty, tx + tw, ty + r);
      ctx.lineTo(tx + tw, ty + th - r);
      ctx.quadraticCurveTo(tx + tw, ty + th, tx + tw - r, ty + th);
      ctx.lineTo(tx + r, ty + th);
      ctx.quadraticCurveTo(tx, ty + th, tx, ty + th - r);
      ctx.lineTo(tx, ty + r);
      ctx.quadraticCurveTo(tx, ty, tx + r, ty);
      ctx.closePath();

      var g = ctx.createLinearGradient(tx, ty, tx, ty + th);
      g.addColorStop(0, 'rgba(240,248,255,' + teethAlpha + ')');
      g.addColorStop(0.5, 'rgba(220,235,250,' + teethAlpha + ')');
      g.addColorStop(1, 'rgba(180,200,225,' + (teethAlpha * 0.6) + ')');
      ctx.fillStyle = g;
      ctx.globalAlpha = teethAlpha;
      ctx.fill();

      ctx.strokeStyle = 'rgba(150,180,210,' + (teethAlpha * 0.5) + ')';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = teethAlpha * 0.7;
      ctx.stroke();
    }

    // Lower dental arch
    var lowerTeethH = teethH * 0.55;
    var lowerY = Math.max(ml.py, mr.py, mc.py) - lowerTeethH - 3;
    var lowerCount = 6;
    var lowerTW = (totalW * 0.7 - (lowerCount - 1) * gap) / lowerCount;
    var lowerStartX = mouthCX - totalW * 0.35;

    for (var lt = 0; lt < lowerCount; lt++) {
      var ltx = lowerStartX + lt * (lowerTW + gap);
      var lty = lowerY;
      var lth = lowerTeethH;
      var lr = Math.min(2, lowerTW / 2, lth / 2);

      ctx.beginPath();
      ctx.moveTo(ltx + lr, lty);
      ctx.lineTo(ltx + lowerTW - lr, lty);
      ctx.quadraticCurveTo(ltx + lowerTW, lty, ltx + lowerTW, lty + lr);
      ctx.lineTo(ltx + lowerTW, lty + lth - lr);
      ctx.quadraticCurveTo(ltx + lowerTW, lty + lth, ltx + lowerTW - lr, lty + lth);
      ctx.lineTo(ltx + lr, lty + lth);
      ctx.quadraticCurveTo(ltx, lty + lth, ltx, lty + lth - lr);
      ctx.lineTo(ltx, lty + lr);
      ctx.quadraticCurveTo(ltx, lty, ltx + lr, lty);
      ctx.closePath();

      var lg = ctx.createLinearGradient(ltx, lty, ltx, lty + lth);
      lg.addColorStop(0, 'rgba(180,200,225,' + (teethAlpha * 0.7) + ')');
      lg.addColorStop(1, 'rgba(140,170,200,' + (teethAlpha * 0.4) + ')');
      ctx.fillStyle = lg;
      ctx.globalAlpha = teethAlpha * 0.85;
      ctx.fill();

      ctx.strokeStyle = 'rgba(120,160,200,' + (teethAlpha * 0.4) + ')';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = teethAlpha * 0.5;
      ctx.stroke();
    }
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // Lip contours
  ctx.strokeStyle = this.color;
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = 8;
  ctx.shadowColor = this.color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(ml.px, ml.py);
  ctx.quadraticCurveTo(ctrl.px, ctrl.py, mr.px, mr.py);
  ctx.stroke();

  if (mouth.h > 0.01) {
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(ml.px, ml.py);
    ctx.quadraticCurveTo(mc.px, mc.py, mr.px, mr.py);
    ctx.stroke();
  }
  ctx.restore();
};
