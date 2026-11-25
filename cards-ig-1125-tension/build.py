"""IG 輪播「你的磅數有小數點嗎？」7 張（深色，同 cards-ig-1010 的版頭版尾）。
數字在 stats.json（2026-11-25 唯讀查詢：在役球拍、排除審核帳號；直線磅數每支一個；
舊版整數欄位吃掉小數點的 495／485 還原成 49.5／48.5）。
重出：AS_OF=11/25 python3 build.py，再用 render.mjs 轉 PNG。"""
import os, sys, json
ME = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(ME), "cards-ig-1010"))
os.environ.setdefault('AS_OF', '11/25')
from common import *  # noqa
T = DARK
S = json.load(open(os.path.join(ME, 'stats.json')))
A, SUB, LBL, DIM = T['accent'], T['sub'], T['label'], T['dim']

def save(name, o):
    open(os.path.join(ME, f'{name}.svg'), 'w').write('\n'.join(o))

def page(n):
    return f'<text x="1000" y="1310" font-size="24" fill="{SUB}" text-anchor="end">{n}/7</text>'

# 1 封面
o = head('你的磅數有小數點嗎？', f'{S["players"]} 位球友、{S["rackets"]} 支在用的球拍', size=56)
o += [f'<text x="540" y="760" font-size="300" font-weight="900" fill="{A}" text-anchor="middle">52<tspan fill="{T["title"]}">.</tspan>5</text>',
      f'<text x="540" y="860" font-size="48" font-weight="700" fill="{LBL}" text-anchor="middle">磅</text>',
      f'<text x="540" y="1010" font-size="34" fill="{SUB}" text-anchor="middle">半磅，不少人穿線時會這樣要求。</text>',
      f'<text x="540" y="1062" font-size="34" fill="{SUB}" text-anchor="middle">看看大家都穿幾磅 →</text>']
o += foot(); o.insert(-1, page(1)); save('1-cover', o)

# 2 半磅的球友
o = head('有一位球友，兩支拍子都穿半磅', '同一支拍子，直線和橫線差半磅到一磅半')
def racket(y, label, main, cross):
    def num(x, v):
        s = f'{v:g}'
        if '.' in s:
            a, b = s.split('.')
            t = f'{a}<tspan fill="{A}">.{b}</tspan>'
        else:
            t = s
        return f'<text x="{x}" y="{y+190}" font-size="120" font-weight="900" fill="{T["title"]}" text-anchor="middle">{t}</text>'
    return [f'<rect x="80" y="{y}" width="920" height="270" rx="34" fill="{T["panel"]}" stroke="{T["edge"]}" stroke-width="2"/>',
            f'<text x="120" y="{y+62}" font-size="30" font-weight="700" fill="{SUB}">{label}</text>',
            f'<text x="310" y="{y+92}" font-size="28" fill="{SUB}" text-anchor="middle">直線</text>', num(310, main),
            f'<text x="770" y="{y+92}" font-size="28" fill="{SUB}" text-anchor="middle">橫線</text>', num(770, cross),
            f'<text x="540" y="{y+175}" font-size="44" fill="{DIM}" text-anchor="middle">／</text>']
o += racket(360, '第一支', 49, 49.5) + racket(680, '第二支', 50, 48.5)
o += [f'<text x="80" y="1080" font-size="34" fill="{LBL}">會在意到這個程度的，</text>',
      f'<text x="80" y="1132" font-size="34" fill="{LBL}">通常也很清楚自己要什麼手感。</text>']
o += foot(); o.insert(-1, page(2)); save('2-half', o)

# 3 整體磅數：直方圖
o = head('整體磅數', f'最低 {S["min"]:g}　最高 {S["max"]:g}　中位數 {S["median"]:g} 磅')
hist = {int(k): v for k, v in S['hist'].items()}
top3 = sorted(hist, key=lambda k: -hist[k])[:3]
x0, x1, base, top = 110, 970, 1000, 430
bw = (x1 - x0) / len(hist); mx = max(hist.values())
for i, (k, v) in enumerate(sorted(hist.items())):
    h = max(6, (base - top) * v / mx); x = x0 + i * bw
    hot = k in top3
    o.append(f'<rect x="{x+6:.0f}" y="{base-h:.0f}" width="{bw-12:.0f}" height="{h:.0f}" rx="10" fill="{A if hot else DIM}"/>')
    o.append(f'<text x="{x+bw/2:.0f}" y="{base+44}" font-size="24" fill="{LBL if hot else SUB}" text-anchor="middle">{k}</text>')
    if hot:
        o.append(f'<text x="{x+bw/2:.0f}" y="{base-h-16:.0f}" font-size="30" font-weight="800" fill="{A}" text-anchor="middle">{v}</text>')
o.append(f'<text x="540" y="{base+90}" font-size="24" fill="{SUB}" text-anchor="middle">磅（直線，每支球拍一個）</text>')
o += [f'<text x="80" y="1190" font-size="34" fill="{LBL}">最常見：<tspan font-weight="800" fill="{T["title"]}">50 磅 {hist[50]} 支、48 磅 {hist[48]} 支、52 磅 {hist[52]} 支</tspan></text>',
      f'<text x="80" y="1240" font-size="30" fill="{SUB}">大部分人落在 48–52 之間</text>']
