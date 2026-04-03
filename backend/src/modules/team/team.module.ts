import { Module } from '@nestjs/common';
import { TeamController, TeamPublicController } from './team.controller';
import { TeamService } from './team.service';
import { InviteService } from './invite.service';

@Module({
  providers: [TeamService, InviteService],
  controllers: [TeamController, TeamPublicController],
  exports: [TeamService, InviteService],
})
export class TeamModule {}
