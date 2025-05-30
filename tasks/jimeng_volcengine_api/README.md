# 即梦AI（火山引擎）图生图API Python集成示例

## 依赖环境
- Python 3.7+
- requests

## 安装依赖
```bash
pip install requests
```

## 使用方法
1. 准备一张本地图片，命名为 `input.png`（或修改脚本中的文件名）。
2. 修改 `jimeng_edit_image.py` 中的 `prompt` 字段为你想要的描述。
3. 运行脚本：
```bash
python jimeng_edit_image.py
```
4. 生成图片将保存为 `output.png`。

## 说明
- 脚本会自动调用火山引擎API，下载生成图片到本地。
- 如需批量处理或自定义参数，可自行扩展。

## 官方文档
- [火山引擎AI中台 图像编辑API HTTP请求示例](https://www.volcengine.com/docs/6444/1390583) 