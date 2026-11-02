# -*- coding: utf-8 -*-
"""把「怎么教：五个最小工具」加进教育弹层（eOv），作为第 5+ 节。

为什么是 5+ 而不是第 15 节：
  eOv 已有 14 节，后半段（12 窗口期／13 十二问／14 稀缺的是判定）是写给教育从业者的转型建议，
  而 ee5「六个动作」讲的是「做真东西的流程」—— 这一节的「拿到一道题怎么想」是它的另一半，
  必须紧挨着它。重排 14 节编号风险太大，用 5+ 插入 ee5 与 ee6 之间，不打乱任何现有锚点。

纪律：
  · 预检 → 写 .tmp → 复核关键标记 → copyfile 覆盖（绝不原地多步 replace）
  · HTML 渲染可以用 <b>，但**星号会原样印出来**，所以正文里一律不写 **
  · 数字能现算就现算（这里无数字可算，但条数由探针现核）
"""
import io, sys, os, shutil, re

P = 'AAA_数学物理跨界关联.html'
s = io.open(P, encoding='utf-8').read()

SEC = '''
        <h3 id="ee5b"><span class="n">5+</span>五个最小工具：拿到一道题，先别算</h3>

        <p>第 5 节讲的是「做真东西的流程」，这一节是它的另一半：<b>拿到一道题，怎么想</b>。
          立场只有一句 —— <b>不教工具，教「先别算」</b>。工具越多，看见的结构越少：
          用方程解四年级的题，等于用计算器做加法，答案出来了，但「抬腿」那个洞察没了。
          <span style="font-size:12px;color:#7b8695">（2026-11-02 补）</span></p>

        <h4>5+.1 五个最小工具</h4>

        <p>我这辈子见过能覆盖小学到高中绝大部分题的，只有这五件：</p>

        <div class="e-tw"><table class="e-t">
          <tr><th style="width:20%">工具</th><th style="width:34%">一句话</th><th>最短的例子</th></tr>
          <tr><td><b>不变量</b></td><td>找那个怎么变都不变的东西</td><td>七桥问题：不必去走，数每个点连出几条线就够了</td></tr>
          <tr><td><b>配对与对称</b></td><td>能不能两两凑对</td><td>1+100=101，50 对：99 次加法变成 1 次乘法</td></tr>
          <tr><td><b>试极端</b></td><td>先假设最笨的那种情况</td><td>全是鸡：70 只脚，差 24，24÷2 = 12 只兔</td></tr>
          <tr><td><b>倒着走</b></td><td>从结果往回推</td><td>第 30 天铺满 ⇒ 第 29 天是一半，不是第 15 天</td></tr>
          <tr><td><b>算反面</b></td><td>补集常常比正面好算</td><td>23 人同天生日：别直接算「有」，算「全不同」</td></tr>
        </table></div>

        <h4>5+.2 现场演示：整局只用了一个词</h4>

        <p>关键不在工具本身，在<b>什么时候给</b>。下面这场对话我最常复用，它<b>零算术</b> ——
          全篇只用了「圆有中心」这一件事：</p>

        <div class="e-tw"><table class="e-t">
          <tr><th style="width:7%">步</th><th style="width:38%">我说</th><th style="width:27%">他在想</th><th>这一步给的工具</th></tr>
          <tr><td><b>1</b></td><td>两个人在圆桌上轮流放一样的硬币，不许叠，谁放不下谁输。你有办法保证赢吗？</td><td>放边上省地方还是放中间？要不要排成六边形？</td><td class="no">还没给。这一步的价值就是让他穷举失败</td></tr>
          <tr><td><b>2</b></td><td>先别想怎么放得密。换个问题：对手刚放了一枚，你放哪儿能<b>保证</b>一定放得下？</td><td>得看他在哪儿放吧……</td><td><b>对称</b> —— 放它正对面。他放得下，对面一定放得下</td></tr>
          <tr><td><b>3</b></td><td>那第一枚呢？</td><td>放正中心！中心自己就是对称中心，之后每一枚我都有对面。</td><td><b>零算术</b>。这就是模仿策略，和高斯配对 1+100 是同一个动作</td></tr>
        </table></div>

        <h4>5+.3 一个动作，见三次</h4>

        <p>真正的教学单位不是「题」，是「动作」。下面这四道在孩子眼里是四道题，其实是一次除法：</p>

        <div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;
           gap:4px 6px;font-size:13.5px;background:#f7f9fd;border:1px solid #e4e9f1;
           border-radius:6px;padding:10px 10px;line-height:1.75;margin:0 0 13px">
          <b style="white-space:nowrap">先试极端</b><span style="color:#9aa5b4">→</span>
          <b style="white-space:nowrap">算出差</b><span style="color:#9aa5b4">→</span>
          <b style="white-space:nowrap">除以单位差</b>
          <span style="color:#9aa5b4;font-size:12px">（一个动作，四张皮）</span>
        </div>

        <div class="e-tw"><table class="e-t">
          <tr><th style="width:24%">题</th><th>那一步是什么</th></tr>
          <tr><td><b>鸡兔同笼</b></td><td>全是鸡，差 ÷ 2</td></tr>
          <tr><td><b>年龄问题</b></td><td>年龄差不变</td></tr>
          <tr><td><b>盈亏问题</b></td><td>两次分配之差</td></tr>
          <tr><td><b>浓度问题</b></td><td>溶质不变</td></tr>
        </table></div>

        <p><b>关键在第三次：闭嘴。</b>等他自己说出「这跟上次那个一样」——
          他能说出这句话，才是真会了，比考一百分可靠。</p>

        <h4>5+.4 六条硬规矩</h4>

        <ol style="margin:6px 0 0;padding-left:19px;font-size:13.2px;line-height:1.85">
          <li><b>先撞墙，再给工具。</b>工具的价值等于撞墙的深度。让他真的把 1 加到 100 加一遍
            （五分钟，不许偷懒），他才会懂得珍惜配对。没撞过墙的工具，第二天就忘。</li>
          <li><b>不许用超纲工具。</b>用 x、y 解四年级的题，等于用计算器做加法 —— 会掩盖他不会的那部分。
            <b>限制工具反而逼出洞察</b>：约束是发现之母。</li>
          <li><b>错题只问一句：「你当时为什么觉得它对？」</b>不订正答案，找那个错误的直觉。
            错误是系统性的，改答案不改直觉，下次照样错。</li>
          <li><b>让他出题，不让他刷题。</b>「头 35 脚 94」之后问：「你来改个数，让它刚好有整数解。」
            他会自己发现脚数必须偶数、还落在某个范围里 —— 这教的是<b>可解条件</b>，比做一百道值钱。</li>
          <li><b>一题三件事：猜、验、改。</b>先估数量级（2 的 10 次方大概几千？），再算，再看差在哪。
            估错不要紧，<b>估错之后那个「为什么」才是真东西</b>。</li>
          <li><b>一个结构要见三次，第三次闭嘴。</b>同 5+.3 —— 能说出「这跟上次一样」才算学会。</li>
        </ol>

        <h4>5+.5 分年级：加进来的是哪一件，硬规矩是什么</h4>

        <div class="e-tw"><table class="e-t">
          <tr><th style="width:20%">学段</th><th style="width:44%">这一年加进来的一件</th><th>硬规矩</th></tr>
          <tr><td><b>小学 3–6</b></td><td>不变量、配对、倒推</td><td>不用字母；不许列方程</td></tr>
          <tr><td><b>初中</b></td><td>加「算反面」「试极端」</td><td>允许列方程，但必须先用算术做一遍</td></tr>
          <tr><td><b>高中</b></td><td>加「量纲与数量级」</td><td>做题前先估答案的阶：2<sup>10</sup> 大概几千</td></tr>
        </table></div>

        <div style="background:#f7faff;border:1px solid #dbe6fa;border-radius:6px;
           padding:9px 12px;font-size:13px;line-height:1.8;margin:13px 0 0;color:#3c4752">
          第 7 节说「不要让孩子全学，全学等于全不会」。这一节是它的操作版：
          <b>教育的单位不是「学完清单」，是把一件工具用穿</b>。201 件工具里，
          能用穿三件的孩子，比见过两百件的孩子走得远得多。
        </div>
'''

