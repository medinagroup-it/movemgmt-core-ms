import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { companyIdFrom } from '../middlewares/auth';
import { actorFrom, updaterFrom } from '../utils/audit';
import { routeParam } from '../utils/params';
import { toBillingDataDto, toPaginatedDto } from '../dto/mappers';
import { createBillingDataSchema, searchBillingDataSchema, updateBillingDataSchema } from './billing-data.schemas';
import * as service from './billing-data.service';

export const billingDataRouter = Router();
billingDataRouter.post('/search/list', asyncHandler(async (req, res) => res.json(toPaginatedDto(await service.searchBillingData(companyIdFrom(req), searchBillingDataSchema.parse(req.body)), toBillingDataDto))));
billingDataRouter.post('/', asyncHandler(async (req, res) => res.status(201).json(toBillingDataDto(await service.createBillingData(companyIdFrom(req), { ...createBillingDataSchema.parse(req.body), createdBy: actorFrom(req) })))));
billingDataRouter.get('/:id', asyncHandler(async (req, res) => res.json(toBillingDataDto(await service.getBillingData(companyIdFrom(req), routeParam(req.params.id, 'id'))))));
billingDataRouter.patch('/:id', asyncHandler(async (req, res) => res.json(toBillingDataDto(await service.updateBillingData(companyIdFrom(req), routeParam(req.params.id, 'id'), { ...updateBillingDataSchema.parse(req.body), updatedBy: updaterFrom(req) })))));
billingDataRouter.delete('/:id', asyncHandler(async (req, res) => res.json(toBillingDataDto(await service.deleteBillingData(companyIdFrom(req), routeParam(req.params.id, 'id'), updaterFrom(req))))));
billingDataRouter.get('/', asyncHandler(async (req, res) => res.json(toPaginatedDto(await service.searchBillingData(companyIdFrom(req), searchBillingDataSchema.parse({})), toBillingDataDto))));
