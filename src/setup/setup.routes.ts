import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { companyIdFrom } from '../middlewares/auth';
import { actorFrom, updaterFrom } from '../utils/audit';
import { routeParam } from '../utils/params';
import * as service from './setup.service';
import { createAdditionalServiceSchema, createCoverageSchema, createMileagePackageSchema, createOperatorSchema, updateAdditionalServiceSchema, updateCoverageSchema, updateMileagePackageSchema, upsertRentalSettingsSchema, upsertCargosPortalConfigSchema, updateCargosPortalConfigSchema, updateOperatorSchema } from './setup.schemas';
import { toAdditionalServiceDto, toCargosPortalConfigDto, toCoverageDto, toMileagePackageDto, toOperatorDto, toRentalSettingsDto } from '../dto/mappers';

export const setupRouter = Router();

setupRouter.post('/insurance-coverages', asyncHandler(async (req, res) => res.status(201).json(toCoverageDto(await service.createCoverage(companyIdFrom(req), { ...createCoverageSchema.parse(req.body), createdBy: actorFrom(req) })))));
setupRouter.get('/insurance-coverages', asyncHandler(async (req, res) => res.json((await service.listCoverages(companyIdFrom(req))).map(toCoverageDto))));
setupRouter.patch('/insurance-coverages/:id', asyncHandler(async (req, res) => res.json(toCoverageDto(await service.updateCoverage(companyIdFrom(req), routeParam(req.params.id, 'id'), { ...updateCoverageSchema.parse(req.body), updatedBy: updaterFrom(req) })))));
setupRouter.delete('/insurance-coverages/:id', asyncHandler(async (req, res) => res.json(toCoverageDto(await service.deleteCoverage(companyIdFrom(req), routeParam(req.params.id, 'id'), updaterFrom(req))))));

setupRouter.post('/mileage-packages', asyncHandler(async (req, res) => res.status(201).json(toMileagePackageDto(await service.createMileagePackage(companyIdFrom(req), { ...createMileagePackageSchema.parse(req.body), createdBy: actorFrom(req) })))));
setupRouter.get('/mileage-packages', asyncHandler(async (req, res) => res.json((await service.listMileagePackages(companyIdFrom(req))).map(toMileagePackageDto))));
setupRouter.patch('/mileage-packages/:id', asyncHandler(async (req, res) => res.json(toMileagePackageDto(await service.updateMileagePackage(companyIdFrom(req), routeParam(req.params.id, 'id'), { ...updateMileagePackageSchema.parse(req.body), updatedBy: updaterFrom(req) })))));
setupRouter.delete('/mileage-packages/:id', asyncHandler(async (req, res) => res.json(toMileagePackageDto(await service.deleteMileagePackage(companyIdFrom(req), routeParam(req.params.id, 'id'), updaterFrom(req))))));

setupRouter.post('/additional-services', asyncHandler(async (req, res) => res.status(201).json(toAdditionalServiceDto(await service.createAdditionalService(companyIdFrom(req), { ...createAdditionalServiceSchema.parse(req.body), createdBy: actorFrom(req) })))));
setupRouter.get('/additional-services', asyncHandler(async (req, res) => res.json((await service.listAdditionalServices(companyIdFrom(req))).map(toAdditionalServiceDto))));
setupRouter.patch('/additional-services/:id', asyncHandler(async (req, res) => res.json(toAdditionalServiceDto(await service.updateAdditionalService(companyIdFrom(req), routeParam(req.params.id, 'id'), { ...updateAdditionalServiceSchema.parse(req.body), updatedBy: updaterFrom(req) })))));
setupRouter.delete('/additional-services/:id', asyncHandler(async (req, res) => res.json(toAdditionalServiceDto(await service.deleteAdditionalService(companyIdFrom(req), routeParam(req.params.id, 'id'), updaterFrom(req))))));

setupRouter.put('/rental-settings', asyncHandler(async (req, res) => res.json(toRentalSettingsDto(await service.upsertRentalSettings(companyIdFrom(req), { ...upsertRentalSettingsSchema.parse(req.body), createdBy: actorFrom(req), updatedBy: updaterFrom(req) })))));
setupRouter.get('/rental-settings', asyncHandler(async (req, res) => res.json(toRentalSettingsDto(await service.getRentalSettings(companyIdFrom(req))))));


setupRouter.get('/cargos-config', asyncHandler(async (req, res) => res.json(toCargosPortalConfigDto(await service.getCargosPortalConfig(companyIdFrom(req))))));
setupRouter.put('/cargos-config', asyncHandler(async (req, res) => res.json(toCargosPortalConfigDto(await service.upsertCargosPortalConfig(companyIdFrom(req), { ...upsertCargosPortalConfigSchema.parse(req.body), createdBy: actorFrom(req), updatedBy: updaterFrom(req) })))));
setupRouter.patch('/cargos-config', asyncHandler(async (req, res) => res.json(toCargosPortalConfigDto(await service.updateCargosPortalConfig(companyIdFrom(req), { ...updateCargosPortalConfigSchema.parse(req.body), updatedBy: updaterFrom(req) })))));
setupRouter.delete('/cargos-config', asyncHandler(async (req, res) => res.json(toCargosPortalConfigDto(await service.deleteCargosPortalConfig(companyIdFrom(req), updaterFrom(req))))));

setupRouter.post('/operators', asyncHandler(async (req, res) => res.status(201).json(toOperatorDto(await service.createOperator(companyIdFrom(req), { ...createOperatorSchema.parse(req.body), createdBy: actorFrom(req) })))));
setupRouter.get('/operators', asyncHandler(async (req, res) => res.json((await service.listOperators(companyIdFrom(req))).map(toOperatorDto))));
setupRouter.patch('/operators/:id', asyncHandler(async (req, res) => res.json(toOperatorDto(await service.updateOperator(companyIdFrom(req), routeParam(req.params.id, 'id'), { ...updateOperatorSchema.parse(req.body), updatedBy: updaterFrom(req) })))));
setupRouter.delete('/operators/:id', asyncHandler(async (req, res) => res.json(toOperatorDto(await service.deleteOperator(companyIdFrom(req), routeParam(req.params.id, 'id'), updaterFrom(req))))));
setupRouter.get('/configuration', asyncHandler(async (req, res) => {
  const config = await service.getConfiguration(companyIdFrom(req));
  res.json({ ...config, operatori: config.operatori.map(toOperatorDto), copertureAssicurative: config.copertureAssicurative.map(toCoverageDto), chilometraggiGiornalieri: config.chilometraggiGiornalieri.map(toMileagePackageDto), serviziAggiuntivi: config.serviziAggiuntivi.map(toAdditionalServiceDto), impostazioniNoleggio: toRentalSettingsDto(config.impostazioniNoleggio), cargosPortalConfig: toCargosPortalConfigDto(config.cargosPortalConfig) });
}));
