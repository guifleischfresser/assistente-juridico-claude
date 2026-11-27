import json,sys,re,glob
seen=set(json.load(open('/workspace/mapa-x/monitor/seen_ids.json'))['ids'])
out={}
for f in sys.argv[1:]:
    t=open(f).read()
    i=t.find('{"data"');
    if i<0:
        i=t.find('{'); 
    j=t.rfind('}')
    try: d=json.loads(t[i:j+1])
    except Exception as e: print('ERR',f,e,t[:300]); continue
    users={u['id']:u for u in d.get('includes',{}).get('users',[])}
    for p in d.get('data',[]):
        if p['id'] in seen or p['id'] in out: continue
        u=users.get(p['author_id'],{})
        urls=[x.get('expanded_url') for x in p.get('entities',{}).get('urls',[])]
        m=p['public_metrics']
        out[p['id']]=dict(f=f[:6],user=u.get('username'),fol=u.get('public_metrics',{}).get('followers_count'),date=p['created_at'][:16],imp=m['impression_count'],lk=m['like_count'],rt=m['retweet_count'],bm=m['bookmark_count'],text=p['text'].replace('\n',' '),urls=[x for x in urls if x and 'x.com' not in x and 'twitter.com' not in x],url=p['url'])
json.dump(out,open('/workspace/mapa-x/monitor/run_tmp.json','w'),ensure_ascii=False)
for k,v in out.items():
    print(f"[{v['f']}] @{v['user']}({v['fol']}) {v['date']} imp{v['imp']} lk{v['lk']} rt{v['rt']} bm{v['bm']} | {v['text'][:260]} | {v['urls']} | {v['url']}")
