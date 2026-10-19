/* ============================================================
 * quaternion.js —— 四元数基础运算
 * 约定：q = [w, x, y, z] 表示 w + x i + y j + z k
 * ============================================================ */
(function (global) {
  'use strict';

  var Q = {};

  Q.IDENTITY = [1, 0, 0, 0];

  /* 四元数乘法：(r1,v1)(r2,v2) = (r1r2 - v1·v2, r1v2 + r2v1 + v1×v2) */
  Q.mul = function (a, b) {
    var aw = a[0], ax = a[1], ay = a[2], az = a[3];
    var bw = b[0], bx = b[1], by = b[2], bz = b[3];
    return [
      aw * bw - ax * bx - ay * by - az * bz,
      aw * bx + ax * bw + ay * bz - az * by,
      aw * by - ax * bz + ay * bw + az * bx,
      aw * bz + ax * by - ay * bx + az * bw
    ];
  };

  /* 共轭：单位四元数的共轭即逆 */
  Q.conj = function (a) {
    return [a[0], -a[1], -a[2], -a[3]];
  };

  Q.scale = function (a, s) {
    return [a[0] * s, a[1] * s, a[2] * s, a[3] * s];
  };

  Q.add = function (a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
  };

  Q.norm = function (a) {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]);
  };

  Q.normalize = function (a) {
    var n = Q.norm(a);
    if (n < 1e-12) return [1, 0, 0, 0];
    return [a[0] / n, a[1] / n, a[2] / n, a[3] / n];
  };

  Q.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  };

  /* 整数次幂（含负幂，走二分快速幂） */
  Q.pow = function (a, n) {
    if (n === 0) return [1, 0, 0, 0];
    var base = n > 0 ? a.slice() : Q.conj(a);
    var m = Math.abs(n);
    var result = [1, 0, 0, 0];
    while (m > 0) {
      if (m & 1) result = Q.mul(result, base);
      base = Q.mul(base, base);
      m >>= 1;
    }
    return result;
  };

  global.Q = Q;
})(window);
