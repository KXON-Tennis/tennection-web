from map import *
F="font-family=\"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Noto Sans TC', 'Helvetica Neue', Arial, sans-serif\""
pos={5:(560,262),6:(660,262),7:(800,262),8:(950,372),2:(330,580),3:(330,690),0:(270,960),1:(270,1070),4:(350,1180)}
labels=[((610,336),'桃園 中路'),((800,336),'新北 微風運河'),((950,450),'台北 華中橋下'),((330,768),'台中 逢甲・東山高中'),((200,1180),'高雄 鎮海・民生')]
R=42
o=[f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {H}" {F}>',
   f'<rect width="{W}" height="{H}" fill="#FBFAF6"/>','<rect width="1080" height="14" fill="#1B5138"/>']
o.append('<g fill="#E4EAD9" stroke="#FBFAF6" stroke-width="1.2" stroke-linejoin="round">'+''.join(f'<path d="{d}"/>' for d in paths)+'</g>')
o.append('<text x="80" y="110" font-size="54" font-weight="800" fill="#1B5138">台灣各地，已經有球隊在這裡紮營</text>')
o.append('<text x="80" y="160" font-size="30" fill="#6E776F">9 支球隊 · 5 個城市，每一隊都有自己的主場</text>')
defs=[]
for t in teams:
    x,y=pos[t['i']]; px,py=t['p']
    o.append(f'<line x1="{px:.0f}" y1="{py:.0f}" x2="{x}" y2="{y}" stroke="#9BB59A" stroke-width="2.5"/>')
for t in teams:
    px,py=t['p']; o.append(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="7" fill="#3F7C43" stroke="#FFFFFF" stroke-width="2.5"/>')
for t in teams:
    x,y=pos[t['i']]
    if t['logo'] and os.path.exists(t['logo']):
        ext=t['logo'].rsplit('.',1)[1]; b=base64.b64encode(open(t['logo'],'rb').read()).decode()
        defs.append(f'<clipPath id="c{t["i"]}"><circle cx="{x}" cy="{y}" r="{R}"/></clipPath>')
        o.append(f'<circle cx="{x}" cy="{y}" r="{R+5}" fill="#FFFFFF" stroke="#DCD9CF" stroke-width="2"/>')
        o.append(f'<image x="{x-R}" y="{y-R}" width="{2*R}" height="{2*R}" preserveAspectRatio="xMidYMid slice" clip-path="url(#c{t["i"]})" href="data:image/{ext};base64,{b}"/>')
    else:
        o.append(f'<circle cx="{x}" cy="{y}" r="{R+5}" fill="#FFFFFF" stroke="#DCD9CF" stroke-width="2"/>')
        o.append(f'<circle cx="{x}" cy="{y}" r="{R}" fill="#1B5138"/>')
        o.append(f'<circle cx="{x}" cy="{y}" r="18" fill="#D8E64A"/>')
        o.append(f'<path d="M{x-18} {y-5} q 12 5 9 22 M{x+18} {y+5} q -12 -5 -9 -22" fill="none" stroke="#1B5138" stroke-width="2.5" stroke-linecap="round"/>')
for (x,y),txt in labels:
    o.append(f'<text x="{x}" y="{y}" font-size="24" font-weight="700" fill="#2E5A34" text-anchor="middle" stroke="#FBFAF6" stroke-width="6" paint-order="stroke">{txt}</text>')
o.insert(3,'<defs>'+''.join(defs)+'</defs>')
o.append('<text x="540" y="1310" font-size="30" text-anchor="middle" fill="#9BA29B">Your tennis life, <tspan fill="#1B5138" font-weight="800">connected.</tspan></text>')
o.append('</svg>')
open('teams-map.svg','w').write('\n'.join(o))
