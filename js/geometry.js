/**
 * geometry.js
 * Procedural 3D Head Geometry & Feature Mapping
 */

// Procedural 3D head vertices forming an anatomical ellipsoid mesh
var HEAD_VERTS = (function () {
  var v = [], rows = 14, cols = 16;
  for (var r = 0; r <= rows; r++) {
    var phi = (Math.PI * r) / rows;
    var sy = Math.cos(phi);
    var sr = Math.sin(phi);
    for (var c = 0; c < cols; c++) {
      var theta = (2 * Math.PI * c) / cols;
      var x = sr * Math.cos(theta) * 0.72;
      var y = sy * 1.05;
      var z = sr * Math.sin(theta) * 0.6;
      if (z < -0.2) z *= 0.55;
      if (y < -0.5) x *= 0.6 + (y + 0.5) * 0.3;
      v.push([x, y, z]);
    }
  }
  return v;
})();

// Edge connections connecting rows and columns for wireframe rendering
var HEAD_EDGES = (function () {
  var e = [], rows = 14, cols = 16;
  for (var r = 0; r <= rows; r++) {
    for (var c = 0; c < cols; c++) {
      var i = r * cols + c;
      e.push([i, r * cols + (c + 1) % cols]);
      if (r < rows) e.push([i, (r + 1) * cols + c]);
    }
  }
  return e;
})();

/**
 * Calculates facial feature transforms from normalized blendshape values
 * @param {Object} bs - Active blendshape values
 * @returns {Object} Feature coordinates and dimensions
 */
function makeFaceFeatures(bs) {
  var blinkL = bs.blinkL, blinkR = bs.blinkR, eyeOpen = bs.eyeOpen;
  var browRaise = bs.browRaise, browFurrow = bs.browFurrow;
  var mouthOpen = bs.mouthOpen, smile = bs.smile, jawDrop = bs.jawDrop;
  var teeth = bs.teeth;

  return {
    leftEye: {
      cx: 0.22,
      cy: 0.18,
      ow: 0.12,
      oh: Math.max(0.015, 0.06 * (1 - blinkL) * eyeOpen)
    },
    rightEye: {
      cx: -0.22,
      cy: 0.18,
      ow: 0.12,
      oh: Math.max(0.015, 0.06 * (1 - blinkR) * eyeOpen)
    },
    leftBrowY: 0.30 + browRaise * 0.08 - browFurrow * 0.04,
    rightBrowY: 0.30 + browRaise * 0.08 - browFurrow * 0.04,
    leftBrowTilt: -browFurrow * 0.03,
    rightBrowTilt: browFurrow * 0.03,
    mouth: {
      cx: 0,
      cy: -0.38 - jawDrop * 0.05,
      w: 0.28 + smile * 0.08,
      h: mouthOpen * 0.12
    },
    smileCurve: smile * 0.05,
    teethVisible: teeth,
    mouthOpen: mouthOpen
  };
}
