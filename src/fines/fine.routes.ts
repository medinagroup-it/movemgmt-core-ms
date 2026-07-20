import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { companyIdFrom } from '../middlewares/auth';
import { actorFrom, updaterFrom } from '../utils/audit';
import { routeParam } from '../utils/params';
import { toFineDto, toPaginatedDto } from '../dto/mappers';
import { createFineSchema, searchFineSchema, updateFineSchema } from './fine.schemas';
import * as service from './fine.service';

export const fineRouter = Router();
fineRouter.post('/search/list', asyncHandler(async (req, res) => res.json(toPaginatedDto(await service.searchFines(companyIdFrom(req), searchFineSchema.parse(req.body)), toFineDto))));
fineRouter.post('/', asyncHandler(async (req, res) => res.status(201).json(toFineDto(await service.createFine(companyIdFrom(req), { ...createFineSchema.parse(req.body), createdBy: actorFrom(req) })))));
fineRouter.get('/:id', asyncHandler(async (req, res) => res.json(toFineDto(await service.getFine(companyIdFrom(req), routeParam(req.params.id, 'id'))))));
fineRouter.patch('/:id', asyncHandler(async (req, res) => res.json(toFineDto(await service.updateFine(companyIdFrom(req), routeParam(req.params.id, 'id'), { ...updateFineSchema.parse(req.body), updatedBy: updaterFrom(req) })))));
fineRouter.delete('/:id', asyncHandler(async (req, res) => res.json(toFineDto(await service.deleteFine(companyIdFrom(req), routeParam(req.params.id, 'id'), updaterFrom(req))))));
fineRouter.get('/', asyncHandler(async (req, res) => res.json(toPaginatedDto(await service.searchFines(companyIdFrom(req), searchFineSchema.parse({})), toFineDto))));
