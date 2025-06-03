import { NextRequest } from 'next/server';

/**
 * 服务端配置验证API
 * 检查环境变量和API配置是否正确
 */
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 开始服务端配置验证...');
    
    const results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      checks: [] as Array<{
        name: string;
        status: 'pass' | 'fail' | 'warning';
        message: string;
        details?: any;
      }>,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    // 检查 1: MAQUE_API_KEY
    const apiKey = process.env.MAQUE_API_KEY;
    if (!apiKey) {
      results.checks.push({
        name: 'MAQUE_API_KEY',
        status: 'fail',
        message: '缺少 MAQUE_API_KEY 环境变量'
      });
    } else if (apiKey === 'your-api-key-here') {
      results.checks.push({
        name: 'MAQUE_API_KEY',
        status: 'fail',
        message: 'API密钥未更新，仍为示例值'
      });
    } else if (!apiKey.startsWith('sk-')) {
      results.checks.push({
        name: 'MAQUE_API_KEY',
        status: 'warning',
        message: 'API密钥格式异常，通常应以 sk- 开头'
      });
    } else if (apiKey.length < 20) {
      results.checks.push({
        name: 'MAQUE_API_KEY',
        status: 'warning',
        message: 'API密钥长度过短，可能无效'
      });
    } else {
      results.checks.push({
        name: 'MAQUE_API_KEY',
        status: 'pass',
        message: `API密钥配置正确 (${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)})`
      });
    }

    // 检查 2: MAQUE_API_URL
    const apiUrl = process.env.MAQUE_API_URL || 'https://ismaque.org/v1/images/edits';
    if (!apiUrl.startsWith('https://')) {
      results.checks.push({
        name: 'MAQUE_API_URL',
        status: 'warning',
        message: 'API URL 不是 HTTPS，可能存在安全风险'
      });
    } else {
      results.checks.push({
        name: 'MAQUE_API_URL',
        status: 'pass',
        message: `API端点配置正确: ${apiUrl}`
      });
    }

    // 检查 3: Node.js 运行时
    results.checks.push({
      name: 'Node.js Runtime',
      status: 'pass',
      message: `Node.js ${process.version}`,
      details: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    });

    // 检查 4: 内存使用情况
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    results.checks.push({
      name: 'Memory Usage',
      status: memUsageMB.heapUsed > 500 ? 'warning' : 'pass',
      message: `堆内存使用: ${memUsageMB.heapUsed}MB / ${memUsageMB.heapTotal}MB`,
      details: memUsageMB
    });

    // 检查 5: 环境变量完整性
    const requiredEnvVars = ['MAQUE_API_KEY'];
    const optionalEnvVars = ['MAQUE_API_URL', 'NODE_ENV', 'DEBUG_MODE'];
    
    const envStatus = {
      required: requiredEnvVars.map(key => ({
        key,
        present: !!process.env[key],
        value: process.env[key] ? `${process.env[key].substring(0, 8)}...` : undefined
      })),
      optional: optionalEnvVars.map(key => ({
        key,
        present: !!process.env[key],
        value: process.env[key]
      }))
    };

    const missingRequired = envStatus.required.filter(env => !env.present);
    if (missingRequired.length > 0) {
      results.checks.push({
        name: 'Environment Variables',
        status: 'fail',
        message: `缺少必需的环境变量: ${missingRequired.map(e => e.key).join(', ')}`,
        details: envStatus
      });
    } else {
      results.checks.push({
        name: 'Environment Variables',
        status: 'pass',
        message: '所有必需的环境变量都已配置',
        details: envStatus
      });
    }

    // 计算总结
    results.summary.total = results.checks.length;
    results.summary.passed = results.checks.filter(c => c.status === 'pass').length;
    results.summary.failed = results.checks.filter(c => c.status === 'fail').length;
    results.summary.warnings = results.checks.filter(c => c.status === 'warning').length;

    // 确定整体状态
    const overallStatus = results.summary.failed > 0 ? 'fail' : 
                         results.summary.warnings > 0 ? 'warning' : 'pass';

    console.log(`✅ 配置验证完成: ${results.summary.passed} 通过, ${results.summary.failed} 失败, ${results.summary.warnings} 警告`);

    return Response.json({
      success: overallStatus !== 'fail',
      status: overallStatus,
      message: overallStatus === 'pass' ? '所有配置检查通过' :
               overallStatus === 'warning' ? '配置基本正确，但有警告' :
               '配置检查失败，请修复错误',
      ...results
    });

  } catch (error) {
    console.error('❌ 配置验证失败:', error);
    return Response.json({
      success: false,
      status: 'fail',
      message: '配置验证过程中发生错误',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
