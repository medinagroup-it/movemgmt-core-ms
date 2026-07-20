import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { companyIdFrom } from '../middlewares/auth';
import { actorFrom, updaterFrom } from '../utils/audit';
import { routeParam } from '../utils/params';
import { availabilitySchema, availableVehiclesSchema, createVehicleSchema, quoteSchema, searchVehicleSchema, updateVehicleSchema } from './vehicle.schemas';
import { toBookingDto, toPaginatedDto, toVehicleDto } from '../dto/mappers';
import * as service from './vehicle.service';

export const vehicleRouter = Router();

vehicleRouter.post('/check-availability', asyncHandler(async (req, res) => {
  const result = await service.checkAvailability(companyIdFrom(req), availabilitySchema.parse(req.body));
  res.json({ ...result, conflictingBookings: result.conflictingBookings.map(toBookingDto) });
}));
vehicleRouter.post('/calculate-rental-price', asyncHandler(async (req, res) => res.json(await service.calculateRentalQuote(companyIdFrom(req), quoteSchema.parse(req.body)))));
vehicleRouter.post('/available', asyncHandler(async (req, res) => {
  const result = await service.findAvailableVehicles(companyIdFrom(req), availableVehiclesSchema.parse(req.body));
  res.json({ ...result, vehicles: result.vehicles.map(toVehicleDto), alternatives: result.alternatives?.map((a) => ({ ...a, vehicle: toVehicleDto(a.vehicle) })) });
}));
vehicleRouter.post('/search/list', asyncHandler(async (req, res) => res.json(toPaginatedDto(await service.searchVehicles(companyIdFrom(req), searchVehicleSchema.parse(req.body)), toVehicleDto))));
vehicleRouter.post('/', asyncHandler(async (req, res) => res.status(201).json(toVehicleDto(await service.createVehicle(companyIdFrom(req), { ...createVehicleSchema.parse(req.body), createdBy: actorFrom(req) })))));
vehicleRouter.get('/:id', asyncHandler(async (req, res) => res.json(toVehicleDto(await service.getVehicle(companyIdFrom(req), routeParam(req.params.id, 'id'))))));
vehicleRouter.patch('/:id', asyncHandler(async (req, res) => res.json(toVehicleDto(await service.updateVehicle(companyIdFrom(req), routeParam(req.params.id, 'id'), { ...updateVehicleSchema.parse(req.body), updatedBy: updaterFrom(req) })))));
vehicleRouter.delete('/:id', asyncHandler(async (req, res) => res.json(toVehicleDto(await service.deleteVehicle(companyIdFrom(req), routeParam(req.params.id, 'id'), updaterFrom(req))))));
vehicleRouter.get('/', asyncHandler(async (req, res) => res.json(toPaginatedDto(await service.searchVehicles(companyIdFrom(req), searchVehicleSchema.parse({})), toVehicleDto))));
