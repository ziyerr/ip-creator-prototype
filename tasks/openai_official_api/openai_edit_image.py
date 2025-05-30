import base64
from openai import OpenAI
import os

# 使用官方API密钥
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 图片编辑
result = client.images.edit(
    model="gpt-image-1",
    image=open("sunlit_lounge.png", "rb"),
    mask=open("mask.png", "rb"),
    prompt="A sunlit indoor lounge area with a pool containing a flamingo"
)

image_base64 = result.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

# 保存图片
with open("composition.png", "wb") as f:
    f.write(image_bytes)

print("图片编辑完成，已保存为 composition.png") 