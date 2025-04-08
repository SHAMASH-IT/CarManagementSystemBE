import { IsNumber, IsOptional, IsString } from "class-validator"

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
    @IsNumber()
    @IsOptional()
    places : number;
}
