import { Module } from '@nestjs/common';

import { GatewayModule } from '../gateway/gateway.module';
import { TaskCommentController } from './task-comment.controller';
import { TaskCommentService } from './task-comment.service';

@Module({
  imports: [GatewayModule],
  controllers: [TaskCommentController],
  providers: [TaskCommentService],
})
export class TaskCommentModule {}
