-- 🕒 添加超时检测字段到image_tasks表
-- 请在Supabase控制台的SQL编辑器中执行以下语句

-- 1. 添加新字段
ALTER TABLE image_tasks 
ADD COLUMN generation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN generation_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_timeout BOOLEAN DEFAULT FALSE;

-- 2. 为新字段创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_image_tasks_generation_started_at ON image_tasks(generation_started_at);
CREATE INDEX IF NOT EXISTS idx_image_tasks_generation_completed_at ON image_tasks(generation_completed_at);
CREATE INDEX IF NOT EXISTS idx_image_tasks_is_timeout ON image_tasks(is_timeout);

-- 3. 创建超时检测函数
CREATE OR REPLACE FUNCTION check_task_timeout()
RETURNS INTEGER AS $$
DECLARE
    timeout_count INTEGER;
BEGIN
    -- 标记超过2分钟的processing任务为超时
    UPDATE image_tasks 
    SET 
        status = 'failed',
        is_timeout = TRUE,
        error_message = '任务超时：生成时间超过2分钟',
        updated_at = NOW()
    WHERE 
        status = 'processing' 
        AND generation_started_at IS NOT NULL
        AND generation_started_at < NOW() - INTERVAL '2 minutes'
        AND is_timeout = FALSE;
    
    GET DIAGNOSTICS timeout_count = ROW_COUNT;
    RETURN timeout_count;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建获取超时任务统计的函数
CREATE OR REPLACE FUNCTION get_timeout_stats()
RETURNS TABLE(
    total_timeout_count BIGINT,
    recent_timeout_count BIGINT,
    avg_generation_time_seconds NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE is_timeout = TRUE) as total_timeout_count,
        COUNT(*) FILTER (WHERE is_timeout = TRUE AND created_at > NOW() - INTERVAL '24 hours') as recent_timeout_count,
        AVG(EXTRACT(EPOCH FROM (generation_completed_at - generation_started_at))) FILTER (WHERE generation_completed_at IS NOT NULL AND generation_started_at IS NOT NULL) as avg_generation_time_seconds
    FROM image_tasks;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建获取生成时间统计的函数
CREATE OR REPLACE FUNCTION get_generation_time_stats()
RETURNS TABLE(
    task_id VARCHAR,
    prompt TEXT,
    generation_time_seconds NUMERIC,
    status VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.task_id,
        t.prompt,
        EXTRACT(EPOCH FROM (t.generation_completed_at - t.generation_started_at)) as generation_time_seconds,
        t.status,
        t.created_at
    FROM image_tasks t
    WHERE t.generation_started_at IS NOT NULL
    ORDER BY t.created_at DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- 6. 更新现有数据（可选）
-- 为已存在的processing任务设置generation_started_at
UPDATE image_tasks 
SET generation_started_at = updated_at 
WHERE status = 'processing' AND generation_started_at IS NULL;

-- 为已完成的任务设置generation_completed_at
UPDATE image_tasks 
SET generation_completed_at = updated_at 
WHERE status IN ('completed', 'failed') AND generation_completed_at IS NULL;

-- 7. 验证新字段
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'image_tasks' 
    AND column_name IN ('generation_started_at', 'generation_completed_at', 'is_timeout')
ORDER BY ordinal_position;

-- 执行完成后，您应该看到：
-- ✅ generation_started_at 字段已添加
-- ✅ generation_completed_at 字段已添加  
-- ✅ is_timeout 字段已添加
-- ✅ 相关索引已创建
-- ✅ 超时检测函数已创建
