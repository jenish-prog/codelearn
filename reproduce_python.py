import requests
import json

url = 'http://127.0.0.1:5001/api/visualize'
data = {
    'language': 'python',
    'code': """
x = 1
y = 2
z = x + y
print(z)
"""
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
