import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MessageQueueService } from './services/message-queue.service';
import { MessagePayloadDto } from './dto/message-payload.dto';

@ApiTags('queue')
@Controller('queue')
export class QueueController {
  constructor(private readonly messageQueueService: MessageQueueService) {}

  @Post('message')
  @ApiOperation({ summary: 'Add a message to the queue' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message successfully added to queue',
    schema: {
      example: {
        success: true,
        jobId: '12345',
        message: 'Message added to queue successfully',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request - invalid message format',
  })
  async addMessage(@Body() message: MessagePayloadDto) {
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
