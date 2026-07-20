import { Router } from 'express';
import { actorFrom, updaterFrom } from '../utils/audit';
import { companyIdFrom } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/asyncHandler';
import { routeParam } from '../utils/params';
import { createContractTemplateSchema, generateContractSchema, renderContractHtmlSchema, saveSignedContractDocumentSchema, setDefaultContractTemplateSchema, signContractSchema, updateContractTemplateSchema } from './contract.schemas';
import * as service from './contract.service';

export const contractRouter = Router();

contractRouter.get('/contract-templates', asyncHandler(async (req, res) => {
  const templates = await service.listTemplates(companyIdFrom(req));
  res.json(templates.map(service.toContractTemplateDto));
}));

contractRouter.post('/contract-templates', asyncHandler(async (req, res) => {
  const parsed = createContractTemplateSchema.parse(req.body);
  const template = await service.createTemplate(companyIdFrom(req), { ...parsed, createdBy: actorFrom(req) });
  res.status(201).json(service.toContractTemplateDto(template));
}));

contractRouter.get('/contract-templates/:code', asyncHandler(async (req, res) => {
  const template = await service.getTemplate(companyIdFrom(req), routeParam(req.params.code, 'code'));
  res.json(service.toContractTemplateDto(template));
}));

contractRouter.patch('/contract-templates/:code', asyncHandler(async (req, res) => {
  const template = await service.updateTemplate(companyIdFrom(req), routeParam(req.params.code, 'code'), { ...updateContractTemplateSchema.parse(req.body), updatedBy: updaterFrom(req) });
  res.json(service.toContractTemplateDto(template));
}));

contractRouter.delete('/contract-templates/:code', asyncHandler(async (req, res) => {
  const template = await service.deleteTemplate(companyIdFrom(req), routeParam(req.params.code, 'code'), updaterFrom(req));
  res.json(service.toContractTemplateDto(template));
}));

contractRouter.put('/contract-templates/default', asyncHandler(async (req, res) => {
  const parsed = setDefaultContractTemplateSchema.parse(req.body);
  const template = await service.setDefaultTemplate(companyIdFrom(req), parsed.code, updaterFrom(req));
  res.json(service.toContractTemplateDto(template));
}));

contractRouter.get('/contracts/placeholders', asyncHandler(async (_req, res) => {
  res.json(service.listAvailableContractPlaceholders());
}));

contractRouter.post('/contracts/render-html', asyncHandler(async (req, res) => {
  const input = renderContractHtmlSchema.parse(req.body);
  const rendered = await service.renderContractHtmlForSignature(companyIdFrom(req), input);
  res.json(rendered);
}));

contractRouter.post('/contracts/generate', asyncHandler(async (req, res) => {
  const input = generateContractSchema.parse(req.body);
  const pdf = await service.generatePdf(companyIdFrom(req), input);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="contract.pdf"');
  res.send(pdf);
}));

contractRouter.post('/contracts/sign', asyncHandler(async (req, res) => {
  const input = signContractSchema.parse(req.body);
  const pdf = await service.generatePdf(companyIdFrom(req), input);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="signed-contract.pdf"');
  res.send(pdf);
}));

contractRouter.post('/contracts/signed-documents', asyncHandler(async (req, res) => {
  const input = saveSignedContractDocumentSchema.parse(req.body);
  const document = await service.saveSignedContractDocument(companyIdFrom(req), input, actorFrom(req));
  res.status(201).json(document);
}));
