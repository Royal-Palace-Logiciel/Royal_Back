// routes/hebergementRoutes.js
const express = require('express');
const ctrl = require('../controllers/hebergementController');
const { createCrudRouter } = require('./routeFactory');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();
router.use(requireAuth);

router.put('/room-types/:id', ctrl.updateRoomTypeHandler);
router.use('/room-types', createCrudRouter(ctrl.roomTypesCrud));

router.get('/rooms/available', ctrl.availableRoomsHandler);              // GET /api/hebergement/rooms/available
router.get('/rooms/availability', ctrl.availabilityHandler);             // GET /api/hebergement/rooms/availability?room_id=&date_arrivee=&date_depart=
router.get('/rooms/stats', ctrl.roomStatsHandler);                       // GET /api/hebergement/rooms/stats
router.put('/rooms/:id/status', ctrl.updateRoomStatusHandler);           // PUT /api/hebergement/rooms/:id/status
router.put('/rooms/:id', ctrl.updateRoomHandler);
router.use('/rooms', createCrudRouter(ctrl.roomsCrud));

router.get('/equipments/categories', ctrl.equipmentCategoriesHandler);   // GET /api/hebergement/equipments/categories
router.get('/equipments/stats', ctrl.equipmentStatsHandler);             // GET /api/hebergement/equipments/stats
router.get('/equipments/code/:code', ctrl.equipmentByCodeHandler);       // GET /api/hebergement/equipments/code/:code
router.post('/equipments', ctrl.createEquipmentHandler);                  // POST /api/hebergement/equipments (custom handler for stock integration)
router.put('/equipments/:id', ctrl.updateEquipmentHandler);              // PUT /api/hebergement/equipments/:id (custom handler for stock integration)
router.use('/equipments', createCrudRouter(ctrl.equipmentsCrud));
router.put('/room-equipments/:id/status', ctrl.updateRoomEquipmentStatusHandler); // PUT /api/hebergement/room-equipments/:id/status
router.use('/room-equipments', createCrudRouter(ctrl.roomEquipmentsCrud));
router.get('/room-maintenance/stats', ctrl.maintenanceStatsHandler);            // GET /api/hebergement/room-maintenance/stats
router.put('/room-maintenance/:id/status', ctrl.updateMaintenanceStatusHandler); // PUT /api/hebergement/room-maintenance/:id/status
router.post('/room-maintenance', ctrl.createMaintenanceHandler);
router.use('/room-maintenance', createCrudRouter(ctrl.roomMaintenanceCrud));
router.use('/maintenance-workers', createCrudRouter(ctrl.maintenanceWorkersCrud));
router.use('/room-minibar', createCrudRouter(ctrl.roomMinibarCrud));
router.use('/room-status-history', createCrudRouter(ctrl.roomStatusHistoryCrud));

router.post('/reservations', ctrl.createReservationHandler);             // POST /api/hebergement/reservations (avec accompagnants)
router.post('/reservations/:id/validate-discount', ctrl.validateReservationDiscountHandler);
router.post('/reservations/:id/payments', ctrl.createReservationPaymentHandler); // POST encaissement partiel/multi-modes
router.get('/reservations/:id/payments', ctrl.reservationPaymentsHandler);   // GET /api/hebergement/reservations/:id/payments
router.get('/reservations/stats', ctrl.reservationStatsHandler);         // GET /api/hebergement/reservations/stats
router.get('/reservations/history', ctrl.getHotelHistoryHandler);          // GET /api/hebergement/reservations/history?user_id=&start_date=&end_date=&statut=
router.get('/reservations/reports/collections', ctrl.reservationCollectionReportHandler);
router.post('/reservations/reports/collections', ctrl.saveReservationCollectionReportHandler);
router.get('/users', ctrl.getUsersHandler);                              // GET /api/hebergement/users
router.use('/reservations', createCrudRouter(ctrl.reservationsCrud));
router.use('/reservation-guests', createCrudRouter(ctrl.reservationGuestsCrud));

router.post('/stays/check-in/:reservationId', ctrl.checkInHandler);      // POST /api/hebergement/stays/check-in/:reservationId
router.post('/stays/check-out/:stayId', ctrl.checkOutHandler);           // POST /api/hebergement/stays/check-out/:stayId
router.use('/stays', createCrudRouter(ctrl.staysCrud));

