import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { companyIdFrom } from '../middlewares/auth';
import { actorFrom, updaterFrom } from '../utils/audit';
import { routeParam } from '../utils/params';
import { bookingDeliverySchema, bookingReturnSchema, cancelBookingSchema, createBookingSchema, createDraftBookingSchema, findByFineSchema, searchBookingSchema, updateBookingSchema } from './booking.schemas';
import { toBookingDto, toPaginatedDto } from '../dto/mappers';
import * as service from './booking.service';

export const bookingRouter = Router();
bookingRouter.post('/find-by-fine', asyncHandler(async (req, res) => {
  const result = await service.findBookingByFine(companyIdFrom(req), findByFineSchema.parse(req.body));
  res.json({ booking: toBookingDto(result.booking) });
}));
bookingRouter.post('/drafts', asyncHandler(async (req, res) => res.status(201).json(toBookingDto(await service.createDraftBooking(companyIdFrom(req), { ...createDraftBookingSchema.parse(req.body), createdBy: actorFrom(req) })))));
bookingRouter.post('/search/list', asyncHandler(async (req, res) => res.json(toPaginatedDto(await service.searchBookings(companyIdFrom(req), searchBookingSchema.parse(req.body)), toBookingDto))));
bookingRouter.post('/', asyncHandler(async (req, res) => res.status(201).json(toBookingDto(await service.createBooking(companyIdFrom(req), { ...createBookingSchema.parse(req.body), createdBy: actorFrom(req) })))));

bookingRouter.get('/:id/delivery-defaults', asyncHandler(async (req, res) => res.json(await service.getDeliveryDefaults(companyIdFrom(req), routeParam(req.params.id, 'id')))));
bookingRouter.patch('/:id/delivery', asyncHandler(async (req, res) => res.json(toBookingDto(await service.deliverBooking(companyIdFrom(req), routeParam(req.params.id, 'id'), { ...bookingDeliverySchema.parse(req.body), updatedBy: updaterFrom(req) })))));
bookingRouter.patch('/:id/return', asyncHandler(async (req, res) => res.json(toBookingDto(await service.returnBooking(companyIdFrom(req), routeParam(req.params.id, 'id'), { ...bookingReturnSchema.parse(req.body), updatedBy: updaterFrom(req) })))));
bookingRouter.get('/:id', asyncHandler(async (req, res) => res.json(toBookingDto(await service.getBooking(companyIdFrom(req), routeParam(req.params.id, 'id'))))));
bookingRouter.patch('/:id/cancel', asyncHandler(async (req, res) => {
  const body = cancelBookingSchema.parse(req.body);
  res.json(toBookingDto(await service.cancelBooking(companyIdFrom(req), routeParam(req.params.id, 'id'), updaterFrom(req), body.note)));
}));
bookingRouter.patch('/:id', asyncHandler(async (req, res) => res.json(toBookingDto(await service.updateBooking(companyIdFrom(req), routeParam(req.params.id, 'id'), { ...updateBookingSchema.parse(req.body), updatedBy: updaterFrom(req) })))));
bookingRouter.delete('/:id', asyncHandler(async (req, res) => res.json(toBookingDto(await service.deleteBooking(companyIdFrom(req), routeParam(req.params.id, 'id'), updaterFrom(req))))));
bookingRouter.get('/', asyncHandler(async (req, res) => res.json(toPaginatedDto(await service.searchBookings(companyIdFrom(req), searchBookingSchema.parse({})), toBookingDto))));
