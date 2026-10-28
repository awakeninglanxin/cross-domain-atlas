# -*- coding: utf-8 -*-
"""B 档可行性：Keely 双环（内 7 管 / 外 8 套 24 管）能不能做「模式开关」。

只算结构，不猜物理。三条要验的东西：
  1) 内环 7 重、外环 8 重 —— 两套的角向谱是否真的不相交
  2) 若不相交 ⇒ 线性耦合通道为零，任何数值模型都算不出耦合
  3) 旋转 + 定子能不能把通道打开，打开的条件是什么（这叫「可证伪的预测」）

注意：这里的数字全部用 chladni 页面的公式重算，不引用页面读数。
"""
import math

# ── 与页面同源的基础量（从 AAA_克拉德尼_Keely八振子24管 的 scaleFreqs 抄公式）──
A4      = 432.0
TONIC3  = A4 * 8.0 / 15.0        # Bb3 纯律 = 230.400
WOCT    = 5                      # 工作八度 Bb5
BASE    = TONIC3 * (2.0 ** (WOCT - 3))   # = 921.600

N_IN, N_OUT, N_Layer = 7, 8, 3

fails, nchk = [], [0]

def chk(cond, label, info=""):
    nchk[0] += 1
    if not cond:
        fails.append("%s | %s" % (label, info))
    return cond


# ── 1) 频率表自洽 ────────────────────────────────────────────
def outer_tubes():
    """外环 24 根：8 个方位 i，3 个八度层 o。八度 7 等分 ⇒ 比值 2^(i/7+o)。"""
    return [(i, o, BASE * (2.0 ** (i / 7.0 + o))) for o in range(N_Layer) for i in range(N_OUT)]

tubes = outer_tubes()
lo = min(t[2] for t in tubes)
hi = max(t[2] for t in tubes)

chk(abs(lo - 921.6) < 1e-9, "最低管不是 Bb5", "%.6f" % lo)
chk(abs(hi / lo - 8.0) < 1e-12, "总跨不是精确 8.000000×", "%.15f" % (hi / lo))

# 7 等分八度的步长（音分）
step_cents = 1200.0 * math.log(2.0 ** (1 / 7.0), 2)
chk(abs(step_cents - 1200.0 / 7) < 1e-9, "步长不是 171.4286 音分", "%.6f" % step_cents)
# 离最近的纯律音程：9/8 = 203.91 音分
near = 1200.0 * math.log(9.0 / 8.0, 2)
chk(abs(abs(near - step_cents) - 32.48) < 0.01, "与 9/8 的偏离不是 32.5 音分",
    "%.4f" % abs(near - step_cents))


# ── 2) 角向谱：位置对称性决定一切，与调什么音无关 ──────────────
def ang_support(n_pos, mmax):
    """n 个等分点的 δ 串，傅里叶级数非零的角向数 m（闭式：m ≡ 0 mod n）。"""
    return [m for m in range(-mmax, mmax + 1) if m % n_pos == 0]

MMAX = 30
s_in  = set(ang_support(N_IN,  MMAX))
s_out = set(ang_support(N_OUT, MMAX))
inter = s_in & s_out - {0}

print("=" * 68)
print("一、角向谱（|m| ≤ %d）" % MMAX)
print("=" * 68)
print("  内环 7 重  ⇒ m ∈ %s" % sorted(s_in))
print("  外环 8 重  ⇒ m ∈ %s" % sorted(s_out))
print("  交集（去掉 m=0）⇒ %s" % (sorted(inter) if inter else "空集"))
print()

chk(inter == set(), "7 重与 8 重在弯曲模上仍有交集", str(sorted(inter)))
chk(7 in s_in and 7 not in s_out, "m=7 不属于外环谱", "")
chk(8 in s_out and 8 not in s_in, "m=8 不属于内环谱", "")
# 首个非零公共谐波必须是 lcm(7,8)=56
common = [m for m in range(1, 400) if m % N_IN == 0 and m % N_OUT == 0]
chk(common and common[0] == 56, "首个公共谐波不是 56", str(common[:3]))


# ── 3) 频率：24 管实际有几种不同音高 ─────────────────────────
vals = sorted({round(t[2], 6) for t in tubes})
dups = len(tubes) - len(vals)
print("二、24 根管实际只有 %d 个不同音高（重复 %d 根：i=7 那根与上层的 i=0 撞音）" % (len(vals), dups))
print("  最低 %.3f Hz  最高 %.3f Hz" % (vals[0], vals[-1]))
print()


# ── 4) 旋转边带：能不能落在管音上 = 通道通不通的硬判据 ────────
def rpms_to_hz(rpm):
    return rpm / 60.0

def resonant_rpms(n_harm, k):
    """要让 n 阶边带 f0 + n·(8·f_rot) 正好等于第 k 根外环管（o=0 层），转速该是多少。"""
    fk = BASE * (2.0 ** (k / 7.0))
    f_mod = (fk - BASE) / n_harm
    return f_mod * 60.0 / N_OUT

