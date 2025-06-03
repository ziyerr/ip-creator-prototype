import requests
import time
import os

# ====== 用户需填写 ======
API_KEY = 'tsk_ILDUsPhBrceCiYQLAT2rNKW4kh0qiJescGYVM01pTVR'
IMAGE_PATH = '6月3日/a.jpg'  # 支持jpg/jpeg/png/webp
OUTPUT_MODEL_PATH = 'output_model.glb'  # 可自定义保存路径
# ========================

# 1. 上传图片，获取 image_token
def upload_image(api_key, image_path):
    url = 'https://api.tripo3d.ai/v2/openapi/upload'
    headers = {
        'Authorization': f'Bearer {api_key}'
    }
    ext = os.path.splitext(image_path)[-1].lower()
    mime = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png' if ext == '.png' else 'image/webp'
    with open(image_path, 'rb') as f:
        files = {'file': (os.path.basename(image_path), f, mime)}
        resp = requests.post(url, headers=headers, files=files)
    resp.raise_for_status()
    data = resp.json()
    print('上传图片返回:', data)
    return data['data']['image_token'], ext[1:]

# 2. 创建建模任务，获取 task_id
def create_task(api_key, image_token, img_type):
    url = 'https://api.tripo3d.ai/v2/openapi/task'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    data = {
        'type': 'image_to_model',
        'file': {
            'type': img_type,
            'file_token': image_token
        }
    }
    resp = requests.post(url, headers=headers, json=data)
    resp.raise_for_status()
    data = resp.json()
    print('创建建模任务返回:', data)
    return data['data']['task_id']

# 3. 轮询任务状态，获取模型下载链接
def poll_task(api_key, task_id):
    url = f'https://api.tripo3d.ai/v2/openapi/task/{task_id}'
    headers = {
        'Authorization': f'Bearer {api_key}'
    }
    while True:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()['data']
        print('任务状态:', data['status'])
        if data['status'] == 'success':
            print('output内容:', data.get('output'))
            output = data.get('output', {})
            model_url = output.get('model') or output.get('base_model') or output.get('pbr_model')
            if not model_url:
                raise Exception(f"任务成功但未返回模型下载链接，output内容为: {output}")
            print('模型下载链接:', model_url)
            return model_url
        elif data['status'] in ['failed', 'cancelled', 'unknown']:
            raise Exception('3D模型生成失败')
        time.sleep(5)

# 4. 下载3D模型
def download_model(model_url, output_path):
    resp = requests.get(model_url)
    resp.raise_for_status()
    with open(output_path, 'wb') as f:
        f.write(resp.content)
    print(f'3D模型已下载到 {output_path}')

if __name__ == '__main__':
    image_token, img_type = upload_image(API_KEY, IMAGE_PATH)
    task_id = create_task(API_KEY, image_token, img_type)
    model_url = poll_task(API_KEY, task_id)
    download_model(model_url, OUTPUT_MODEL_PATH) 