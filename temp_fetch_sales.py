import json
import urllib.request
url = 'https://lego-api-blue.vercel.app/sales?id=31218'
print('URL:', url)
with urllib.request.urlopen(url, timeout=10) as r:
    data = json.loads(r.read().decode())
    print(json.dumps(data, indent=2)[:2000])
