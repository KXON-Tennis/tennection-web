"""球友的球袋：品牌分布。數字來自 2026-10-10 的唯讀查詢（在役、真人帳號）。"""
from common import *
T=DARK
RACKETS=[('Wilson',41),('Babolat',29),('HEAD',26),('YONEX',23),('Prince',5),('Tecnifibre',3),('Dunlop',2)]
SHOES=[('ASICS',24),('Nike',8),('On',6),('K-Swiss',6),('adidas',5),('Babolat',3)]
NR,NS=133,63
# 最多人拿的球拍：依人數算（同一人兩支只算一次），分母是有登錄球拍的 94 人。
TOP=('Babolat Pure Drive',9); HOLDERS=94

def pct(rows,total):
    """佔全部的百分比，一般四捨五入：數量相同的就顯示相同的百分比，加總可能差 1%。
    沒列出的品牌併成「其他」。"""
    rows=rows+[('其他',total-sum(n for _,n in rows))]
    return [(name,int(n*100/total+0.5)) for name,n in rows]
RACKETS=pct(RACKETS,NR); SHOES=pct(SHOES,NS)
o=head('球友的球袋裡，都裝了什麼？',f'{NR} 支球拍 · {NS} 雙球鞋，都是球友自己登錄的')
def bars(y,title,rows,rowh,other_note=None):
    out=[f'<text x="80" y="{y}" font-size="32" font-weight="800" fill="{T["label"]}">{title}</text>']
    mx=max(n for _,n in rows); y+=26
    for i,(name,n) in enumerate(rows):
        yy=y+i*rowh; w=max(8,round(560*n/mx))
        out.append(f'<text x="80" y="{yy+30}" font-size="27" fill="{T["label"]}">{name}</text>')
        out.append(f'<rect x="300" y="{yy+8}" width="{w}" height="28" rx="14" fill="{T["accent"] if i==0 else T["dim"]}"/>')
        out.append(f'<text x="{300+w+16}" y="{yy+32}" font-size="25" font-weight="700" fill="{T["accent"] if i==0 else T["sub"]}">{n}%</text>')
        if name=='其他' and other_note:
            out.append(f'<text x="{300+w+16+len(str(n))*15+40}" y="{yy+32}" font-size="23" fill="{T["sub"]}">（{other_note}）</text>')
    return out
o+=bars(350,'球拍',RACKETS,45)
y=752
o.append(f'<rect x="80" y="{y}" width="920" height="92" rx="26" fill="{T["panel"]}" stroke="{T["edge"]}" stroke-width="2"/>')
o.append(f'<text x="116" y="{y+57}" font-size="26" fill="{T["sub"]}">最多人拿的球拍</text>')
o.append(f'<text x="330" y="{y+58}" font-size="32" font-weight="800" fill="{T["title"]}">{TOP[0]}</text>')
o.append(f'<text x="964" y="{y+58}" font-size="28" font-weight="800" fill="{T["accent"]}" text-anchor="end">{int(TOP[1]*100/HOLDERS+0.5)}% 的球友</text>')
# 「其他」裡填在型號欄的品牌（brand=other）：李寧、Lotto、Artengo
o+=bars(904,'球鞋',SHOES,42,other_note='李寧、Lotto 等')
o.append(f'<text x="1000" y="1258" font-size="20" fill="{T["foot"]}" text-anchor="end">百分比四捨五入，加總可能不是 100%</text>')
o+=foot()
open(os.path.join(HERE,'gear-bag.svg'),'w').write('\n'.join(o))