# ---------------------------------------------------------------- 锚点
NAV_OLD = '      <a href="#ee5">5 六个动作</a>\n'
NAV_NEW = '      <a href="#ee5">5 六个动作</a>\n      <a href="#ee5b">5+ 五个工具</a>\n'

BTN_OLD = '<button id="eBtn"><b>AI 之后，孩子该学什么</b><i>教育路线 · 8 个能亲手做出来的例子</i></button>'
BTN_NEW = ('<button id="eBtn"><b>AI 之后，孩子该学什么</b>'
           '<i>教育路线 · 8 个例子 · 五个最小工具（2026-11-02 补）</i></button>')

LEAD_OLD = '<p>201 件数学工具，<b>8 个能亲手做出来的例子</b>，一条从「现象」到「装置」的路线。'
LEAD_NEW = ('<p>201 件数学工具，<b>8 个能亲手做出来的例子</b>，一条从「现象」到「装置」的路线；'
            '第 <b>5+</b> 节再给<b>五个最小工具</b> —— 拿到一道题，先别算。')

# eOv 收口（三级缩进的连续闭合），把新节插在 e-body 结束之前
END_OLD = '\n      </div>\n    </div>\n  </div>\n</div>'

# ---------------------------------------------------------------- 预检
prob = []
for name, a, n in [('NAV', NAV_OLD, 1), ('BTN', BTN_OLD, 1), ('LEAD', LEAD_OLD, 1)]:
    c = s.count(a)
    if c != n: prob.append('%s 命中 %d（应 %d）' % (name, c, n))

