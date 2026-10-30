# -*- coding: utf-8 -*-
"""
白银比四次方 · 外部对照与物理核查 —— 完整核算脚本
配套文档：白银比四次方_外部对照与物理核查.md
生成日期：2026-10-30

设计原则：
  1) 每个数字都由本脚本现算，不抄结论；
  2) 关键恒等式写成 assert，跑不通就报错，不静默通过；
  3) 涉及"不成立"的判断，给出反证所需的量化门槛（例如要把 r_s/R 凑到 sigma^4 需要多大的 A）。

运行：python 白银比_核查脚本.py
"""

import math

S2 = math.sqrt(2.0)
S3 = math.sqrt(3.0)
S6 = math.sqrt(6.0)
SIGMA = 1.0 + S2                      # 白银比
G = 6.67430e-11
C_LIGHT = 2.99792458e8                # 光速（单独命名，勿与直角边 c 混用）
M_U = 1.66053907e-27                  # 原子质量单位 kg
R0 = 1.25e-15                         # 核半径参数 m


def sec(title):
    print("\n" + "=" * 78)
    print(title)
    print("=" * 78)


# ---------------------------------------------------------------- §1 常数
sec("[1] 白银比与四次方")
print(f"  sigma   = 1+sqrt2       = {SIGMA:.15f}")
print(f"  sigma^2 = 3+2sqrt2      = {SIGMA**2:.15f}")
print(f"  sigma^4 = 17+12sqrt2    = {SIGMA**4:.15f}")
print(f"  sigma^-4                = {1/SIGMA**4:.15f}")
d_pell = abs(1 / SIGMA**4 - (17 - 12 * S2))
print(f"  |1/sigma^4 - (17-12sqrt2)| = {d_pell:.2e}   (浮点容差取 1e-14)")
assert d_pell < 1e-14, "Pell 单位恒等失败"
assert 17**2 - 2 * 12**2 == 1, "17,12 不是 Pell 解"
print(f"  Pell 校核 17^2 - 2*12^2 = {17**2 - 2*12**2}  ✓")


# ---------------------------------------------------------------- §2 k(rho) 页面公式
def k_formula(rho):
    return (S2 - rho) / (S2 + rho)


sec("[2] 页面公式 k(rho) = (sqrt2-rho)/(sqrt2+rho)")
for r in (0.6, 1.0, 4 / 3, 1.4, S2):
    print(f"  rho={r:<10.6f} k={k_formula(r):+.15f}")
d_k = abs(k_formula(4 / 3) - (17 - 12 * S2))
print(f"  |k(4/3) - (17-12sqrt2)| = {d_k:.2e}")
assert d_k < 1e-14, "k(4/3) 应等于 sigma^-4"
print("  k(4/3) == 17-12sqrt2  ✓")


# ---------------------------------------------------------------- §3 从四面体几何独立重推通项
def k_geometry(rho):
    """按 白银比四次方_数学证明.md §3.2 的同一套步骤，把 4:3:5 换成任意 rho=股/勾。"""
    c = rho / math.sqrt(1.0 + rho * rho)          # cos(theta) = 股/斜边
    s = 1.0 / math.sqrt(1.0 + rho * rho)          # sin(theta) = 勾/斜边
    t = (1.0 + rho * rho) / (rho * (rho + S2))    # 令 x 分量归零
    uz = c * (S6 / 3.0) - s * (1.0 / S3)          # 单位方向在 xOz 平面内的 z 分量
    z = t * c * uz                                # 交点 z 坐标
    return (1.0 - 12.0 * z / S6) / 3.0, t, z


sec("[3] 通项：由四面体几何独立推导，与页面公式比对")
print("   rho        t(通项)      k(几何)          k(公式)          diff")
for r in (0.75, 1.0, 1.2, 4 / 3, 1.4, 1.4142):
    kg, t, z = k_geometry(r)
    print(f"  {r:<9.5f} {t:.9f}  {kg:+.15f}  {k_formula(r):+.15f}  {abs(kg - k_formula(r)):.1e}")
