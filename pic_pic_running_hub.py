import requests
import json

url = "https://www.runninghub.cn/task/openapi/create"

payload = json.dumps({
   "apiKey": "7963d490d54d406cbc8fbb11762b46bd",
   "workflowId": "1925430002874036225",
   "nodeInfoList": [
      {
         "nodeId": "2191",
         "fieldName": "image",
         "fieldValue":  "api/8adcbaa8c45fd7de142742c195627d6334d2f51986b0540c0eac9a9c2ced7206.png"
         },
        {
         "nodeId": "2192",
         "fieldName": "image",
         "fieldValue": "api/abccc79f9c08be79a8a54bd624ff5d9028a2f925b1a97604b292f17ecd748e14.png"
         }
   ]
   
    })
headers = {
   'Host': 'www.runninghub.cn',
   'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=payload)

print(response.text)