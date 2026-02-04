import { IsString } from 'class-validator';

export class AddSelectionDto {
    @IsString()
    optionId!: string;
}
