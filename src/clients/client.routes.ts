import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { companyIdFrom } from '../middlewares/auth';
import { actorFrom, updaterFrom } from '../utils/audit';
import { routeParam } from '../utils/params';
import { addressAutocompleteSchema, createClientSchema, fiscalCodeSchema, searchClientSchema, updateClientSchema } from './client.schemas';
import { toClientDto, toPaginatedDto } from '../dto/mappers';
import * as service from './client.service';

export const clientRouter = Router();
clientRouter.post('/generate-fiscal-code', asyncHandler(async (req, res) => res.json(service.generateFiscalCode(fiscalCodeSchema.parse(req.body)))));
clientRouter.post('/addresses/autocomplete', asyncHandler(async (req, res) => res.json(await service.addressAutocomplete(companyIdFrom(req), addressAutocompleteSchema.parse(req.body)))));
clientRouter.post('/search/list', asyncHandler(async (req, res) => res.json(toPaginatedDto(await service.searchClients(companyIdFrom(req), searchClientSchema.parse(req.body)), toClientDto))));
clientRouter.post('/', asyncHandler(async (req, res) => res.status(201).json(toClientDto(await service.createClient(companyIdFrom(req), { ...createClientSchema.parse(req.body), createdBy: actorFrom(req) })))));
clientRouter.get('/:id', asyncHandler(async (req, res) => res.json(toClientDto(await service.getClient(companyIdFrom(req), routeParam(req.params.id, 'id'))))));
clientRouter.patch('/:id', asyncHandler(async (req, res) => res.json(toClientDto(await service.updateClient(companyIdFrom(req), routeParam(req.params.id, 'id'), { ...updateClientSchema.parse(req.body), updatedBy: updaterFrom(req) })))));
clientRouter.delete('/:id', asyncHandler(async (req, res) => res.json(toClientDto(await service.deleteClient(companyIdFrom(req), routeParam(req.params.id, 'id'), updaterFrom(req))))));
clientRouter.get('/', asyncHandler(async (req, res) => res.json(toPaginatedDto(await service.searchClients(companyIdFrom(req), searchClientSchema.parse({})), toClientDto))));
