/*
 * _ds_audit.cjs —— DeepSeek V4.1《李雅普诺夫谱论文精读》的补充完善校核。
 *
 * 用法：node _ds_audit.cjs [精读HTML路径]     （不传就读归档的那份）
 * 对象：_src_yuanbao/AAA_DeepSeekV4.1_李雅普诺夫谱精读_元宝分享页提取.html
 * 依据：_src_yuanbao/随机神经网络的Lyapunov谱_PDF原文提取.md（36 页 PDF 的文本层）
 *
 * 🔴 判据全部读「屏上的字」或 HTML 里的真实外链；检查串从文件复制，不臆造。
 * 🔴 必须声明查了几项；无对象直接 FAIL；全绿或全红都要复查判据本身。
 * 🔴 2026-11-02 修正过一次假红：原 ② 判「含完整证明」与「未证明的假设」同页即矛盾，
 *    但前者说的是论文 36 页/附录，后者说的是极限交换前提 —— 两件不同的事，不构成矛盾。
 *    现改为「元数据区缺边界注」这个真实、可修的版面问题，并在判据里写明修正原因。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const DEF_HTML = path.join(DIR, '_src_yuanbao', 'AAA_DeepSeekV4.1_李雅普诺夫谱精读_元宝分享页提取.html');
const PDF_MD = path.join(DIR, '_src_yuanbao', '随机神经网络的Lyapunov谱_PDF原文提取.md');
const OUT = path.join(DIR, '_ds_audit_result.json');

const file = process.argv[2] || DEF_HTML;
if (!fs.existsSync(file)) {
  console.log('FAIL  无对象：精读 HTML 不存在 ⇒ 检查器不许空跑，判 FAIL');
  process.exit(1);
}
if (!fs.existsSync(PDF_MD)) {
  console.log('FAIL  无对象：PDF 原文提取不存在 ⇒ 事实层判据没有依据，判 FAIL');
  process.exit(1);
}
const raw = fs.readFileSync(file, 'utf8');
const pdf = fs.readFileSync(PDF_MD, 'utf8');
const text = raw
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ');
const has = (s) => text.indexOf(s) >= 0;
const pdfHas = (s) => pdf.indexOf(s) >= 0;
const ext = Array.from(raw.matchAll(/<(?:script|link)[^>]*\s(?:src|href)="(https?:\/\/[^"]+)"/g)).map((m) => m[1]);

/* 检查串逐字从 PDF 提取文本复制（见 §1.1 / §4 / AI methodology / 致谢 / 附录 D.2） */
const FACTS = ['Deninger', 'Fuglede', '100 minutes', 'Ashok Litwin-Kumar', 'diffeomorphism-invariant'];
const factsMiss = FACTS.filter((s) => !pdfHas(s));