router.get('/housekeeping/stats', ctrl.housekeepingStatsHandler);            // GET /api/hebergement/housekeeping/stats
router.put('/housekeeping/:id/status', ctrl.updateHousekeepingStatusHandler); // PUT /api/hebergement/housekeeping/:id/status
router.use('/housekeeping', createCrudRouter(ctrl.housekeepingCrud));
router.use('/lost-and-found', createCrudRouter(ctrl.lostAndFoundCrud));
router.use('/minibar-consumptions', createCrudRouter(ctrl.minibarConsumptionsCrud));

// Minibar stock management routes
router.post('/minibar/transfer-stock', ctrl.transferStockToMinibarHandler);     // POST /api/hebergement/minibar/transfer-stock
router.post('/minibar/consume', ctrl.handleMinibarConsumptionHandler);          // POST /api/hebergement/minibar/consume
router.get('/minibar/alerts', ctrl.getMinibarWithAlertsHandler);                // GET /api/hebergement/minibar/alerts
router.get('/minibar/low-stock', ctrl.getLowStockMinibarHandler);               // GET /api/hebergement/minibar/low-stock
router.post('/minibar/restock', ctrl.restockMinibarHandler);                    // POST /api/hebergement/minibar/restock

// Rapport journalier Hôtel — situation des chambres durant la nuitée
// Les routes /whatsapp/* passent avant /:date, sinon « whatsapp » serait pris pour une date.
router.get('/daily-reports/whatsapp/status', ctrl.hotelReportWhatsappStatusHandler);          // GET  .../whatsapp/status?date=
router.get('/daily-reports/whatsapp/history', ctrl.hotelReportWhatsappHistoryHandler);        // GET  .../whatsapp/history?date=&limit=
router.post('/daily-reports/whatsapp/send', ctrl.sendHotelReportWhatsappHandler);             // POST .../whatsapp/send { date? }
router.get('/daily-reports/whatsapp/session', ctrl.hotelReportWhatsappSessionHandler);        // GET  .../whatsapp/session  (état + QR)
router.post('/daily-reports/whatsapp/session', ctrl.connectHotelReportWhatsappSessionHandler); // POST .../whatsapp/session  (démarrer / régénérer le QR)
router.delete('/daily-reports/whatsapp/session', ctrl.disconnectHotelReportWhatsappSessionHandler); // DELETE .../whatsapp/session?logout=true (admin)
router.get('/daily-reports/whatsapp/groups', ctrl.hotelReportWhatsappGroupsHandler);          // GET  .../whatsapp/groups
router.post('/daily-reports/whatsapp/recipients', ctrl.addHotelReportWhatsappRecipientHandler);
router.put('/daily-reports/whatsapp/recipients/:id', ctrl.updateHotelReportWhatsappRecipientHandler);
router.delete('/daily-reports/whatsapp/recipients/:id', ctrl.deleteHotelReportWhatsappRecipientHandler);

router.get('/daily-reports', ctrl.listHotelDailyReportsHandler);                 // GET /api/hebergement/daily-reports?start_date=&end_date=&limit=
router.get('/daily-reports/:date', ctrl.getHotelDailyReportHandler);             // GET /api/hebergement/daily-reports/2026-09-27
router.post('/daily-reports', ctrl.saveHotelDailyReportHandler);                 // POST /api/hebergement/daily-reports
router.delete('/daily-reports/:date', ctrl.deleteHotelDailyReportHandler);       // DELETE /api/hebergement/daily-reports/2026-09-27 (admin)

// Accommodation stock management routes
router.get('/stock', ctrl.getHebergementStockHandler);                           // GET /api/hebergement/stock
router.post('/stock', ctrl.addHebergementStockHandler);                          // POST /api/hebergement/stock
router.put('/stock/:id', ctrl.updateHebergementStockHandler);                    // PUT /api/hebergement/stock/:id
router.delete('/stock/:id', ctrl.deleteHebergementStockHandler);                 // DELETE /api/hebergement/stock/:id

// Hotel product history route
router.get('/product-history', ctrl.getHotelProductHistoryHandler);               // GET /api/hebergement/product-history?dateFrom=&dateTo=&productName=&locationId=

module.exports = router;