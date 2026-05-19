import { Module } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
  imports: [GatewayModule],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}
