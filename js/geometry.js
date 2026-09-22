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
