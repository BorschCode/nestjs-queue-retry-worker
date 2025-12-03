import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MessageQueueService } from '../queue/services/message-queue.service';

@Controller('admin/queue')
export class AdminController {
  constructor(private readonly messageQueueService: MessageQueueService) {}

  @Get('stats')
  async getQueueStats() {
    return this.messageQueueService.getQueueStats();
  }

  @Get('jobs')
  async getJobs(
    @Query('state') state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' = 'waiting',
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
  async getDeadLetterJobs(
    @Query('start') start = 0,
    @Query('end') end = 10,
  ) {
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
