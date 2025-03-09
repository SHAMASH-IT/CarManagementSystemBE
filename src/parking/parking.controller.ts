import { Controller, Get, Post, Body, Param, Patch, Delete, Query } from "@nestjs/common";
import { ParkingService } from "./parking.service";
import { CreateParkingDto } from "./dto/create-parking.dto";
import {UpdateParkingDto } from "./dto/update-parking.dto";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto"
@Controller()
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Post("parkings")
  create(@Body() createParkingDto: CreateParkingDto) {
    return this.parkingService.createParking(createParkingDto);
  }

  @Get("parkings")
  findAll() {
    return this.parkingService.getAllParkings();
  }

  @Get("parkings/:id")
  findOne(@Param("id") id: string) {
    return this.parkingService.getParkingById(Number(id));
  }

  @Patch("parkings/:id")
  update(@Param("id") id: string, @Body() updateParkingDto: UpdateParkingDto) {
    return this.parkingService.updateParking(Number(id), updateParkingDto);
  }

  @Delete("parkings/:id")
  remove(@Param("id") id: string) {
    return this.parkingService.deleteParking(Number(id));
  }
  @Post("locations")
  createLocation(@Body() createLocationDto: CreateLocationDto) {
    return this.parkingService.createLocation(createLocationDto);
  }

  @Get("locations")
  findAllLocation() {
    return this.parkingService.getAllLocations();
  }

  @Get("locations/:id")
  findOneLocation(@Param("id") id: string) {
    return this.parkingService.getLocationById(Number(id));
  }

  @Patch("locations/:id")
  updatelocation(@Param("id") id: string, @Body() updatelocationDto: UpdateLocationDto) {
    return this.parkingService.updateLocation(Number(id), updatelocationDto);
  }

  @Delete("locations/:id")
  removelocation(@Param("id") id: string) {
    return this.parkingService.deleteLocation(Number(id));
  }
  
}