const items = [
  {
    k: '① 离线使用 vs 真实外链',
    ok: ext.length === 0,
    why: '离线可用性只看 HTML 里有没有外部资源引用；「不用联网」那句承诺在分享对话里，不在本 HTML 内，不作判据',
    got: '外链 ' + ext.length + ' 条' + (ext.length ? '：' + ext.join(' , ') : '') + '；HTML 内有「不用联网」字样：' + (has('不用联网') ? '有' : '无'),
    fix: 'MathJax 改本地文件；断网重验，而不是在有网时数公式',
  },
  {
    k: '② 元数据「含完整证明」缺边界注（原判据是假红，已改）',
    ok: !has('含完整证明') || /极限交换未证|关键假设未证|未证的假设/.test(text.slice(0, 400)),
    why: '「36 页 · 含完整证明」说的是论文页数与附录，「未证明的假设」说的是极限交换前提，两者不矛盾；真正的问题是元数据区没给读者一个边界注',
    got: '元数据区有「含完整证明」：' + (has('含完整证明') ? '有' : '无') + '；其附近有边界注：' + (/极限交换未证|关键假设未证|未证的假设/.test(text.slice(0, 400)) ? '有' : '无') + '；正文有「未证明的假设」：' + (has('未证明的假设') ? '有' : '无'),
    fix: '元数据那行补「关键极限交换未证」；正文第三节已经说对了，不用改',
  },
  {
    k: '③ 外部补入的元数据有没有落源',
    ok: !has('arXiv:2610.12426') || has('外部补入') || has('来源：arXiv') || has('元数据来源'),
    why: 'PDF 文本层里没有本文的 arXiv 号 / 10.48550 / nonexclusive 许可 / TeX Live（只有源码仓库地址）；这些是论文之外的元数据',
    got: '屏上有 arXiv 号：' + (has('arXiv:2610.12426') ? '有' : '无') + '；标了来源：' + ((has('外部补入') || has('来源：arXiv') || has('元数据来源')) ? '有' : '无') + '；PDF 里有本文号：' + (pdfHas('arXiv:2610') ? '有' : '无'),
    fix: '单列「外部补入（来源：arXiv 摘要页 / 源码包）」，不要混进「逐页核过」',
  },
  {
    k: '④ N=4096 被压成单一口径',
    ok: !has('N=4096') || has('8192') || has('16384') || has('g≥2'),
    why: '原文附录 D.2：g≥2 用 4096；g≤1.5 用 8192(δ→0) / 16384(δ=0.25,0.5) 五个网络中位数；参与比另用两个 16384',
    got: '屏上有 N=4096：' + (has('N=4096') ? '有' : '无') + '；有其它规模：' + ((has('8192') || has('16384')) ? '有' : '无') + '；PDF 里有 8192 / 16384：' + (pdfHas('8192') ? '有' : '无') + ' / ' + (pdfHas('16384') ? '有' : '无'),
    fix: '补一张 3 行规模表，别用一个数字代表全曲线',
  },
  {
    k: '⑤ 极限个数：原文两处口径不一致',
    ok: has('长时间') || has('long-time') || has('三个极限') || has('两处口径'),
    why: '§4 只说「大 N 与 η→0」两个；AI methodology 说「大 N、长时间、η→0」三个 —— 这是原论文本身的口径差，不是转述错误',
    got: '精读页提了第三个（长时间）：' + ((has('长时间') || has('long-time') || has('三个极限')) ? '有' : '无') + '；PDF §4 有 exchange：' + (pdfHas('vanishing regularization can be exchanged') ? '有' : '无') + '；AI methodology 有 long-time：' + (pdfHas('long-time and zero-regularizer limits') ? '有' : '无'),
    fix: '补一句「原文两处口径不一致」，再说明本文按 §4 的两个来读',
  },
  {
    k: '⑥ 原文出处与下载区块',
    ok: has('原文出处与下载'),
    why: '这一项用来证明它确实做了溯源，不是只做排版',
    got: has('原文出处与下载') ? '有' : '无',
    fix: '无（这项本来就 PASS）',
  },
  {
    k: '⑦ 补充建议的原文依据（事实层，防我自己臆造）',
    ok: factsMiss.length === 0,
    why: '③–⑤ 的补法必须挂在原文上；检查串逐字从 PDF 提取文本复制，不是我凭印象写的',
    got: FACTS.map((s) => s + (pdfHas(s) ? '✓' : '✗')).join(' '),
    fix: factsMiss.length ? '缺：' + factsMiss.join('、') + ' —— 先补依据，不许出结论' : '无',
  },
  {
    k: '⑧ 不变量 → 达真：最该补的一句没补',
    ok: !(has('微分同胚') || has('不变量')) || /重标号|外部参照|达真|免疫/.test(text),
    why: '原文摘要说谱是 diffeomorphism-invariant；正因如此，它对 Ω→max−V 这次重标号按构造免疫，当不了达真要的外部参照',
    got: '精读页提了不变量：' + ((has('微分同胚') || has('不变量')) ? '有' : '无') + '；提了 RSI：' + (has('RSI') ? '有' : '无') + '；把两者接起来（重标号/外部参照/达真/免疫）：' + (/重标号|外部参照|达真|免疫/.test(text) ? '有' : '无'),
    fix: '补一句：谱是吸引子的指纹不是名字；越客观的不变量越对重标号免疫，达真要的是尺子之外的锚',
  },
];

console.log('校核对象：' + path.basename(file));
console.log('原文依据：' + path.basename(PDF_MD));
console.log('可见文本 ' + text.length + ' 字符 / HTML ' + raw.length + ' 字符');
console.log('声明：共查 ' + items.length + ' 项，逐项如下\n');
let pass = 0;
for (const it of items) {
  if (it.ok) pass++;
  console.log((it.ok ? 'PASS ' : 'FAIL ') + it.k);
  console.log('      判据：' + it.why);
  console.log('      实测：' + it.got);
  if (!it.ok) console.log('      补法：' + it.fix);
}
console.log('\n合计 PASS ' + pass + '/' + items.length);
if (pass === 0 || pass === items.length) {
  console.log('⚠ 全绿或全红都要复查判据本身（恒真 / 恒假是两种假绿）');
}

const result = {
  object: path.basename(file),
  objectMd5: require('crypto').createHash('md5').update(raw).digest('hex'),
  source: path.basename(PDF_MD),
  sourceMd5: require('crypto').createHash('md5').update(pdf).digest('hex'),
  origin: 'https://yb.tencent.com/s/b5uaeNfjwxCN （元宝分享页内嵌 markdown 块，2026-11-02 提取）',
  checked: items.length,
  pass: pass,
  items: items.map((it) => ({ k: it.k, ok: it.ok, why: it.why, got: it.got, fix: it.ok ? '' : it.fix })),
  at: new Date().toISOString(),
};
fs.writeFileSync(OUT, JSON.stringify(result, null, 1), 'utf8');
console.log('\n结果已落 ' + path.basename(OUT));
