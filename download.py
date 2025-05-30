import requests
import json

url = "https://www.runninghub.cn/task/openapi/outputs"

payload = json.dumps({
   "apiKey": "7963d490d54d406cbc8fbb11762b46bd",
   "taskId": "1925432805562466306"
})
headers = {
   'Host': 'www.runninghub.cn',
   'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=payload)

print(response.text)