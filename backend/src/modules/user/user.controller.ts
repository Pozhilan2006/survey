import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    UseGuards,
    ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ParticipationsService } from '../participations/participations.service';
import { SelectionsService } from '../selections/selections.service';
import { EligibilityService } from '../eligibility/eligibility.service';
import { AddSelectionDto } from './dto/selection.dto';

@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
export class UserController {
    constructor(
        private prisma: PrismaService,
        private participationsService: ParticipationsService,
        private selectionsService: SelectionsService,
        private eligibilityService: EligibilityService,
    ) { }

    @Get('surveys')
    async listEligibleSurveys(@CurrentUser() user: any) {
        // Get all active releases for groups user belongs to
        const groupMemberships = await this.prisma.groupMember.findMany({
            where: { userId: user.id },
            select: { groupId: true },
        });

        const groupIds = groupMemberships.map(gm => gm.groupId);

        const releases = await this.prisma.surveyRelease.findMany({
            where: {
                groupId: { in: groupIds },
                isActive: true,
            },
            include: {
                survey: true,
                group: true,
            },
            orderBy: {
                releaseOrder: 'asc',
            },
        });

        // Check eligibility for each release
        const surveysWithEligibility = await Promise.all(
            releases.map(async (release) => {
                const eligibility = await this.eligibilityService.checkSurveyEligibility(
                    user.id,
                    release.id,
                );

                return {
                    releaseId: release.id,
                    survey: release.survey,
                    group: release.group,
                    releaseOrder: release.releaseOrder,
                    eligibility,
                };
            })
        );

        return surveysWithEligibility;
    }

    @Post('participations/:releaseId/start')
    async startParticipation(
        @Param('releaseId') releaseId: string,
        @CurrentUser() user: any,
    ) {
        // Check eligibility
        const eligibility = await this.eligibilityService.checkSurveyEligibility(
            user.id,
            releaseId,
        );

        if (!eligibility.isEligible) {
            throw new ForbiddenException({
                message: eligibility.denyReason,
                gateType: eligibility.gateType,
                prerequisiteDetails: eligibility.prerequisiteDetails,
            });
        }

        return this.participationsService.startParticipation(user.id, releaseId);
    }

    @Post('participations/:id/selections')
    async addSelection(
        @Param('id') participationId: string,
        @Body() addSelectionDto: AddSelectionDto,
        @CurrentUser() user: any,
    ) {
        const holdExpiryMinutes = parseInt(process.env.HOLD_EXPIRY_MINUTES || '30');

        return this.selectionsService.addSelection(
            participationId,
            addSelectionDto.optionId,
            user.id,
            holdExpiryMinutes,
        );
    }

    @Delete('participations/:id/selections/:optionId')
    async removeSelection(
        @Param('id') participationId: string,
        @Param('optionId') optionId: string,
        @CurrentUser() user: any,
    ) {
        return this.selectionsService.removeSelection(
            participationId,
            optionId,
            user.id,
        );
    }

    @Post('participations/:id/submit')
    async submitParticipation(
        @Param('id') participationId: string,
        @CurrentUser() user: any,
    ) {
        return this.participationsService.submitParticipation(
            participationId,
            user.id,
        );
    }

    @Get('participations/:id')
    async getParticipation(
        @Param('id') participationId: string,
        @CurrentUser() user: any,
    ) {
        return this.participationsService.getParticipation(
            participationId,
            user.id,
        );
    }
}
