"""IG 輪播三張卡共用：深色主題、版頭（logo + 標題 + 副標）、頁尾。"""
import os,base64
HERE=os.path.dirname(os.path.abspath(__file__)); WEB=os.path.dirname(HERE)
W,H=1080,1350
F="font-family=\"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Noto Sans TC', 'Helvetica Neue', Arial, sans-serif\""
DARK=dict(bg='#11151a',land='#1F272E',panel='#1A2026',edge='#2A333B',title='#FFFFFF',sub='#9AA4AD',accent='#C6FF3C',dim='#5E7F2A',label='#E6EBEF',foot='#8A949C')
def b64(p): return base64.b64encode(open(p,'rb').read()).decode()
def head(title,sub,T=DARK,size=47):
    return [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" {F}>',f'<rect width="{W}" height="{H}" fill="{T["bg"]}"/>',
      f'<image x="80" y="52" width="84" height="84" href="data:image/png;base64,{b64(os.path.join(WEB,"app-icon.png"))}"/>',
      f'<image x="168" y="40" width="157" height="108" href="data:image/png;base64,{b64(os.path.join(WEB,"wordmark-white.png"))}"/>',
      f'<text x="80" y="230" font-size="{size}" font-weight="800" fill="{T["title"]}">{title}</text>',
      f'<text x="80" y="280" font-size="30" fill="{T["sub"]}">{sub}</text>']
def foot(T=DARK):
    return [f'<text x="540" y="1310" font-size="30" text-anchor="middle" fill="{T["foot"]}">Your tennis life, <tspan fill="{T["accent"]}" font-weight="800">connected.</tspan></text>','</svg>']
