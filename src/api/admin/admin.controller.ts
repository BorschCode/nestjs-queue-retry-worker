import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { MessageQueueService } from '../queue/services/message-queue.service';

@ApiTags('admin')
@Controller('admin/queue')
export class AdminController {
  constructor(private readonly messageQueueService: MessageQueueService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue statistics retrieved successfully',
    schema: {
      example: {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      },
    },
  })
  async getQueueStats() {
    return this.messageQueueService.getQueueStats();
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get jobs by state' })
  @ApiQuery({
    name: 'state',
    enum: ['waiting', 'active', 'completed', 'failed', 'delayed'],
    required: false,
    description: 'Job state to filter by',
  })
  @ApiQuery({
    name: 'start',
    required: false,
    description: 'Start index for pagination',
    example: 0,
  })
  @ApiQuery({
    name: 'end',
    required: false,
    description: 'End index for pagination',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Jobs retrieved successfully',
    schema: {
      example: [
        {
          id: '12345',
          name: 'processMessage',
          data: { message: 'Hello' },
          attemptsMade: 1,
          processedOn: 1234567890,
          finishedOn: 1234567900,
          failedReason: null,
        },
      ],
    },
  })
  async getJobs(
    @Query('state')
    state:
      | 'waiting'
      | 'active'
      | 'completed'
      | 'failed'
      | 'delayed' = 'waiting',
    @Query('start') start = 0,
    @Query('end') end = 10,
  ) {
    const jobs = await this.messageQueueService.getJobs(state, start, end);
    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    }));
  }

  @Get('dead-letter')
  @ApiOperation({ summary: 'Get jobs in the dead letter queue' })
  @ApiQuery({
    name: 'start',
    required: false,
    description: 'Start index for pagination',
    example: 0,
  })
  @ApiQuery({
    name: 'end',
    required: false,
    description: 'End index for pagination',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dead letter jobs retrieved successfully',
    schema: {
      example: [
        {
          id: '12345',
          name: 'processMessage',
          data: { message: 'Failed message' },
          attemptsMade: 5,
          timestamp: 1234567890,
        },
      ],
    },
  })
  async getDeadLetterJobs(@Query('start') start = 0, @Query('end') end = 10) {
    const jobs = await this.messageQueueService.getDeadLetterJobs(start, end);
    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    }));
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get job details by ID' })
  @ApiParam({ name: 'jobId', description: 'Job ID', example: '12345' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job details retrieved successfully',
    schema: {
      example: {
        id: '12345',
        name: 'processMessage',
        data: { message: 'Hello' },
        attemptsMade: 2,
        processedOn: 1234567890,
        finishedOn: 1234567900,
        failedReason: 'Network error',
        stacktrace: ['Error: Network error', '  at processMessage...'],
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  async getJobById(@Param('jobId') jobId: string) {
    const job = await this.messageQueueService.getJobById(jobId);

    if (!job) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
    };
  }

  @Post('requeue/:jobId')
  @ApiOperation({
    summary: 'Requeue a failed or dead-letter job',
    description:
      'Requeue a job from either the main queue failed jobs or the dead-letter queue. The job will be reset and added back to the main queue with a fresh attempt count.',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Job ID to requeue (from failed jobs or dead-letter queue)',
    example: '12345',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Job requeued successfully',
    schema: {
      example: {
        success: true,
        message: 'Job 12345 requeued successfully',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Failed to requeue job - Job not found, not in failed state, or other error',
  })
  async requeueFromDeadLetter(@Param('jobId') jobId: string) {
    try {
      await this.messageQueueService.requeueFromDeadLetter(jobId);
      return {
        success: true,
        message: `Job ${jobId} requeued successfully`,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to requeue job',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