o += foot(); o.insert(-1, page(3)); save('3-overall', o)

# 4 直橫差幾磅
o = head('直線和橫線要不要差幾磅？', f'有填直線和橫線的 {S["withcross"]} 支')
rows = [('直橫一樣', S['same']), ('橫線比直線低 2 磅', S['minus2']), ('橫線比直線高 2 磅', S['plus2'])]
mx = max(v for _, v in rows)
for i, (lab, v) in enumerate(rows):
    y = 420 + i * 190; w = max(12, 820 * v / mx)
    o += [f'<text x="80" y="{y}" font-size="36" font-weight="700" fill="{LBL}">{lab}</text>',
          f'<rect x="80" y="{y+28}" width="{w:.0f}" height="64" rx="32" fill="{A if i < 2 else DIM}"/>',
          f'<text x="{80+w+20:.0f}" y="{y+74}" font-size="40" font-weight="800" fill="{A if i < 2 else SUB}">{v} 支</text>']
o += [f'<text x="80" y="1100" font-size="38" font-weight="800" fill="{T["title"]}">前兩種做法幾乎一樣多。</text>']
o += foot(); o.insert(-1, page(4)); save('4-diff', o)

# 5 混合線
o = head('混合線（子母線）', f'有填線名的 {S["named"]} 支球拍裡')
o += [f'<text x="80" y="520" font-size="190" font-weight="900" fill="{A}">{S["hybrid"]}</text>',
      f'<text x="400" y="450" font-size="48" font-weight="800" fill="{LBL}">支是混合線</text>',
      f'<text x="400" y="512" font-size="34" fill="{SUB}">大約四支裡有一支</text>']
for i in range(4):  # 四支拍子，一支亮
    cx = 170 + i * 120
    c = A if i == 0 else DIM
    o += [f'<ellipse cx="{cx}" cy="640" rx="40" ry="54" fill="none" stroke="{c}" stroke-width="8"/>',
          f'<rect x="{cx-6}" y="694" width="12" height="70" rx="6" fill="{c}"/>']
o.append(f'<text x="80" y="860" font-size="32" font-weight="800" fill="{LBL}">常見組合</text>')
combos = ['Luxilon Alu Power Rough ＋ Wilson NXT', 'Head Lynx Tour ＋ Head Hawk Touch',
          'Solinco Hyper-G Soft ＋ Solinco Outlast', 'Yonex Polytour Rev ＋ Polytour Force／Black Code']
for i, c in enumerate(combos):
    y = 900 + i * 86
    o += [f'<rect x="80" y="{y}" width="920" height="70" rx="22" fill="{T["panel"]}" stroke="{T["edge"]}" stroke-width="2"/>',
          f'<text x="112" y="{y+46}" font-size="30" fill="{T["title"]}">{c}</text>']
o += foot(); o.insert(-1, page(5)); save('5-hybrid', o)

# 6 最多人用的線
o = head('最多人用的線', '同系列合併（不分粗細、光面／粗面），用人數算')
top = S['top']; mx = top[0][1]
for i, (name, v) in enumerate(top):
    y = 380 + i * 135; w = max(12, 600 * v / mx)
    o += [f'<text x="80" y="{y+40}" font-size="34" font-weight="700" fill="{LBL}">{name}</text>',
          f'<rect x="80" y="{y+62}" width="{w:.0f}" height="40" rx="20" fill="{A if i < 2 else DIM}"/>',
          f'<text x="{80+w+18:.0f}" y="{y+94}" font-size="34" font-weight="800" fill="{A if i < 2 else SUB}">{v} 人</text>']
o += foot(); o.insert(-1, page(6)); save('6-strings', o)

# 7 結尾
o = head('你穿幾磅？有小數點嗎？', '1.49 版起，磅數可以填到小數點後一位', size=56)
o += [f'<rect x="140" y="430" width="800" height="300" rx="40" fill="{T["panel"]}" stroke="{T["edge"]}" stroke-width="2"/>',
      f'<text x="200" y="510" font-size="30" fill="{SUB}">磅數</text>',
      f'<text x="200" y="650" font-size="140" font-weight="900" fill="{T["title"]}">52<tspan fill="{A}">.5</tspan></text>',
      f'<text x="880" y="650" font-size="44" font-weight="700" fill="{SUB}" text-anchor="end">磅</text>',
      f'<text x="80" y="860" font-size="34" fill="{LBL}">在護照登錄球拍、換線時記一筆，</text>',
      f'<text x="80" y="912" font-size="34" fill="{LBL}">之後記練習會自動帶上當時的線和磅數。</text>',
      f'<text x="80" y="1060" font-size="32" fill="{SUB}">App Store／Google Play 搜尋 <tspan font-weight="800" fill="{A}">Tennis Nut</tspan></text>']
o += foot(); o.insert(-1, page(7)); save('7-outro', o)
print('ok')
