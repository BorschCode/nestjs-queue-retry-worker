import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MessageQueueService } from './services/message-queue.service';
import { MessagePayload } from './interfaces';

@Controller('queue')
export class QueueController {
  constructor(private readonly messageQueueService: MessageQueueService) {}

  @Post('message')
  async addMessage(@Body() message: MessagePayload) {
    try {
      const job = await this.messageQueueService.addMessage(message);
      return {
        success: true,
        jobId: job.id,
        message: 'Message added to queue successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to add message to queue',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
