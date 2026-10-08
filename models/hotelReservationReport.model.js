const { pool } = require('../config/db');

let schemaReady;

async function ensureHotelReservationReportsTable() {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS hotel_reservation_reports (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_period DECIMAL(15, 2) NOT NULL DEFAULT 0,
        payment_methods JSON NULL,
        reservation_count INT UNSIGNED NOT NULL DEFAULT 0,
        reservations JSON NOT NULL,
        created_by BIGINT UNSIGNED DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_hotel_reservation_report_period (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

async function saveHotelReservationReport({
  startDate,
  endDate,
  totalCollected,
  paymentMethods,
  reservations,
  createdBy,
}) {
  await ensureHotelReservationReportsTable();
  await pool.query(
    `INSERT INTO hotel_reservation_reports (
      start_date, end_date, total_period, payment_methods,
      reservation_count, reservations, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      total_period = VALUES(total_period),
      payment_methods = VALUES(payment_methods),
      reservation_count = VALUES(reservation_count),
      reservations = VALUES(reservations),
      created_by = VALUES(created_by)`,
    [
      startDate,
      endDate,
      totalCollected,
      JSON.stringify(paymentMethods),
      reservations.length,
      JSON.stringify(reservations),
      createdBy ?? null,
    ]
  );

  return { startDate, endDate, reservationCount: reservations.length };
}

module.exports = { saveHotelReservationReport };
