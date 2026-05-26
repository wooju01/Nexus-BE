import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ActivityService } from './activity.service';
import { ListActivitiesDto } from './dto/activity.dto';

@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // GET /workspaces/:id/activities
  @Get('workspaces/:id/activities')
  listWorkspaceActivities(
    @Req() req: Request,
    @Param('id') workspaceId: string,
    @Query() query: ListActivitiesDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.activityService.listWorkspaceActivities(userId, workspaceId, query);
  }

  // GET /projects/:id/activities
  @Get('projects/:id/activities')
  listProjectActivities(
    @Req() req: Request,
    @Param('id') projectId: string,
    @Query() query: ListActivitiesDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.activityService.listProjectActivities(userId, projectId, query);
  }
}
