import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHomePageData() {
    return {
      title: 'Message Queue Processing Service',
      description: 'Production-ready NestJS-based message processing with automatic retry logic and dead-letter queue handling',

      links: [
        {
          title: 'API Documentation',
          description: 'Interactive Swagger/OpenAPI documentation with endpoint testing',
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
          url: 'http://localhost:8025',
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
          description: 'Exponential backoff with configurable max attempts (5 retries)',
        },
        {
          title: 'Dead-Letter Queue',
          description: 'Failed messages after max retries for manual review',
        },
        {
          title: 'Admin API',
          description: 'Comprehensive endpoints for queue management and monitoring',
        },
        {
          title: 'Structured Logging',
          description: 'Winston-based logging with file and console output',
        },
        {
          title: 'Docker Support',
          description: 'Full Docker Compose setup with Redis, PostgreSQL, and Mailpit',
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
          description: 'Get queue statistics (waiting, active, completed, failed, delayed)',
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
          port: ':3011',
        },
        {
          name: 'Redis',
          description: 'Queue Storage',
          port: ':6379',
        },
        {
          name: 'PostgreSQL',
          description: 'Database',
          port: ':5432',
        },
        {
          name: 'Mailpit',
          description: 'Email Testing',
          port: ':8025 / :1025',
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
