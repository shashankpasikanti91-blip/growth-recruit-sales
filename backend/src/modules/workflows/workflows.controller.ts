import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkflowsService } from './workflows.service';

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get('runs')
  @ApiOperation({ summary: 'List recent workflow runs' })
  @ApiQuery({ name: 'workflowType', required: false })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('workflowType') workflowType?: string,
  ) {
    return this.workflowsService.findAll(tenantId, workflowType);
  }
}
