import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsObject,
} from 'class-validator';
import { DeliveryChannel } from '../enums/delivery-channel.enum';

export class MessagePayloadDto {
  @ApiProperty({
    description: 'Unique identifier for the message',
    example: 'msg_123456',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Delivery channel for the message',
    enum: DeliveryChannel,
    example: DeliveryChannel.HTTP,
  })
  @IsEnum(DeliveryChannel)
  channel: DeliveryChannel;

  @ApiProperty({
    description: 'Destination URL, email address, or internal identifier',
    example: 'https://api.example.com/webhook',
  })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({
    description: 'Message payload data',
    example: { message: 'Hello, World!', priority: 'high' },
  })
  @IsNotEmpty()
  data: any;

  @ApiPropertyOptional({
    description: 'Additional metadata for the message',
    example: { userId: '12345', correlationId: 'abc-123' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