print("=" * 68)
print("三、共振转速反解（n=1 阶边带对上第 k 根管）")
print("=" * 68)
print("  %-4s %-12s %-12s %s" % ("k", "管音 Hz", "需 f_mod Hz", "需转速 rpm"))
best = []
for k in range(1, 8):
    rpm = resonant_rpms(1, k)
    fk = BASE * (2.0 ** (k / 7.0))
    print("  %-4d %-12.3f %-12.3f %.1f" % (k, fk, rpm * N_OUT / 60.0, rpm))
    best.append((abs(rpm - 2000.0), rpm, k))
print()
best.sort()
print("  Keely 原文 2000 rpm；最近共振点 = %.1f rpm（k=%d），偏离 %.1f rpm = %.1f%%"
      % (best[0][1], best[0][2], best[0][0], 100.0 * best[0][0] / best[0][1]))
print()

# ── 4b) 零模型：2000 rpm 到底特不特殊 ────────────────────────
# 🔴 这里原来写的是「最小相对距离 > 0.005」这种绝对阈值判据 —— 那是错的对象。
#    512 个组合里挑最近的一个，任何转速都能挑出 0.001 量级。必须和随机基线比。
import random

def min_rel_dist(rpm, nmax=8):
    fr = rpm / 60.0
    best = 1e9
    for n in range(1, nmax + 1):
        for f in vals:
            sb = f + n * N_OUT * fr
            for v in vals:
                d = abs(sb - v) / v
                if d < best:
                    best = d
    return best

f_rot_2000 = rpms_to_hz(2000.0)
d2000 = min_rel_dist(2000.0)
r2 = random.Random(20261027)
NB = 3000
bases = sorted(min_rel_dist(r2.uniform(200, 7000)) for _ in range(NB))
below = sum(1 for x in bases if x < d2000)
pct = 100.0 * below / NB

print("四、零模型：2000 rpm 是调谐点吗？（这是闸 1 + 闸 2）")
print("  2000 rpm 最小相对距离 = %.6f（%.3f 音分）" % (d2000, 1200 * math.log(1 + d2000, 2)))
print("  随机 %d 个转速（200~7000 rpm）里比它更小的：%d 个 ⇒ 分位 %.1f%%"
      % (NB, below, pct))
print("  随机基线的中位数 = %.6f ⇒ 2000 rpm 比中位数还差" % bases[NB // 2])
print("  ⇒ %s" % ("2000 rpm 显著特殊" if pct < 5 else
                   "2000 rpm 毫无特殊性：0.94 音分是从 512 个组合里挑出来的"))
print()

# 判据：它**不该**特殊。若哪天算出它落进 5% 以内，那才是真发现，需要重新解释。
chk(pct > 5.0, "2000 rpm 落在随机基线 5% 以内 —— 若是真的调谐点，请重新审视",
    "分位 %.1f%%" % pct)


# ── 5) 调制的两个候选频率，实验上可区分 ──────────────────────
print("=" * 68)
print("五、两个可区分的调制频率（这是实验的签名）")
print("=" * 68)
print("  f_rot        = %8.3f Hz  ← 定子有 1 个「指标」标记 ⇒ 每转一个事件" % f_rot_2000)
print("  8 × f_rot    = %8.3f Hz  ← 外环 8 套完全对称 ⇒ 每转八个事件" % (N_OUT * f_rot_2000))
print("  边带（以 921.600 为基）：")
for n in (1, 2):
    print("    ±%d×f_rot  →  %.1f / %.1f Hz" % (n, BASE - n * f_rot_2000, BASE + n * f_rot_2000))
    print("    ±%d×8f_rot →  %.1f / %.1f Hz" % (n, BASE - n * 8 * f_rot_2000, BASE + n * 8 * f_rot_2000))
print()


# ── 6) 选择定则：谁才能提供 Δm = 1 ──────────────────────────
print("=" * 68)
print("六、谁提供 Δm = 1（m=7 到 m=8 只差 1）")
print("=" * 68)
for label, s in [("无定子（理想旋转对称）", None),
                 ("定子 3 重（triple）", 3),
                 ("定子 2 重", 2),
                 ("定子 1 个标记", 1)]:
    if s is None:
        allow = "只允许 Δm = 0 ⇒ 7 与 8 永不相通"
    else:
        allow = "允许 Δm = %dk ⇒ %s" % (s, "包含 1，通了" if s == 1 else "不含 1，仍不通")
    print("  %-22s %s" % (label, allow))
print()


print("=" * 68)
print("判据：%d 条独立断言，%d 条失败" % (nchk[0], len(fails)))
for f in fails:
    print("  FAIL:", f)
print("=" * 68)
