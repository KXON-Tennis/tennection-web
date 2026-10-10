"""全台球隊主場地圖。python3 build.py [light|dark]

座標與 logo 從 teams.json 讀（由 console 的唯讀查詢產生，不進 repo）。
logo 位置寫成相對於主場的位移，地圖上下移動時連線不會跑掉。
"""
import sys
from map import *
THEME=sys.argv[1] if len(sys.argv)>1 else 'light'
T={
 'light':dict(bg='#FBFAF6',land='#E4EAD9',edge='#FBFAF6',title='#1B5138',sub='#6E776F',line='#9BB59A',dot='#3F7C43',dotEdge='#FFFFFF',ring='#FFFFFF',ringEdge='#DCD9CF',ball='#D8E64A',ballBg='#1B5138',label='#2E5A34',halo='#FBFAF6',foot='#9BA29B',footStrong='#1B5138',bar=True,brand=False),
 'dark': dict(bg='#11151a',land='#1F272E',edge='#11151a',title='#FFFFFF',sub='#9AA4AD',line='#5E7F2A',dot='#C6FF3C',dotEdge='#11151a',ring='#11151a',ringEdge='#C6FF3C',ball='#C6FF3C',ballBg='#1B5138',label='#E6EBEF',halo='#11151a',foot='#8A949C',footStrong='#C6FF3C',bar=False,brand=True),
}[THEME]
F="font-family=\"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Noto Sans TC', 'Helvetica Neue', Arial, sans-serif\""
OFF={5:(-139,-159),6:(-39,-159),7:(61,-135),8:(202,-47),2:(-214,-57),3:(-229,49),0:(-194,-95),1:(-194,15),4:(-109,134)}
LAB=[(5,(-89,-85),'桃園 中路'),(7,(61,-61),'新北 微風運河'),(8,(202,31),'台北 華中橋下'),(2,(-214,131),'台中 逢甲・東山高中'),(0,(-264,125),'高雄 鎮海・民生')]
R=42
# lib/core/theme/app_theme.dart 的 teamPalette 與 teamColorFor，照抄。
PALETTE=['#1E88E5','#3949AB','#00897B','#5E35B1','#0277BD','#00838F','#7B1FA2','#283593','#00695C','#4527A0']
def team_color(seed):
    h=0
    for cu in [int.from_bytes(seed.encode('utf-16-be')[i:i+2],'big') for i in range(0,len(seed.encode('utf-16-be')),2)]:
        h=(h*31+cu)&0x7FFFFFFF
    return PALETTE[h%len(PALETTE)]
pt={t['i']:t['p'] for t in teams}
def at(i,d): return (round(pt[i][0]+d[0]),round(pt[i][1]+d[1]))
def b64(p): return base64.b64encode(open(p,'rb').read()).decode()
o=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" {F}>',f'<rect width="{W}" height="{H}" fill="{T["bg"]}"/>']
defs=[]
if T['bar']: o.append(f'<rect width="1080" height="14" fill="{T["title"]}"/>')
ty=110
if T['brand']:
    web=os.path.dirname(HERE)
    o.append(f'<image x="80" y="52" width="84" height="84" href="data:image/png;base64,{b64(os.path.join(web,"app-icon.png"))}"/>')
    o.append(f'<image x="168" y="40" width="157" height="108" href="data:image/png;base64,{b64(os.path.join(web,"wordmark-white.png"))}"/>')
    ty=230
o.append(f'<g fill="{T["land"]}" stroke="{T["edge"]}" stroke-width="1.2" stroke-linejoin="round">'+''.join(f'<path d="{d}"/>' for d in paths)+'</g>')
o.append(f'<text x="80" y="{ty}" font-size="45" font-weight="800" fill="{T["title"]}">台灣各地，已經有球隊在自己主場陸續登錄囉</text>')
o.append(f'<text x="80" y="{ty+50}" font-size="30" fill="{T["sub"]}">9 支球隊 · 5 個城市，每一隊都有自己的主場</text>')
for t in teams:
    x,y=at(t['i'],OFF[t['i']]); px,py=t['p']
    o.append(f'<line x1="{px:.0f}" y1="{py:.0f}" x2="{x}" y2="{y}" stroke="{T["line"]}" stroke-width="2.5"/>')
for t in teams:
    px,py=t['p']; o.append(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="7" fill="{T["dot"]}" stroke="{T["dotEdge"]}" stroke-width="2.5"/>')
for t in teams:
    x,y=at(t['i'],OFF[t['i']])
    o.append(f'<circle cx="{x}" cy="{y}" r="{R+5}" fill="{T["ring"]}" stroke="{T["ringEdge"]}" stroke-width="2"/>')
    if t['logo'] and os.path.exists(t['logo']):
        ext=t['logo'].rsplit('.',1)[1]
        defs.append(f'<clipPath id="c{t["i"]}"><circle cx="{x}" cy="{y}" r="{R}"/></clipPath>')
        o.append(f'<image x="{x-R}" y="{y-R}" width="{2*R}" height="{2*R}" preserveAspectRatio="xMidYMid slice" clip-path="url(#c{t["i"]})" href="data:image/{ext};base64,{b64(t["logo"])}"/>')
    else:
        # 跟 App 一樣：隊伍顏色（AppTheme.teamColorFor）加白色的第一個字
        o.append(f'<circle cx="{x}" cy="{y}" r="{R}" fill="{team_color(t["id"])}"/>')
        o.append(f'<text x="{x}" y="{y+13}" font-size="{round(R*0.85)}" font-weight="700" fill="#FFFFFF" text-anchor="middle">{t["name"][0]}</text>')
for i,d,txt in LAB:
    x,y=at(i,d)
    o.append(f'<text x="{x}" y="{y}" font-size="24" font-weight="700" fill="{T["label"]}" text-anchor="middle" stroke="{T["halo"]}" stroke-width="6" paint-order="stroke">{txt}</text>')
o.insert(2,'<defs>'+''.join(defs)+'</defs>')
o.append(f'<text x="540" y="1310" font-size="30" text-anchor="middle" fill="{T["foot"]}">Your tennis life, <tspan fill="{T["footStrong"]}" font-weight="800">connected.</tspan></text>')
o.append('</svg>')
out=os.path.join(HERE,'teams-map'+('' if THEME=='light' else '-'+THEME)+'.svg')
open(out,'w').write('\n'.join(o)); print(out)
