import requests
import os
import re

def upload_pic_to_runninghub(image_path, api_key):
    url = "https://www.runninghub.cn/task/openapi/upload"
    headers = {'Host': 'www.runninghub.cn'}
    filename = os.path.basename(image_path)
    payload = {"apiKey": api_key}
    files = [
        ('file', (filename, open(image_path, 'rb'), 'image/png'))
    ]
    try:
        response = requests.post(url, headers=headers, data=payload, files=files)
        try:
            resp_json = response.json()
        except Exception:
            resp_json = None
        file_name = None
        if resp_json and isinstance(resp_json, dict):
            file_name = resp_json.get("fileName")
        if not file_name:
            match = re.search(r'"fileName"\s*:\s*"([^"]+)"', response.text)
            if match:
                file_name = match.group(1)
        return file_name, response.text
    except Exception as e:
        return None, str(e)

if __name__ == "__main__":
    # 用法示例：python pic_upload.py /path/to/image.png your_api_key
    image_path="a.png"
    api_key="7963d490d54d406cbc8fbb11762b46bd"
    file_name,resp=upload_pic_to_runninghub(image_path,api_key)
    print(f"文件名：{file_name}")
    print(f"响应：{resp}")