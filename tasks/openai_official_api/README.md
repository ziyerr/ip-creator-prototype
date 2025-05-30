# OpenAI 官方API图片编辑示例

## 依赖环境
- Python 3.12
- openai >= 1.0.0

## 安装依赖
建议使用 uv 管理环境：

```bash
uv pip install openai
```

## 使用方法
1. 准备两张图片：
   - `sunlit_lounge.png`：原始图片
   - `mask.png`：掩码图片（白色区域为编辑区域，黑色为保留区域）
2. 运行脚本：

```bash
python openai_edit_image.py
```

3. 结果图片将保存为 `composition.png`

## 注意事项
- 请确保 API Key 有效且额度充足。
- 图片需为PNG格式，且尺寸一致。 