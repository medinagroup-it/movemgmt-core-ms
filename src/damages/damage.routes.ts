import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { companyIdFrom } from '../middlewares/auth';
import { actorFrom, updaterFrom } from '../utils/audit';
import { routeParam } from '../utils/params';
import { createDamageSchema, searchDamageSchema, updateDamageSchema } from './damage.schemas';
import { toDamageDto, toPaginatedDto } from '../dto/mappers';
import * as service from './damage.service';

export const damageRouter = Router();

damageRouter.post('/vehicles/:vehicleId/damages', asyncHandler(async (req, res) => {
  const body = createDamageSchema.parse(req.body);
  res.status(201).json(toDamageDto(await service.createDamage(companyIdFrom(req), routeParam(req.params.vehicleId, 'vehicleId'), { ...body, createdBy: actorFrom(req) })));
}));
damageRouter.get('/vehicles/:vehicleId/damages', asyncHandler(async (req, res) => res.json((await service.listDamagesByVehicle(companyIdFrom(req), routeParam(req.params.vehicleId, 'vehicleId'))).map(toDamageDto))));
damageRouter.post('/vehicle-damages/search/list', asyncHandler(async (req, res) => res.json(toPaginatedDto(await service.searchDamages(companyIdFrom(req), searchDamageSchema.parse(req.body)), toDamageDto))));
damageRouter.get('/vehicle-damages/:id', asyncHandler(async (req, res) => res.json(toDamageDto(await service.getDamage(companyIdFrom(req), routeParam(req.params.id, 'id'))))));
damageRouter.patch('/vehicle-damages/:id/repair', asyncHandler(async (req, res) => res.json(toDamageDto(await service.repairDamage(companyIdFrom(req), routeParam(req.params.id, 'id'), updaterFrom(req))))));
damageRouter.patch('/vehicle-damages/:id', asyncHandler(async (req, res) => res.json(toDamageDto(await service.updateDamage(companyIdFrom(req), routeParam(req.params.id, 'id'), { ...updateDamageSchema.parse(req.body), updatedBy: updaterFrom(req) })))));
damageRouter.delete('/vehicle-damages/:id', asyncHandler(async (req, res) => res.json(toDamageDto(await service.deleteDamage(companyIdFrom(req), routeParam(req.params.id, 'id'), updaterFrom(req))))));
