import requests
import os

# 火山引擎密钥
access_key_id = os.getenv("VOLCENGINE_ACCESS_KEY_ID")
secret_access_key = os.getenv("VOLCENGINE_SECRET_ACCESS_KEY")

# API地址
url = "https://image.volcengineapi.com/?Action=EditImage&Version=2023-05-01"

# 输入图片和描述
input_image = "input.png"  # 请替换为你的图片文件名
prompt = "Q版可爱风格，卡通头像，明快配色"  # 可自定义

files = {
    "ImageFile": open(input_image, "rb"),
}
data = {
    "Prompt": prompt,
    "AccessKeyId": access_key_id,
    "SecretAccessKey": secret_access_key,
}

response = requests.post(url, files=files, data=data)
result = response.json()
print(result)

# 下载生成图片
if "ResultUrl" in result:
    img_url = result["ResultUrl"]
    img_data = requests.get(img_url).content
    with open("output.png", "wb") as f:
        f.write(img_data)
    print("生成图片已保存为 output.png")
else:
    print("生成失败：", result) 