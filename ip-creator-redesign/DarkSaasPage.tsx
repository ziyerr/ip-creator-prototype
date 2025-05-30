import React, { useState } from "react";
import { theme } from "./theme";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { generateImageWithReference } from "@/lib/api";

export default function DarkSaasPage() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("Q版可爱风，卡通头像，明快配色");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedImage(e.target.files[0]);
      setPreviewUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage) return;
    setLoading(true);
    setResultUrl(null);
    setError(null);
    try {
      const url = await generateImageWithReference({ prompt, imageFile: uploadedImage });
      setResultUrl(url);
    } catch (err) {
      setError((err as any).message || '生成失败');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.background, color: theme.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 60 }}>
      <Card style={{ width: 420, background: theme.card }}>
        <CardHeader>
          <CardTitle style={{ color: theme.primary }}>IP 创作SaaS - 图生图体验</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ marginBottom: 16 }}>
            <Input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          {previewUrl && (
            <div style={{ margin: '16px 0', textAlign: 'center' }}>
              <img
                src={previewUrl}
                alt="预览"
                style={{ maxWidth: 200, borderRadius: 8, boxShadow: '0 1px 6px #0001' }}
              />
              <div style={{ color: theme.info, marginTop: 4 }}>已选择图片，点击下方按钮生成</div>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <Input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="请输入描述" />
          </div>
          <Button onClick={handleGenerate} disabled={!uploadedImage || loading} style={{ width: '100%' }}>
            {loading ? "生成中..." : "生成图像"}
          </Button>
          {error && <div style={{ color: theme.error, marginTop: 16 }}>{error}</div>}
          {resultUrl && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <img src={resultUrl} alt="生成结果" style={{ maxWidth: 320, borderRadius: 12, boxShadow: '0 2px 12px #0002' }} />
              <div style={{ color: theme.success, marginTop: 8 }}>生成成功！</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 