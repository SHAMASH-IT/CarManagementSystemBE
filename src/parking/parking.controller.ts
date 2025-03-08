import { Controller, Get, Post, Body, Param, Patch, Delete, Query } from "@nestjs/common";
import { ParkingService } from "./parking.service";
import { CreateParkingDto } from "./dto/create-parking.dto";
import {UpdateParkingDto } from "./dto/update-parking.dto";

@Controller("parkings")
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Post()
  create(@Body() createParkingDto: CreateParkingDto) {
    return this.parkingService.createParking(createParkingDto);
  }

  @Get()
  findAll() {
    return this.parkingService.getAllParkings();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.parkingService.getParkingById(Number(id));
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateParkingDto: UpdateParkingDto) {
    return this.parkingService.updateParking(Number(id), updateParkingDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.parkingService.deleteParking(Number(id));
  }

  // Endpoint pour obtenir les locations disponibles
  @Get("available")
  getAvailableLocations(
    @Query("serviceId") serviceId: string,
    @Query("date") date: string,
    @Query("time") time: string
  ) {
    return this.parkingService.getAvailableLocations(Number(serviceId), new Date(date), new Date(time));
  }
}
