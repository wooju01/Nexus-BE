import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get('projects/:projectId/tasks')
  getTasks(@Param('projectId') projectId: string, @Request() req) {
    return this.taskService.getTasks(projectId, req.user.id);
  }

  @Post('projects/:projectId/tasks')
  createTask(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
    @Request() req,
  ) {
    return this.taskService.createTask(projectId, req.user.id, dto);
  }

  @Get('tasks/:id')
  getTask(@Param('id') id: string, @Request() req) {
    return this.taskService.getTask(id, req.user.id);
  }

  @Patch('tasks/:id')
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Request() req) {
    return this.taskService.updateTask(id, req.user.id, dto);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTask(@Param('id') id: string, @Request() req) {
    return this.taskService.deleteTask(id, req.user.id);
  }
}