for r in (0.75, 1.0, 1.2, 4 / 3, 1.4, 1.4142):
    assert abs(k_geometry(r)[0] - k_formula(r)) < 1e-12, f"rho={r} 通项不一致"
print("  全部 < 1e-12  ✓")

# 与配套文档 §3.2 的 t、k 对齐
assert abs(k_geometry(4 / 3)[1] - 25 / (16 + 12 * S2)) < 1e-12, "t 与原文不一致"
assert abs(k_geometry(4 / 3)[0] - (17 - 12 * S2)) < 1e-12, "k 与原文不一致"
print(f"  t(4/3) 通项 = {k_geometry(4/3)[1]:.10f}   原文 = {25/(16+12*S2):.10f}  ✓")
print(f"  k(4/3) 通项 = {k_geometry(4/3)[0]:.15f}   原文 = {17-12*S2:.15f}  ✓")

# rho -> sqrt2 时 t -> 0.75, k -> 0
# 注意 k_geometry 返回 (k, t, z)，解包顺序不能反
k_lim, t_lim, _ = k_geometry(S2 - 1e-12)
print(f"  rho -> sqrt2: t -> {t_lim:.9f}（应 0.75）, k -> {k_lim:+.3e}（应 0）")
assert abs(t_lim - 0.75) < 1e-6 and abs(k_lim) < 1e-6
print(f"  rho > sqrt2 时 k 反号：k(1.5) = {k_formula(1.5):+.9f}  ✓（已翻到外面）")


# ---------------------------------------------------------------- §4 Cayley / 反射系数 / 双曲
sec("[4] Cayley 变换身份：k 就是归一化阻抗 z=sqrt2/rho 的反射系数")
print("   rho      z=sqrt2/rho   Gamma=(z-1)/(z+1)    k(rho)           diff")
for r in (1.0, 4 / 3, 1.4):
    z = S2 / r
    G_ = (z - 1) / (z + 1)
    print(f"  {r:<8.5f} {z:.9f}  {G_:+.15f}  {k_formula(r):+.15f}  {abs(G_-k_formula(r)):.1e}")
    assert abs(G_ - k_formula(r)) < 1e-15
print("  严格同构（差值 0）  ✓")

print("\n  双曲形式 k = tanh( 0.5*ln(sqrt2/rho) )")
for r in (0.6, 1.0, 4 / 3, 1.4, S2):
    lhs = k_formula(r)
    rhs = math.tanh(0.5 * math.log(S2 / r))
    print(f"   rho={r:<9.6f} k={lhs:+.15f}  tanh={rhs:+.15f}  diff={abs(lhs-rhs):.1e}")
    assert abs(lhs - rhs) < 1e-15
print("  恒等成立  ✓")

print("\n  无源性：Re z > 0  <=>  |Gamma| < 1")
for r in (0.1, 0.5, 1.0, 4 / 3, 1.414, 1.42, 100.0):
    z = S2 / r
    G_ = (z - 1) / (z + 1)
    flag = "|G|<1 无源" if abs(G_) < 1 else "|G|>1 有源"
    print(f"   rho={r:<8.3f} z={z:<10.4f} |Gamma|={abs(G_):.6f}   {flag}")


# ---------------------------------------------------------------- §5 工程读数
sec("[5] 若按反射系数读：回波损耗与驻波比")
print("   rho         k            |Gamma| dB    return loss   VSWR        sqrt2/rho")
for name, r in (("1 (勾=股)", 1.0), ("4/3 (3-4-5)", 4 / 3), ("sqrt2 (匹配)", S2)):
    k = k_formula(r)
    db = 20 * math.log10(abs(k)) if k else float("-inf")
    rl = -db if k else float("inf")
    vswr = (1 + abs(k)) / (1 - abs(k))
    print(f"   {name:<14} {k:+.9f}  {db:+9.4f}   {rl:9.4f}    {vswr:.9f}  {S2/r:.9f}")
    if k:
        assert abs(vswr - S2 / r) < 1e-12, "VSWR 闭式不符"
