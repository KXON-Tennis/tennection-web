"""中文頁 → 英文頁的共用轉換。

只做機械的部分：語言標記、hreflang、站內連結改指 /en、導覽列加語言切換、
把 Blog（只有中文）從英文導覽列拿掉。文字對照由呼叫端提供。

對照表一律「長句先換」——短字串先換會把長句切碎（第一版就踩過：「累積堅果」
把整段話換掉一半）。
"""
import os, re, sys, json

def localise(src, dst, mapping):
    s = open(src, encoding='utf-8').read()
    for a in sorted(mapping, key=len, reverse=True):
        b = mapping[a]
        if a in s:
            s = s.replace(a, b)
        else:  # 原始碼裡可能換行，空白容忍再試一次
            pat = r'\s*'.join(re.escape(c) for c in a.split())
            s2 = re.sub(pat, lambda _m: b, s)
            if s2 == s:
                print(f'  ! 沒配到: {a[:34]}', file=sys.stderr)
            s = s2
    s = s.replace('<html lang="zh-Hant">', '<html lang="en">')
    for p in ('/install', '/privacy', '/terms'):
        s = s.replace(f'href="{p}"', f'href="/en{p}"')
    s = s.replace('href="/"', 'href="/en"')
    s = re.sub(r'\s*<a href="/blog"[^>]*>Blog</a>·?', '', s)
    zh = '/' + os.path.basename(src).replace('.html', '').replace('index', '')
    zh = zh.rstrip('/') or '/'
    en = '/en' + (zh if zh != '/' else '')
    tags = (f'  <link rel="alternate" hreflang="zh-Hant" href="https://tennisnut.kxon.net{zh}" />\n'
            f'  <link rel="alternate" hreflang="en" href="https://tennisnut.kxon.net{en}" />\n'
            f'  <link rel="alternate" hreflang="x-default" href="https://tennisnut.kxon.net{zh}" />\n')
    s = s.replace('  <link rel="stylesheet" href="/styles.css" />',
                  tags + '  <link rel="stylesheet" href="/styles.css" />')
    s = re.sub(r'(<nav>.*?)(</nav>)',
               lambda m: m.group(1) + f'      <a href="{zh}">中文</a>\n    ' + m.group(2),
               s, count=1, flags=re.S)
    open(dst, 'w', encoding='utf-8').write(s)
    left = {' '.join(m.group(1).split())
            for m in re.finditer(r'>([^<>]*[一-鿿][^<>]*)<',
                                 re.sub(r'<(script|style)\b.*?</\1>', '', s, flags=re.S | re.I))}
    left.discard('中文')
    print(f'{dst}：剩餘中文 {len(left)}')
    for t in sorted(left)[:12]:
        print('   ·', t[:60])

if __name__ == '__main__':
    src, dst, mapfile = sys.argv[1:4]
    localise(src, dst, json.load(open(mapfile, encoding='utf-8')))
