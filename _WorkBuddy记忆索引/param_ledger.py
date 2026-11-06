# -*- coding: utf-8 -*-
"""参数台账：把 `PARAM|参数|旧→新|vX.YY` 行 + 种子数据合成「版本 × 参数」矩阵。

用法：
  python param_ledger.py            # 生成 param_matrix.html / param_matrix.json
  python param_ledger.py --append "N 上限|420|600|v9.58"   # 追加一条（不改 memory）
以后在记忆里写 PARAM 行，重跑即可自动进矩阵。
"""
import io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = r"C:\Users\ThinkPad\WorkBuddy"
SEED = os.path.join(HERE, "param_seed.json")
TIMELINE = os.path.join(HERE, "koilon_v9_timeline.json")
OUT_JSON = os.path.join(HERE, "param_matrix.json")
OUT_HTML = os.path.join(HERE, "param_matrix.html")

PARAM_RE = re.compile(r"PARAM\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*[→>]\s*([^|]+?)\s*\|\s*(v9\.\d+)")


def scan_param_lines():
    """扫记忆里的 PARAM|参数|旧→新|版本 行。"""
    ev = []
    if not os.path.isdir(ROOT):
        return ev
    for dirpath, _d, files in os.walk(ROOT):
        if not dirpath.endswith(os.path.join(".workbuddy", "memory")):
            continue
        for fn in files:
            if not fn.endswith(".md") or ".bak" in fn:
                continue
            p = os.path.join(dirpath, fn)
            try:
                txt = io.open(p, encoding="utf-8", errors="replace").read()
            except OSError:
                continue
            m = re.match(r"(\d{4}-\d{2}-\d{2})", fn)
            date = m.group(1) if m else ""
            for line in txt.splitlines():
                mm = PARAM_RE.search(line)
                if mm:
                    ev.append({"p": mm.group(1), "old": mm.group(2), "new": mm.group(3),
                               "v": mm.group(4), "d": date, "src": "PARAM 行：" + line.strip()[:60]})
    return ev


def load_events():
    seed = json.load(io.open(SEED, encoding="utf-8"))
    ev = list(seed["events"])
    have = {(e["p"], e["v"]) for e in ev}
    for e in scan_param_lines():
        if (e["p"], e["v"]) not in have:
            ev.append(e)
            have.add((e["p"], e["v"]))
    # 参数顺序：先 seed 声明，再按出现补
    params = list(seed["params"])
    for e in ev:
        if e["p"] not in params:
            params.append(e["p"])
    return params, ev


def vnum(v):
    return int(v.split(".")[1])


def build_matrix(params, ev):
    versions = [x["v"] for x in json.load(io.open(TIMELINE, encoding="utf-8"))]
    versions = sorted(set(versions), key=vnum)
    by_ver = {}
    for e in ev:
        by_ver.setdefault(e["v"], []).append(e)

    rows = []
    cur = {p: None for p in params}
    for v in versions:
        changed = {}
        for e in by_ver.get(v, []):
            if e["p"] in cur:
                cur[e["p"]] = e["new"]
                changed[e["p"]] = e
        rows.append({"v": v, "n": vnum(v), "vals": dict(cur), "changed": changed})
    return rows, versions


def build_html(params, rows, ev):
    def cell(p, r):
        e = r["changed"].get(p)
        if e:
            return f'<td class="chg" title="{e["src"]}"><b>{e["new"]}</b></td>'
        val = r["vals"][p]
        if val is None:
            return '<td class="na">—</td>'
        return f'<td class="inh">{val}</td>'

    head = "".join(f"<th>{p}</th>" for p in params)
    body = []
    for r in rows:
        tds = "".join(cell(p, r) for p in params)
        body.append(f'<tr><td class="ver">{r["v"]}</td>{tds}</tr>')

    cnt = {}
    for e in ev:
        cnt[e["p"]] = cnt.get(e["p"], 0) + 1
    stats = "　·　".join(f"{p} ×{cnt.get(p, 0)}" for p in params)

    return f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>参数台账 · 版本 × 参数</title>
<style>
 :root{{--ink:#1a1f24;--muted:#79828b;--line:#e4dfd5;--paper:#fbfaf7;--crimson:#9b1c31;--teal:#0e6b63}}
 *{{box-sizing:border-box}}
 body{{margin:0;background:var(--paper);color:var(--ink);font-family:"Segoe UI","Microsoft YaHei",system-ui,sans-serif;font-size:14px}}
 .wrap{{max-width:1040px;margin:0 auto;padding:34px 26px 80px}}
 h1{{font-size:26px;margin:0 0 6px}} .sub{{color:var(--muted);font-size:13px;margin-bottom:18px}}
 .kpi{{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}}
 .kpi div{{background:#fff;border:1px solid var(--line);border-radius:10px;padding:9px 16px}}
 .kpi b{{display:block;font-size:20px}} .kpi span{{font-size:11.5px;color:var(--muted)}}
 table{{width:100%;border-collapse:collapse;font-size:12.8px;background:#fff}}
 th,td{{border:1px solid var(--line);padding:5px 8px;text-align:center}}
 th{{background:#f3efe7;font-weight:600;position:sticky;top:0;z-index:2}}
 td.ver{{font-family:Consolas,monospace;font-weight:600;background:#faf8f4;position:sticky;left:0}}
 td.chg{{background:#fdf3f4;color:var(--crimson)}}
 td.inh{{color:#9aa3ab}}
 td.na{{color:#d0d6db}}
 .legend{{margin-top:12px;font-size:12.5px;color:var(--muted);line-height:1.8}}
 .sw{{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;margin-right:5px}}
</style></head><body><div class="wrap">
<h1>参数台账 · 版本 × 参数</h1>
<div class="sub">由 <code>param_ledger.py</code> 生成：种子 6 条 + 记忆里的 <code>PARAM|参数|旧→新|版本</code> 行 · 共 {len(ev)} 次变更</div>
<div class="kpi">
  <div><b>{len(rows)}</b><span>版本</span></div>
  <div><b>{len(ev)}</b><span>数值变更</span></div>
  <div><b>{len(params)}</b><span>参数列</span></div>
</div>
<table><thead><tr><th style="width:70px">版本</th>{head}</tr></thead><tbody>
{''.join(body)}
</tbody></table>
<div class="legend">
 <span class="sw" style="background:#fdf3f4;border:1px solid #e8c9ce"></span>该版本发生了变更（红字，鼠标悬停看依据）　
 <span class="sw" style="background:#fff;border:1px solid #e4dfd5"></span>沿用上一版本　
 <span class="sw" style="background:#f4f5f6;border:1px solid #e4dfd5"></span>尚无记录<br>
 改动次数：{stats}<br>
 <b>怎么自动扩这张表：</b>以后每次改参数，在当天 memory 里写一行
 <code>PARAM|参数名|旧值→新值|v9.58</code>，重跑本脚本即可。
</div>
</div></body></html>"""


def main():
    params, ev = load_events()
    rows, versions = build_matrix(params, ev)
    json.dump({"params": params, "events": ev, "rows": [
        {"v": r["v"], "vals": r["vals"]} for r in rows]},
        io.open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    io.open(OUT_HTML, "w", encoding="utf-8").write(build_html(params, rows, ev))
    print(f"versions={len(rows)} events={len(ev)} params={len(params)}")
    for p in params:
        n = sum(1 for e in ev if e["p"] == p)
        print(f"  {p:10s} ×{n}")


if __name__ == "__main__":
    main()