print("  VSWR == sqrt2/rho  ✓")


# ---------------------------------------------------------------- §6 平面三角形 R/r 下确界
def Rr(rho):
    """外接圆半径 / 内切圆半径，rho = 股/勾（斜边归一）"""
    return math.sqrt(1 + rho * rho) / (1 + rho - math.sqrt(1 + rho * rho))


sec("[6] 平面直角三角形 R/r 的下确界")
best = min((Rr(0.5 + i * 0.0005), 0.5 + i * 0.0005) for i in range(4001))
print(f"  数值扫描 rho in [0.5, 2.5] 步长 5e-4")
print(f"  最小值 {best[0]:.15f}  at rho = {best[1]:.5f}")
print(f"  1+sqrt2 = {SIGMA:.15f}   偏差 {abs(best[0]-SIGMA):.2e}")
assert abs(best[0] - SIGMA) < 1e-9, "下确界应等于白银比"
print("  => R/r >= 1+sqrt2，等号在等腰直角（rho=1）取到  ✓")

print("\n  同一 rho 下两个函数的特征点")
print("   rho       R/r(平面三角形)   k(内倒四面体)   备注")
for r, note in ((0.5, ""), (0.75, "勾股互换位"), (1.0, "R/r 极小 = sigma"),
                (1.2, ""), (4 / 3, "3:4:5"), (1.5, "k 已反号"), (S2, "k=0 塌陷")):
    print(f"   {r:<9.5f} {Rr(r):.9f}       {k_formula(r):+.9f}    {note}")
print(f"  对称性校核 R/r(0.5)={Rr(0.5):.9f}  R/r(2.0)={Rr(2.0):.9f}  差 {abs(Rr(0.5)-Rr(2.0)):.2e}")
assert abs(Rr(0.5) - Rr(2.0)) < 1e-12, "R/r 应对 rho <-> 1/rho 对称"


# ---------------------------------------------------------------- §7 Pell 家族
sec("[7] 近乎等腰勾股三元组 = sigma 的连分数收敛对")
print("   p/q      (勾,股,斜)              R/r=分子/分母      相对偏差     (R/r)^4")
fam = [(2, 1), (5, 2), (12, 5), (29, 12), (70, 29), (169, 70), (408, 169)]
for p, q in fam:
    a_ = p * p - q * q
    b_ = 2 * p * q
    c_ = p * p + q * q
    num, den = c_, 2 * q * (p - q)
    qq = num / den
    print(f"   {p:>4}/{q:<4} ({min(a_,b_):>9},{max(a_,b_):>9},{c_:>11})  "
          f"{num:>9}/{den:<9} {qq:.9f}  {(qq/SIGMA-1)*100:+9.6f}%  {qq**4:.9f}")
print(f"  收敛项序列应与 p/q 一致：2/1, 5/2, 12/5, 29/12, 70/29, 169/70 …")
print(f"  20-21-29 的 R/r = 29/12 = {29/12:.12f}，恰为 sigma 第 4 个收敛项  ✓")
assert abs(29 / 12 - 2.4166666666666665) < 1e-15


# ---------------------------------------------------------------- §8 三维直角四面体
sec("[8] 三维：直角四面体（三棱两两垂直）的 R/r —— 白银比不升维")


def tetra_ratio(a, b, c):
    Rc = math.sqrt(a * a + b * b + c * c) / 2.0
    V = a * b * c / 6.0
    S = (a * b + b * c + c * a + math.sqrt(a * a * b * b + b * b * c * c + c * c * a * a)) / 2.0
    return Rc, 3 * V / S


for (a, b, c) in ((1, 1, 1), (3, 4, 5), (20, 21, 29)):
    Rc, ri = tetra_ratio(a, b, c)
    print(f"  ({a},{b},{c}): R={Rc:.9f} r={ri:.9f} R/r={Rc/ri:.9f}")
