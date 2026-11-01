'use strict';
/*
 * _mirror.cjs —— 把本目录硬链进 _gh_跨界总入口 的镜像（不复制字节）。
 *
 * 铁律：Edit/Write 会悄悄换掉 inode，硬链就断成两份独立文件。
 * 所以每次改完都要重跑本脚本，并核对 nlink ≥ 2、inode 相同。
 * 只补/修，不删：镜像里多出来的文件不在此处处理。
 */
const fs = require('fs');
const path = require('path');

const SRC = 'D:/AAA我的文件/PKS_千禧难题_GitHub版/02_应用科技/六维卦序';
const DST = 'D:/AAA我的文件/_gh_跨界总入口/PKS_千禧难题_GitHub版/02_应用科技/六维卦序';
const SKIP = new Set(['.git']);

let made = 0, fixed = 0, ok = 0, dirs = 0;
const bad = [];

function walk(rel) {
  const s = path.join(SRC, rel), d = path.join(DST, rel);
  if (!fs.existsSync(d)) { fs.mkdirSync(d, { recursive: true }); dirs++; }
  for (const name of fs.readdirSync(s)) {
    if (SKIP.has(name)) continue;
    const rs = path.join(rel, name);
    const ps = path.join(SRC, rs), pd = path.join(DST, rs);
    const st = fs.statSync(ps);
    if (st.isDirectory()) { walk(rs); continue; }
    if (!fs.existsSync(pd)) {
      fs.linkSync(ps, pd); made++; ok++;
    } else {
      const a = fs.statSync(ps), b = fs.statSync(pd);
      if (a.ino !== b.ino) { fs.unlinkSync(pd); fs.linkSync(ps, pd); fixed++; ok++; }
      else ok++;
    }
  }
}
walk('');
console.log('硬链完成：新建 ' + made + '，修复断链 ' + fixed + '，已是同一 inode ' + (ok - made - fixed) + '，新建目录 ' + dirs);

/* 复核：随机抽 8 个（含新文件）看 inode 是否一致 */
const check = ['hexagram.cjs', 'sources.cjs', 'make-lianxin.cjs', 'AAA_良心与异化_六维价值梯度.html',
  'AAA_算法文档_合观校核.html', '_img/zip/01_四仪表与六图形.jpg',
  '_src_yuanbao/图集/用户提供的图片集.zip', '_src_yuanbao/SOURCE.md'];
let miss = 0;
for (const f of check) {
  const a = path.join(SRC, f), b = path.join(DST, f);
  if (!fs.existsSync(b)) { console.log('  ✗ 缺失 ' + f); miss++; continue; }
  const sa = fs.statSync(a), sb = fs.statSync(b);
  const same = sa.ino === sb.ino;
  if (!same) miss++;
  console.log('  ' + (same ? '✓' : '✗') + ' ' + sa.ino + ' nlink=' + sb.nlink + '  ' + f);
}
console.log(miss === 0 ? '复核通过：抽样 8 个全部同一 inode' : '🔴 有 ' + miss + ' 个不一致');
