import { IsNumber, IsOptional, IsString } from "class-validator"
import { Type } from "class-transformer";

export class CreateParking{
    @IsString()
    name : string;
    @IsNumber()
    places : number;
    @IsOptional()
    @IsNumber()
    serviceId : number;
}

export class UpdateParking{
    @IsString()
    @IsOptional()
    name : string;
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    places : number;
}