# eOv 块定位（div 计数），取收口前的插入点
i0 = s.find('<div id="eOv"')
if i0 < 0:
    prob.append('找不到 eOv')
else:
    d = 0; k = i0; end = -1
    while True:
        m = re.compile(r'<div\b|</div>').search(s, k)
        if not m: break
        if m.group(0) == '<div': d += 1
        else:
            d -= 1
            if d == 0: end = m.end(); break
        k = m.end()
    if end < 0:
        prob.append('eOv div 未配平')
    else:
        tail = s[end - len(END_OLD):end]
        if tail != END_OLD:
            prob.append('eOv 收口串与预期不符：%r' % tail[:60])
        # 🔴 该收口串在全文出现不止一次 ⇒ 不能用 s.replace，必须用位置切片插入（下面就是）

if 'ee5b' in s: prob.append('ee5b 已存在（重复插入）')
if '五个最小工具' in s: prob.append('「五个最小工具」已存在')
if '**' in SEC: prob.append('正文里有星号（会原样印出）')
for tag in ('div', 'table', 'tr', 'td', 'th', 'ol', 'li', 'h3', 'h4', 'p', 'span', 'b'):
    o = len(re.findall(r'<%s[\s>]' % tag, SEC))
    c = len(re.findall(r'</%s>' % tag, SEC))
    if o != c: prob.append('%s 未配平：开 %d / 闭 %d' % (tag, o, c))

if prob:
    sys.exit('预检失败，未写盘：\n  ' + '\n  '.join(prob))
print('预检通过')

# ---------------------------------------------------------------- 改
s = s.replace(NAV_OLD, NAV_NEW, 1)
s = s.replace(BTN_OLD, BTN_NEW, 1)
s = s.replace(LEAD_OLD, LEAD_NEW, 1)
i0 = s.find('<div id="eOv"')
d = 0; k = i0; end = -1
while True:
    m = re.compile(r'<div\b|</div>').search(s, k)
    if not m: break
    if m.group(0) == '<div': d += 1
    else:
        d -= 1
        if d == 0: end = m.end(); break
    k = m.end()
s = s[:end - len(END_OLD)] + SEC + s[end - len(END_OLD):]

# ---------------------------------------------------------------- 原子写盘
io.open(P + '.tmp', 'w', encoding='utf-8', newline='\r\n').write(s)
chk = io.open(P + '.tmp', encoding='utf-8').read()
miss = []
for kk in ('id="ee5b"', 'href="#ee5b"', '五个最小工具', '算反面', '倒着走', '试极端',
           '不变量', '配对与对称', '先撞墙，再给工具', '让他出题，不让他刷题',
           '5+.5 分年级', '把一件工具用穿'):
    if kk not in chk: miss.append(kk)
# div 配平复核
if chk.count('<div') != chk.count('</div>'):
    miss.append('div 不配平：%d vs %d' % (chk.count('<div'), chk.count('</div>')))
if miss:
    os.remove(P + '.tmp')
    sys.exit('临时文件复核失败，未覆盖：\n  ' + '\n  '.join(miss))

shutil.copyfile(P + '.tmp', P)
os.remove(P + '.tmp')
b = io.open(P, 'rb').read()
print('写盘 OK：字节 %d  CR %d  LF %d  div %d/%d'
      % (len(b), b.count(b'\r'), b.count(b'\n'), chk.count('<div'), chk.count('</div>')))
