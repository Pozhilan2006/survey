import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SurveyType } from '@prisma/client';

class CreateOptionDto {
    @IsString()
    optionName!: string;

    @IsOptional()
    optionData?: any;
}

export class CreateSurveyDto {
    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsEnum(SurveyType)
    surveyType!: SurveyType;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOptionDto)
    options!: CreateOptionDto[];
}

class CapacityConfigDto {
    @IsString()
    optionId!: string;

    @IsInt()
    @Min(1)
    maxCapacity!: number;
}

export class CreateReleaseDto {
    @IsString()
    groupId!: string;

    @IsInt()
    @Min(1)
    releaseOrder!: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CapacityConfigDto)
    capacityConfig!: CapacityConfigDto[];
}
