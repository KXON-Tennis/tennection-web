"""球友的球袋：品牌分布。數字來自 2026-10-10 的唯讀查詢（在役、真人帳號）。"""
from common import *
T=DARK
RACKETS=[('Wilson',41),('Babolat',29),('HEAD',26),('YONEX',23),('Prince',5),('Tecnifibre',3),('Dunlop',2)]
SHOES=[('ASICS',24),('Nike',8),('On',6),('K-Swiss',6),('adidas',5),('Babolat',3)]
NR,NS=133,63
TOP=('Babolat Pure Drive',8)
o=head('球友的球袋裡，都裝了什麼？',f'{NR} 支球拍 · {NS} 雙球鞋，都是球友自己登錄的')
def bars(y,title,rows,rowh):
    out=[f'<text x="80" y="{y}" font-size="32" font-weight="800" fill="{T["label"]}">{title}</text>']
    mx=rows[0][1]; y+=26
    for i,(name,n) in enumerate(rows):
        yy=y+i*rowh; w=max(8,round(560*n/mx))
        out.append(f'<text x="80" y="{yy+30}" font-size="27" fill="{T["label"]}">{name}</text>')
        out.append(f'<rect x="300" y="{yy+8}" width="{w}" height="28" rx="14" fill="{T["accent"] if i==0 else T["dim"]}"/>')
        out.append(f'<text x="{300+w+16}" y="{yy+32}" font-size="25" font-weight="700" fill="{T["accent"] if i==0 else T["sub"]}">{n}</text>')
    return out
o+=bars(360,'球拍',RACKETS,52)
y=760
o.append(f'<rect x="80" y="{y}" width="920" height="100" rx="26" fill="{T["panel"]}" stroke="{T["edge"]}" stroke-width="2"/>')
o.append(f'<text x="116" y="{y+61}" font-size="26" fill="{T["sub"]}">最多人用的一支</text>')
o.append(f'<text x="330" y="{y+62}" font-size="32" font-weight="800" fill="{T["title"]}">{TOP[0]}</text>')
o.append(f'<text x="964" y="{y+62}" font-size="28" font-weight="800" fill="{T["accent"]}" text-anchor="end">{TOP[1]} 支</text>')
o+=bars(930,'球鞋',SHOES,48)
o+=foot()
open(os.path.join(HERE,'gear-bag.svg'),'w').write('\n'.join(o))