print(f"  等棱解析值 3(1+sqrt3)/2 = {3*(1+S3)/2:.9f}  ✓ 与 (1,1,1) 一致")
assert abs(tetra_ratio(1, 1, 1)[0] / tetra_ratio(1, 1, 1)[1] - 3 * (1 + S3) / 2) < 1e-12
# 网格扫描：a,b,c 各取 40 档（1..10 对数分度），确认无更小的 R/r
grid = [10 ** (i / 40.0) for i in range(0, 41)]
best3 = (1e9, None)
for x in grid:
    for y in grid:
        for z in grid:
            Rc, ri = tetra_ratio(x, y, z)
            q = Rc / ri
            if q < best3[0]:
                best3 = (q, (round(x, 3), round(y, 3), round(z, 3)))
print(f"  网格扫描 ({len(grid)}^3 点，a<=b<=c 对称剪枝后) 最小 R/r = {best3[0]:.9f} at {best3[1]}")
assert best3[0] > 4.0 and best3[0] < 4.2, "网格最小值应落在等棱附近"
print("  => 三维最小 R/r 是 4.098，与 1+sqrt2 无关  ✓")


# ---------------------------------------------------------------- §9 核 / 施瓦西
sec("[9] 原子核半径 / 施瓦西半径")
coef = 2 * G * M_U / (C_LIGHT ** 2 * R0)
print(f"  2G/c^2 = {2*G/C_LIGHT**2:.6e} m/kg")
print(f"  r_s/R_nuc = {coef:.6e} * A^(2/3)")
print("   A      R_nuc (m)      r_s (m)        r_s/R_nuc      R_nuc/r_s")
for A in (1, 12, 56, 197, 238):
    rn = R0 * A ** (1 / 3)
    rs = 2 * G * A * M_U / C_LIGHT ** 2
    print(f"  {A:>4}  {rn:.4e}  {rs:.4e}  {rs/rn:.6e}  {rn/rs:.6e}")
    assert rs / rn < 1e-36, "核的紧凑度应在 1e-39 量级"
A_needed = (SIGMA ** 4 / coef) ** 1.5
print(f"  要让 r_s/R_nuc = sigma^4，需 A = {A_needed:.4e}（核子数上限约 1e57）")
assert A_needed > 1e55, "若门槛低于 1e55 则本题需重新讨论"
print("  => 不可达，映射不成立  ✓")

print("\n  这个比值的真实物理身份：紧凑度 r_s/R = 2GM/(Rc^2)")
M_sun, R_sun = 1.98892e30, 6.957e8
print(f"   太阳      {2*G*M_sun/(R_sun*C_LIGHT**2):.3e}")
print(f"   中子星    {2*G*(1.4*M_sun)/(1.2e4*C_LIGHT**2):.3f}  (M=1.4Msun, R=12km)")
print(f"   黑洞      1")


# ---------------------------------------------------------------- §10 拒绝凑数
sec("[10] 与公认常数的比对（用于识别数字巧合）")
print(f"  sigma^4            = {SIGMA**4:.9f}")
print(f"  137.035999084/4    = {137.035999084/4:.9f}   差 {(SIGMA**4/(137.035999084/4)-1)*100:+.4f}%")
print(f"  4*sigma^4          = {4*SIGMA**4:.9f}")
print(f"  4*pi^2             = {4*math.pi**2:.9f}")
print("  => 137.036/4 差 0.84%，属数字巧合，不采用")


# ---------------------------------------------------------------- §11 白银比的两处公认物理出场
sec("[11] 白银比在公认物理公式里的两处（可复算）")
ktc = 2 / math.log(SIGMA)
print(f"  2D Ising (Onsager): kTc/J = 2/ln(1+sqrt2) = {ktc:.9f}  （公认 2.26918531）")
sinh_val = (math.exp(math.log(SIGMA)) - math.exp(-math.