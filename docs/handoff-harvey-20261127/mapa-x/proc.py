import json,sys,re,os
# usage: proc.py name file
name,f=sys.argv[1],sys.argv[2]
lines=open(f).read().splitlines()
js=None
for l in lines:
    l=l.strip()
    if l.startswith('{'):
        js=json.loads(l);break
json.dump(js,open(f'/workspace/mapa-x/raw/{name}.json','w'),ensure_ascii=False,indent=1)
users={u['id']:u for u in js.get('includes',{}).get('users',[])}
print(f"=== {name}: {len(js.get('data',[]))} posts")
for p in js.get('data',[]):
    u=users.get(p.get('author_id'),{})
    m=p.get('public_metrics',{})
    t=p['text'].replace('\n',' ')
    print(f"@{u.get('username')} ({u.get('public_metrics',{}).get('followers_count')}f) {p.get('created_at','')[:10]} L{m.get('like_count')} RT{m.get('retweet_count')} V{m.get('impression_count')} {p.get('url')}\n   {t[:330]}")
