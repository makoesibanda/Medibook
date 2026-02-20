const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { sendBookingConfirmation } = require("../utils/mailer");


const router = express.Router();

/*
=====================================
PATIENT DASHBOARD
=====================================
Landing page after patient login
*/
router.get("/", requireAuth, (req, res) => {
  res.render("patient/dashboard", {
    user: req.session.user
  });
});

/*
=====================================
BOOK APPOINTMENT PAGE
Loads services ONLY
Everything else via API
=====================================
*/
router.get("/book", requireAuth, async (req, res) => {
  try {
    const [services] = await db.execute(`
      SELECT id, name, price
      FROM services
      ORDER BY name
    `);

    res.render("patient/book", { services });

  } catch (err) {
    console.error(err);
    res.redirect("/www/350/medibook/patient");
  }
});

/*
=====================================
API: AVAILABLE SLOTS BY SERVICE
NO GUESSING
NO DATE PICKER
READY-TO-CLICK SLOTS
=====================================
*/
router.get("/slots-by-service/:serviceId", requireAuth, async (req, res) => {

  const serviceId = req.params.serviceId;

  try {

    /*
    ----------------------------------
    Fetch availability + practitioners
    ----------------------------------
    */
    const [rows] = await db.execute(`
      SELECT
        p.id AS practitioner_id,
        u.full_name AS practitioner_name,
        a.day_of_week,
        a.start_time,
        a.end_time,
        s.duration_minutes
      FROM practitioners p
      JOIN users u ON p.user_id = u.id
      JOIN services s ON p.service_id = s.id
      JOIN availability a ON a.practitioner_id = p.id
      WHERE p.service_id = ?
    `, [serviceId]);

    if (rows.length === 0) {
      return res.json([]);
    }

    /*
    ----------------------------------
    Generate slots (next 14 days)
    ----------------------------------
    */
    const result = {};

    for (const row of rows) {

      if (!result[row.practitioner_id]) {
        result[row.practitioner_id] = {
          practitioner_id: row.practitioner_id,
          practitioner: row.practitioner_name,
          slots: []
        };
      }

      for (let i = 0; i < 14; i++) {

        const date = new Date();
        date.setDate(date.getDate() + i);

        const day = date.toLocaleDateString("en-US", { weekday: "short" });
        if (day !== row.day_of_week) continue;

const yyyy = date.getFullYear();
const mm = String(date.getMonth() + 1).padStart(2, "0");
const dd = String(date.getDate()).padStart(2, "0");
const dateStr = `${yyyy}-${mm}-${dd}`;

     let current = new Date(`1970-01-01T${row.start_time}`);
const end = new Date(`1970-01-01T${row.end_time}`);

// appointment duration + break
const slotMinutes = row.duration_minutes + 60; // 1h break

while (current < end) {

  const timeKey = current.toTimeString().substring(0, 5);

  // 🔥 Combine slot date + time
  const slotDateTime = new Date(`${dateStr}T${timeKey}`);

  // 🔥 Skip slot if already in the past (even 1 minute)
  if (slotDateTime <= new Date()) {
    current = new Date(current.getTime() + slotMinutes * 60000);
    continue;
  }

  // Check if slot is booked
  const [[exists]] = await db.execute(`
    SELECT 1
    FROM bookings
    WHERE practitioner_id = ?
      AND booking_date = ?
      AND booking_time = ?
      AND status = 'booked'
    LIMIT 1
  `, [row.practitioner_id, dateStr, timeKey]);

  if (!exists) {
    result[row.practitioner_id].slots.push({
      date: dateStr,
      time: timeKey
    });
  }

  current = new Date(current.getTime() + slotMinutes * 60000);
}

      }
    }

    res.json(Object.values(result));

  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

/*
=====================================
CREATE BOOKING
Uses SLOT BUTTON click
=====================================
*/
router.post("/book", requireAuth, async (req, res) => {

  const { practitioner_id, booking_date, booking_time } = req.body;

  if (!practitioner_id || !booking_date || !booking_time) {
    return res.redirect("/www/350/medibook/patient/book");
  }

 // 🔒 Block booking if slot already passed (even by 1 minute)
const slotDateTime = new Date(`${booking_date}T${booking_time}`);
if (slotDateTime <= new Date()) {
  return res.redirect("/www/350/medibook/patient/book?error=slot_passed");
}

// 🔒 Block multiple bookings on same day for same patient
const [[existingBooking]] = await db.execute(`
  SELECT id
  FROM bookings
  WHERE patient_id = ?
    AND booking_date = ?
    AND status = 'booked'
  LIMIT 1
`, [req.session.user.id, booking_date]);

if (existingBooking) {
  return res.redirect("/www/350/medibook/patient/book?error=already_booked_same_day");
}


   try {

  // 1. Save booking
  await db.execute(`
    INSERT INTO bookings
    (patient_id, practitioner_id, booking_date, booking_time)
    VALUES (?,?,?,?)
  `, [
    req.session.user.id,
    practitioner_id,
    booking_date,
    booking_time
  ]);

  // 2. Fetch details for email
  const [[details]] = await db.execute(`
    SELECT
      s.name AS service,
      u.full_name AS practitioner
    FROM practitioners p
    JOIN users u ON p.user_id = u.id
    JOIN services s ON p.service_id = s.id
    WHERE p.id = ?
  `, [practitioner_id]);

  // 3. Send email (non-blocking)
  try {
    await sendBookingConfirmation({
      to: req.session.user.email,
      patient: req.session.user.full_name,
      service: details.service,
      practitioner: details.practitioner,
      date: booking_date,
      time: booking_time
    });
  } catch (emailErr) {
    console.error("Email failed:", emailErr);
  }

  // 4. Redirect success
  return res.redirect("/www/350/medibook/patient/bookings?success=booked");

} catch (err) {

  // Slot already taken
  if (err.code === "ER_DUP_ENTRY") {
    return res.redirect("/www/350/medibook/patient/book?error=slot_taken");
  }

  console.error(err);
  return res.redirect("/www/350/medibook/patient/book");
}


});

/*
=====================================
VIEW MY BOOKINGS
=====================================
*/
router.get("/bookings", requireAuth, async (req, res) => {
  try {

   const [bookings] = await db.execute(`
  SELECT
    b.id,
    b.booking_date,
    b.booking_time,
    b.status,
    u.full_name AS practitioner,
    s.name AS service
  FROM bookings b
  JOIN practitioners p ON b.practitioner_id = p.id
  JOIN users u ON p.user_id = u.id
  JOIN services s ON p.service_id = s.id
  WHERE b.patient_id = ?
    AND TIMESTAMP(b.booking_date, b.booking_time) >= NOW()
  ORDER BY b.booking_date, b.booking_time
`, [req.session.user.id]);


    res.render("patient/bookings", { bookings });

  } catch (err) {
    console.error(err);
    res.redirect("/www/350/medibook/patient");
  }
});

/*
=====================================
CANCEL BOOKING
=====================================
*/
router.post("/bookings/:id/cancel", requireAuth, async (req, res) => {
  try {

    // 1. Fetch booking date & time
    const [[booking]] = await db.execute(`
      SELECT booking_date, booking_time
      FROM bookings
      WHERE id = ?
        AND patient_id = ?
    `, [
      req.params.id,
      req.session.user.id
    ]);

    // If booking not found
    if (!booking) {
      return res.redirect("/www/350/medibook/patient/bookings");
    }

    // 2. Combine date + time into JS Date
    const bookingDateTime = new Date(
      `${booking.booking_date}T${booking.booking_time}`
    );

    const now = new Date();

    // 3. Difference in hours
    const diffMs = bookingDateTime - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    // 4. Block cancellation if less than 4 hours
    if (diffHours < 4) {
      return res.redirect("/www/350/medibook/patient/bookings?error=too_late_to_cancel");
    }

    // 5. Delete booking
    await db.execute(`
      DELETE FROM bookings
      WHERE id = ?
        AND patient_id = ?
    `, [
      req.params.id,
      req.session.user.id
    ]);

    return res.redirect("/www/350/medibook/patient/bookings?success=cancelled");

  } catch (err) {
    console.error(err);
    return res.redirect("/www/350/medibook/patient/bookings");
  }
});



module.exports = router;
