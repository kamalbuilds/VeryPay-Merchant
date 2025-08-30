import { Router, Request, Response } from 'express';
import { RedisService } from '../../services/redis-service';
import { web3Helper } from '../../utils/web3';
import { Logger } from '../../utils/logger';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    redis: {
      status: 'connected' | 'disconnected' | 'error';
      latency?: number;
    };
    blockchain: {
      status: 'connected' | 'disconnected' | 'error';
      blockNumber?: number;
      latency?: number;
    };
    database?: {
      status: 'connected' | 'disconnected' | 'error';
      latency?: number;
    };
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
}

// GET /health
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        redis: { status: 'disconnected' },
        blockchain: { status: 'disconnected' }
      },
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      },
      cpu: {
        usage: 0
      }
    };

    // Check Redis connection
    try {
      const redisStart = Date.now();
      const isRedisConnected = await RedisService.isConnected();
      const redisLatency = Date.now() - redisStart;

      healthStatus.services.redis = {
        status: isRedisConnected ? 'connected' : 'disconnected',
        latency: redisLatency
      };

      if (!isRedisConnected) {
        healthStatus.status = 'degraded';
      }
    } catch (error) {
      Logger.error('Redis health check failed', error);
      healthStatus.services.redis = { status: 'error' };
      healthStatus.status = 'degraded';
    }

    // Check blockchain connection
    try {
      const blockchainStart = Date.now();
      const blockNumber = await web3Helper.getCurrentBlock();
      const blockchainLatency = Date.now() - blockchainStart;

      healthStatus.services.blockchain = {
        status: 'connected',
        blockNumber,
        latency: blockchainLatency
      };
    } catch (error) {
      Logger.error('Blockchain health check failed', error);
      healthStatus.services.blockchain = { status: 'error' };
      healthStatus.status = 'degraded';
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    healthStatus.memory = {
      used: memUsage.rss,
      total: memUsage.heapTotal,
      percentage: (memUsage.rss / memUsage.heapTotal) * 100
    };

    // CPU usage (simplified)
    healthStatus.cpu = {
      usage: process.cpuUsage().system / 1000000 // Convert to percentage
    };

    // Determine overall status
    if (healthStatus.services.redis.status === 'error' || 
        healthStatus.services.blockchain.status === 'error') {
      healthStatus.status = 'unhealthy';
    }

    // Memory threshold check (90%)
    if (healthStatus.memory.percentage > 90) {
      healthStatus.status = healthStatus.status === 'healthy' ? 'degraded' : 'unhealthy';
    }

    const responseTime = Date.now() - startTime;
    
    // Set appropriate HTTP status
    let httpStatus = 200;
    if (healthStatus.status === 'degraded') {
      httpStatus = 206; // Partial Content
    } else if (healthStatus.status === 'unhealthy') {
      httpStatus = 503; // Service Unavailable
    }

    res.status(httpStatus).json({
      ...healthStatus,
      responseTime
    });

  } catch (error) {
    Logger.error('Health check failed', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      responseTime: Date.now() - startTime
    });
  }
});

// GET /health/liveness
router.get('/liveness', (req: Request, res: Response) => {
  // Simple liveness probe - just check if the service is running
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET /health/readiness
router.get('/readiness', async (req: Request, res: Response) => {
  try {
    // Check if service is ready to handle requests
    const checks = [];

    // Check Redis
    try {
      const isRedisReady = await RedisService.isConnected();
      checks.push({ name: 'redis', status: isRedisReady ? 'ready' : 'not ready' });
    } catch (error) {
      checks.push({ name: 'redis', status: 'error', error: error.message });
    }

    // Check blockchain
    try {
      await web3Helper.getCurrentBlock();
      checks.push({ name: 'blockchain', status: 'ready' });
    } catch (error) {
      checks.push({ name: 'blockchain', status: 'error', error: error.message });
    }

    const allReady = checks.every(check => check.status === 'ready');

    res.status(allReady ? 200 : 503).json({
      status: allReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks
    });

  } catch (error) {
    Logger.error('Readiness check failed', error);
    
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    });
  }
});

// GET /health/metrics
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      nodejs: {
        version: process.version,
        v8Version: process.versions.v8
      }
    };

    res.json(metrics);

  } catch (error) {
    Logger.error('Metrics collection failed', error);
    
    res.status(500).json({
      error: 'Failed to collect metrics',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;