"""全台球場征服地圖。資料：conquered.json（非匿名足跡、不含練習牆與廢棄，console 唯讀查詢產生）。"""
import json,os,sys
os.environ.setdefault('MAP_TOP','350'); os.environ.setdefault('MAP_BOT','1250')
from map import P,paths
from common import *
T=DARK
cs=json.load(open(os.environ.get('CONQ_JSON',os.path.join(HERE,'conquered.json'))))
tw=[c for c in cs if c['lat'] and 21.8<c['lat']<25.4 and 119.2<c['lng']<122.1]
cities=len({c['city'] for c in tw})
TOTAL=int(os.environ.get('TW_TOTAL','954')); USERS=int(os.environ.get('CONQUERORS','94'))
o=head(f'全台 {TOTAL} 座球場，球友已經征服 {len(tw)} 座',f'{USERS} 位球友 · {cities} 個縣市，每一座都是真的去打過')
o.append(f'<g fill="{T["land"]}" stroke="{T["bg"]}" stroke-width="1.2" stroke-linejoin="round">'+''.join(f'<path d="{d}"/>' for d in paths)+'</g>')
o.append(f'<defs><radialGradient id="glow"><stop offset="0" stop-color="{T["accent"]}" stop-opacity="0.55"/><stop offset="1" stop-color="{T["accent"]}" stop-opacity="0"/></radialGradient></defs>')
pts=[P(c['lng'],c['lat']) for c in tw]
o.append('<g>'+''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="16" fill="url(#glow)"/>' for x,y in pts)+'</g>')
o.append('<g>'+''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5.5" fill="{T["accent"]}"/>' for x,y in pts)+'</g>')
# 右下角說明
x0,y0=730,900
o.append(f'<rect x="{x0}" y="{y0}" width="290" height="250" rx="28" fill="{T["panel"]}" stroke="{T["edge"]}" stroke-width="2"/>')
o.append(f'<text x="{x0+32}" y="{y0+92}" font-size="76" font-weight="800" fill="{T["accent"]}">{len(tw)}</text>')
o.append(f'<text x="{x0+32}" y="{y0+136}" font-size="27" fill="{T["label"]}">座球場被征服</text>')
o.append(f'<text x="{x0+32}" y="{y0+186}" font-size="22" fill="{T["sub"]}">有人在那裡打過球、</text>')
o.append(f'<text x="{x0+32}" y="{y0+218}" font-size="22" fill="{T["sub"]}">留下了紀錄</text>')
o+=foot()
open(os.path.join(HERE,'conquest-map.svg'),'w').write('\n'.join(o)); print(len(tw),'dots',cities,'cities')
