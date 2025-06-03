-- 🔧 安全的超时检测字段更新脚本
-- 只添加缺失的字段和函数，避免重复创建错误

-- 1. 安全添加字段（如果不存在）
DO $$ 
BEGIN
    -- 检查并添加 generation_completed_at 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_tasks' AND column_name = 'generation_completed_at'
    ) THEN
        ALTER TABLE image_tasks ADD COLUMN generation_completed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ 已添加 generation_completed_at 字段';
    ELSE
        RAISE NOTICE '⚠️ generation_completed_at 字段已存在';
    END IF;

    -- 检查并添加 is_timeout 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_tasks' AND column_name = 'is_timeout'
    ) THEN
        ALTER TABLE image_tasks ADD COLUMN is_timeout BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ 已添加 is_timeout 字段';
    ELSE
        RAISE NOTICE '⚠️ is_timeout 字段已存在';
    END IF;
END $$;

-- 2. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_image_tasks_generation_started_at ON image_tasks(generation_started_at);
CREATE INDEX IF NOT EXISTS idx_image_tasks_generation_completed_at ON image_tasks(generation_completed_at);
CREATE INDEX IF NOT EXISTS idx_image_tasks_is_timeout ON image_tasks(is_timeout);

-- 3. 创建或替换超时检测函数
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
        AND (is_timeout IS NULL OR is_timeout = FALSE);
    
    GET DIAGNOSTICS timeout_count = ROW_COUNT;
    RETURN timeout_count;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建或替换超时统计函数
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

-- 5. 创建或替换生成时间统计函数
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

-- 6. 安全更新现有数据
DO $$
BEGIN
    -- 为已存在的processing任务设置generation_started_at（如果为空）
    UPDATE image_tasks 
    SET generation_started_at = updated_at 
    WHERE status = 'processing' AND generation_started_at IS NULL;
    
    -- 为已完成的任务设置generation_completed_at（如果为空）
    UPDATE image_tasks 
    SET generation_completed_at = updated_at 
    WHERE status IN ('completed', 'failed') AND generation_completed_at IS NULL;
    
    -- 确保is_timeout字段有默认值
    UPDATE image_tasks 
    SET is_timeout = FALSE 
    WHERE is_timeout IS NULL;
    
    RAISE NOTICE '✅ 现有数据更新完成';
END $$;

-- 7. 验证所有字段
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'image_tasks' 
    AND column_name IN ('generation_started_at', 'generation_completed_at', 'is_timeout')
ORDER BY ordinal_position;

-- 8. 测试函数
SELECT 'check_task_timeout 函数测试:' as test_name, check_task_timeout() as result;
SELECT 'get_timeout_stats 函数测试:' as test_name, * FROM get_timeout_stats();

-- 执行完成后，您应该看到：
-- ✅ 所有必需字段已存在
-- ✅ 索引已创建
-- ✅ 函数已创建并测试通过
-- ✅ 现有数据已安全更新
