-- 🗄️ Supabase数据库设置SQL
-- 请在Supabase控制台的SQL编辑器中执行以下语句

-- 1. 创建图片任务表
CREATE TABLE IF NOT EXISTS image_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  prompt TEXT NOT NULL,
  image_file_name VARCHAR(255),
  results JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_image_tasks_task_id ON image_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_image_tasks_status ON image_tasks(status);
CREATE INDEX IF NOT EXISTS idx_image_tasks_created_at ON image_tasks(created_at);

-- 3. 创建更新时间自动更新的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_image_tasks_updated_at 
    BEFORE UPDATE ON image_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. 启用行级安全策略 (RLS)
ALTER TABLE image_tasks ENABLE ROW LEVEL SECURITY;

-- 5. 创建允许所有操作的策略（开发环境）
-- 注意：生产环境中应该根据用户权限设置更严格的策略
CREATE POLICY "Allow all operations on image_tasks" ON image_tasks
    FOR ALL USING (true);

-- 6. 创建清理过期任务的函数
CREATE OR REPLACE FUNCTION cleanup_expired_tasks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM image_tasks 
    WHERE created_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建获取任务统计的函数
CREATE OR REPLACE FUNCTION get_task_stats()
RETURNS TABLE(
    total_count BIGINT,
    pending_count BIGINT,
    processing_count BIGINT,
    completed_count BIGINT,
    failed_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count
    FROM image_tasks;
END;
$$ LANGUAGE plpgsql;

-- 8. 插入测试数据（可选）
-- INSERT INTO image_tasks (task_id, prompt, status, progress) 
-- VALUES ('test-task-1', '测试提示词', 'pending', 0);

-- 9. 验证表创建
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'image_tasks' 
ORDER BY ordinal_position;

-- 执行完成后，您应该看到：
-- ✅ image_tasks 表已创建
-- ✅ 索引已创建
-- ✅ 触发器已创建
-- ✅ RLS策略已启用
-- ✅ 辅助函数已创建
