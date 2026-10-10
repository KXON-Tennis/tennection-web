"""Reel 片尾：置中 logo、標語、去哪裡找。不放日期——片尾每一版都一樣。"""
from common import *
T=DARK
o=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" {F}>',f'<rect width="{W}" height="{H}" fill="{T["bg"]}"/>',
   f'<image x="420" y="380" width="240" height="240" href="data:image/png;base64,{b64(os.path.join(WEB,"app-icon.png"))}"/>',
   f'<image x="358" y="640" width="364" height="250" href="data:image/png;base64,{b64(os.path.join(WEB,"wordmark-white.png"))}"/>',
   f'<text x="540" y="960" font-size="40" text-anchor="middle" fill="{T["sub"]}">Your tennis life, <tspan fill="{T["accent"]}" font-weight="800">connected.</tspan></text>',
   f'<text x="540" y="1100" font-size="30" text-anchor="middle" fill="{T["label"]}">App Store / Google Play 搜尋 Tennis Nut</text>',
   f'<text x="540" y="1150" font-size="26" text-anchor="middle" fill="{T["foot"]}">tennisnut.kxon.net</text>','</svg>']
open(os.path.join(HERE,'outro.svg'),'w').write('\n'.join(o))
