"""左手持拍、單手反拍。數字來自 2026-10-10 的唯讀查詢：分母只算有填那一欄的真人帳號。
除了「左手又單反」只有 1 位直接寫人數，其他一律用比例（樣本小，人數沒有意義）。"""
from common import *
T=DARK
LEFTY=(6,110)      # 左手持拍 / 有填慣用手
ONE_HAND=(22,107)  # 單反 / 有填反拍
BOTH=1             # 左手且單反
def pct(a): return int(a[0]*100/a[1]+0.5)
o=head('左手持拍、單手反拍，各有多少？','')
def panel(y,label,p,per,lit):
    out=[f'<rect x="80" y="{y}" width="920" height="290" rx="30" fill="{T["panel"]}" stroke="{T["edge"]}" stroke-width="2"/>',
         f'<text x="124" y="{y+70}" font-size="32" font-weight="800" fill="{T["label"]}">{label}</text>',
         f'<text x="124" y="{y+178}" font-size="104" font-weight="800" fill="{T["accent"]}">{p}%</text>',
         f'<text x="124" y="{y+236}" font-size="27" fill="{T["sub"]}">{per}</text>']
    # 20 個點：亮起來的是那一種人
    for i in range(20):
        cx=560+(i%5)*84; cy=y+70+(i//5)*52
        on=i<lit
        out.append(f'<circle cx="{cx}" cy="{cy}" r="17" fill="{T["accent"] if on else T["land"]}"/>')
    return out
o+=panel(320,'左手持拍',pct(LEFTY),f'大約每 {round(100/pct(LEFTY))} 位就有 1 位',round(pct(LEFTY)/5))
o+=panel(640,'單手反拍',pct(ONE_HAND),f'大約每 {round(100/pct(ONE_HAND))} 位就有 1 位',round(pct(ONE_HAND)/5))
y=960
o.append(f'<rect x="80" y="{y}" width="920" height="230" rx="30" fill="#1B2A12" stroke="{T["dim"]}" stroke-width="2"/>')
o.append(f'<text x="124" y="{y+70}" font-size="32" font-weight="800" fill="{T["label"]}">左手持拍又單反</text>')
o.append(f'<text x="124" y="{y+178}" font-size="104" font-weight="800" fill="{T["accent"]}">只有 {BOTH} 位</text>')
o.append(f'<text x="976" y="{y+178}" font-size="28" fill="{T["sub"]}" text-anchor="end">你認識這位球友嗎？</text>')
o+=foot()
open(os.path.join(HERE,'play-style.svg'),'w').write('\n'.join(o))
