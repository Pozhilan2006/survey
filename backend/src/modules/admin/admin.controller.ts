import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Param,
    Query,
    UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, ParticipationStatus } from '@prisma/client';
import { SurveysService } from '../surveys/surveys.service';
import { ParticipationsService } from '../participations/participations.service';
import { CapacityService } from '../capacity/capacity.service';
import { CreateSurveyDto, CreateReleaseDto } from '../surveys/dto/surveys.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
    constructor(
        private surveysService: SurveysService,
        private participationsService: ParticipationsService,
        private capacityService: CapacityService,
    ) { }

    @Post('surveys')
    async createSurvey(@Body() createSurveyDto: CreateSurveyDto) {
        return this.surveysService.createSurvey(createSurveyDto);
    }

    @Post('surveys/:id/releases')
    async createRelease(
        @Param('id') surveyId: string,
        @Body() createReleaseDto: CreateReleaseDto,
    ) {
        return this.surveysService.createRelease(surveyId, createReleaseDto);
    }

    @Get('participations')
    async listParticipations(
        @Query('status') status?: ParticipationStatus,
        @Query('surveyId') surveyId?: string,
        @Query('userId') userId?: string,
    ) {
        return this.participationsService.listParticipations({
            status,
            surveyId,
            userId,
        });
    }

    @Patch('participations/:id/approve')
    async approveParticipation(
        @Param('id') participationId: string,
        @CurrentUser() admin: any,
    ) {
        return this.participationsService.approveParticipation(
            participationId,
            admin.id,
        );
    }

    @Patch('participations/:id/reject')
    async rejectParticipation(
        @Param('id') participationId: string,
        @CurrentUser() admin: any,
        @Body('reason') reason?: string,
    ) {
        return this.participationsService.rejectParticipation(
            participationId,
            admin.id,
            reason,
        );
    }

    @Get('capacity/:releaseId')
    async getCapacity(@Param('releaseId') releaseId: string) {
        return this.capacityService.getCapacityForRelease(releaseId);
    }
}
