import json,math,base64,os
HERE=os.path.dirname(os.path.abspath(__file__))
W,H=1080,1350
g=json.load(open('/Users/kaysoncho/dev/tns_diary_app/assets/geo/tw_counties.geojson'))
LON0,LON1,LAT0,LAT1=119.25,122.1,21.85,25.35
k=math.cos(math.radians(23.6))
top,bot=(int(os.environ.get('MAP_TOP',330)),int(os.environ.get('MAP_BOT',1250)))
s=(bot-top)/(LAT1-LAT0)
mapw=(LON1-LON0)*k*s
left=(W-mapw)/2+10
def P(lon,lat): return (left+(lon-LON0)*k*s, top+(LAT1-lat)*s)
paths=[]; names=[]  # names[i] 是 paths[i] 的縣市名
for f in g['features']:
    if f['properties']['name'] in ('金門縣','連江縣'): continue
    d=''
    geo=f['geometry']; polys=geo['coordinates'] if geo['type']=='MultiPolygon' else [geo['coordinates']]
    for poly in polys:
        for ring in poly:
            pts=[P(x,y) for x,y in ring]
            # 簡化：去掉相距不到 0.6px 的點
            out=[pts[0]]
            for p in pts[1:]:
                if abs(p[0]-out[-1][0])+abs(p[1]-out[-1][1])>0.6: out.append(p)
            if len(out)<3: continue
            d+='M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in out)+'Z'
    paths.append(d); names.append(f['properties']['name'])
teams=json.load(open(os.environ.get('TEAMS_JSON',os.path.join(HERE,'teams.json'))))
for t in teams: t['p']=P(t['lng'],t['lat'])
if __name__=='__main__':
    for t in teams: print(t['i'],t['court'],[round(v) for v in t['p']])
    print('map x range',round(left),round(left+mapw))
