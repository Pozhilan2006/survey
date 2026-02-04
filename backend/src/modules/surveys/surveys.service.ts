import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyDto, CreateReleaseDto } from './dto/surveys.dto';

@Injectable()
export class SurveysService {
    constructor(private prisma: PrismaService) { }

    async createSurvey(createSurveyDto: CreateSurveyDto) {
        return this.prisma.survey.create({
            data: {
                name: createSurveyDto.name,
                description: createSurveyDto.description,
                surveyType: createSurveyDto.surveyType,
                options: {
                    create: createSurveyDto.options.map(opt => ({
                        optionName: opt.optionName,
                        optionData: opt.optionData || null,
                    })),
                },
            },
            include: {
                options: true,
            },
        });
    }

    async createRelease(surveyId: string, createReleaseDto: CreateReleaseDto) {
        // Verify survey exists
        const survey = await this.prisma.survey.findUnique({
            where: { id: surveyId },
            include: { options: true },
        });

        if (!survey) {
            throw new BadRequestException('Survey not found');
        }

        // Verify all options in capacity config belong to this survey
        const surveyOptionIds = survey.options.map(o => o.id);
        const configOptionIds = createReleaseDto.capacityConfig.map(c => c.optionId);

        const invalidOptions = configOptionIds.filter(id => !surveyOptionIds.includes(id));
        if (invalidOptions.length > 0) {
            throw new BadRequestException('Invalid option IDs in capacity config');
        }

        // Create release with capacity configuration
        return this.prisma.surveyRelease.create({
            data: {
                surveyId,
                groupId: createReleaseDto.groupId,
                releaseOrder: createReleaseDto.releaseOrder,
                optionCapacities: {
                    create: createReleaseDto.capacityConfig.map(config => ({
                        optionId: config.optionId,
                        maxCapacity: config.maxCapacity,
                        currentUtilization: 0,
                    })),
                },
            },
            include: {
                survey: true,
                group: true,
                optionCapacities: {
                    include: {
                        option: true,
                    },
                },
            },
        });
    }

    async getSurvey(surveyId: string) {
        return this.prisma.survey.findUnique({
            where: { id: surveyId },
            include: {
                options: true,
                releases: {
                    include: {
                        group: true,
                    },
                },
            },
        });
    }
}
