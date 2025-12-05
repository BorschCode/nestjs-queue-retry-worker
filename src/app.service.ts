import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHomePageData() {
    const port = this.configService.get<number>('PORT', 3011);
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const postgresPort = this.configService.get<number>('POSTGRES_PORT', 5432);
    const mailpitWebPort = this.configService.get<number>(
      'MAILPIT_WEB_PORT',
      8025,
    );
    const mailpitSmtpPort = this.configService.get<number>(
      'MAILPIT_SMTP_PORT',
      1025,
    );

    return {
      title: 'Message Queue Processing Service',
      description:
        'Production-ready NestJS-based message processing with automatic retry logic and dead-letter queue handling',

      configNotice: {
        message:
          'All service ports and configurations are set up in the .env file',
        configPath: '.env',
        variables: [
          `PORT=${port}`,
          `REDIS_PORT=${redisPort}`,
          `POSTGRES_PORT=${postgresPort}`,
          `MAILPIT_WEB_PORT=${mailpitWebPort}`,
          `MAILPIT_SMTP_PORT=${mailpitSmtpPort}`,
        ],
      },

      links: [
        {
          title: 'API Documentation',
          description:
            'Interactive Swagger/OpenAPI documentation with endpoint testing',
          url: '/api/docs',
          external: false,
        },
        {
          title: 'Queue Statistics',
          description: 'View real-time queue metrics and job counts',
          url: '/api/admin/queue/stats',
          external: false,
        },
        {
          title: 'Failed Jobs',
          description: 'Monitor and manage failed job processing',
          url: '/api/admin/queue/jobs?state=failed',
          external: false,
        },
        {
          title: 'Mailpit (Email Testing)',
          description: 'View test emails sent by the service',
          url: `http://localhost:${mailpitWebPort}`,
          external: true,
        },
      ],

      features: [
        {
          title: 'Multiple Delivery Channels',
          description: 'HTTP webhooks, Email, and Internal services',
        },
        {
          title: 'Automatic Retry Logic',
          description:
            'Exponential backoff with configurable max attempts (5 retries)',
        },
        {
          title: 'Dead-Letter Queue',
          description: 'Failed messages after max retries for manual review',
        },
        {
          title: 'Admin API',
          description:
            'Comprehensive endpoints for queue management and monitoring',
        },
        {
          title: 'Structured Logging',
          description: 'Winston-based logging with file and console output',
        },
        {
          title: 'Docker Support',
          description:
            'Full Docker Compose setup with Redis, PostgreSQL, and Mailpit',
        },
      ],

      endpoints: [
        {
          method: 'post',
          path: '/api/queue/message',
          description: 'Add a new message to the processing queue',
        },
        {
          method: 'get',
          path: '/api/admin/queue/stats',
          description:
            'Get queue statistics (waiting, active, completed, failed, delayed)',
        },
        {
          method: 'get',
          path: '/api/admin/queue/jobs',
          description: 'Get jobs by state with pagination',
        },
        {
          method: 'get',
          path: '/api/admin/queue/dead-letter',
          description: 'View jobs in the dead letter queue',
        },
        {
          method: 'get',
          path: '/api/admin/queue/jobs/:jobId',
          description: 'Get detailed information about a specific job',
        },
        {
          method: 'post',
          path: '/api/admin/queue/requeue/:jobId',
          description: 'Requeue a job from the dead letter queue',
        },
      ],

      services: [
        {
          name: 'Application',
          description: 'NestJS App',
          port: `:${port}`,
        },
        {
          name: 'Redis',
          description: 'Queue Storage',
          port: `:${redisPort}`,
        },
        {
          name: 'PostgreSQL',
          description: 'Database',
          port: `:${postgresPort}`,
        },
        {
          name: 'Mailpit',
          description: 'Email Testing',
          port: `:${mailpitWebPort} / :${mailpitSmtpPort}`,
        },
      ],

      retryStrategy: {
        type: 'Exponential backoff',
        maxAttempts: 5,
        delaySchedule: '1s → 2s → 4s → 8s → 16s',
        configPath: 'src/api/queue/config/queue.config.ts',
      },

      githubUrl: 'https://github.com/BorschCode/nestjs-queue-retry-worker',
    };
  }
}
