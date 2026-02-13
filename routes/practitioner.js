const express = require("express");
const { requireAuth, requirePractitioner } = require("../middleware/auth");

const router = express.Router();

 /*
=====================================
PRACTITIONER DASHBOARD (DYNAMIC)
=====================================
*/
router.get("/", requireAuth, requirePractitioner, async (req, res) => {
  try {

    const practitionerUserId = req.session.user.id;

    // Get practitioner_id linked to this user
    const [[prac]] = await db.execute(
      "SELECT id FROM practitioners WHERE user_id = ? LIMIT 1",
      [practitionerUserId]
    );

    if (!prac) {
      return res.redirect("/");
    }

    const practitionerId = prac.id;

    /*
    --------------------------------------
    Count Appointments Today
    --------------------------------------
    */
    const [[todayCount]] = await db.execute(`
      SELECT COUNT(*) AS total
      FROM bookings
      WHERE practitioner_id = ?
        AND booking_date = CURDATE()
        AND status = 'booked'
    `, [practitionerId]);

    /*
    --------------------------------------
    Count Upcoming
    --------------------------------------
    */
    const [[upcomingCount]] = await db.execute(`
      SELECT COUNT(*) AS total
      FROM bookings
      WHERE practitioner_id = ?
        AND status = 'booked'
        AND (
              booking_date > CURDATE()
              OR (
                  booking_date = CURDATE()
                  AND booking_time > CURTIME()
                 )
            )
    `, [practitionerId]);

    /*
    --------------------------------------
    Count Completed
    --------------------------------------
    */
    const [[completedCount]] = await db.execute(`
      SELECT COUNT(*) AS total
      FROM bookings
      WHERE practitioner_id = ?
        AND status = 'completed'
    `, [practitionerId]);

    res.render("practitioner/dashboard", {
      user: req.session.user,
      today: todayCount.total,
      upcoming: upcomingCount.total,
      completed: completedCount.total
    });

  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});


/*
=====================================
VIEW MY APPOINTMENTS
=====================================
*/ /*
=====================================
PRACTITIONER BOOKINGS
Professional backend filtering
=====================================
*/
router.get("/bookings", requireAuth, requirePractitioner, async (req, res) => {
  try {

    /*
    --------------------------------------
    1. Get logged-in practitioner's user ID
    --------------------------------------
    */
    const practitionerUserId = req.session.user.id;

    /*
    --------------------------------------
    2. Find practitioner_id linked to this user
    (Remember practitioners table links user_id)
    --------------------------------------
    */
    const [[prac]] = await db.execute(
      "SELECT id FROM practitioners WHERE user_id = ? LIMIT 1",
      [practitionerUserId]
    );

    if (!prac) {
      // Safety fallback
      return res.redirect("/practitioner");
    }

    const practitionerId = prac.id;

    /*
    --------------------------------------
    3. Read filter from query parameter
    Default = upcoming
    Example:
      /practitioner/bookings?filter=completed
    --------------------------------------
    */
    const filter = req.query.filter || "upcoming";

    /*
    --------------------------------------
    4. Build dynamic SQL condition
    --------------------------------------
    */
    let condition = "";

   if (filter === "upcoming") {
  condition = `
    AND b.status = 'booked'
    AND (
      b.booking_date > CURDATE()
      OR (
        b.booking_date = CURDATE()
        AND b.booking_time >= CURTIME()
      )
    )
  `;
}


    else if (filter === "completed") {
      condition = `
        AND b.status = 'completed'
      `;
    }

else if (filter === "missed") {
  condition = `
    AND b.status = 'booked'
    AND (
      b.booking_date < CURDATE()
      OR (
        b.booking_date = CURDATE()
        AND b.booking_time < CURTIME()
      )
    )
  `;
}


    else if (filter === "cancelled") {
      condition = `
        AND b.status = 'cancelled'
      `;
    }

    else if (filter === "all") {
      condition = ``;
    }

    /*
    --------------------------------------
    5. Fetch bookings from database
    Sorted by date then time (ascending)
    --------------------------------------
    */
    const [bookings] = await db.execute(`
      SELECT 
        b.*,
        u.full_name AS patient
      FROM bookings b
      JOIN users u ON b.patient_id = u.id
      WHERE b.practitioner_id = ?
      ${condition}
      ORDER BY b.booking_date ASC, b.booking_time ASC
    `, [practitionerId]);

    /*
    --------------------------------------
    6. Render EJS
    --------------------------------------
    */
    res.render("practitioner/bookings", {
      bookings,
      currentFilter: filter
    });

  } catch (err) {
    console.error(err);
    res.redirect("/practitioner");
  }
});


/*
=====================================
SAVE NOTES
=====================================
*/
router.post("/bookings/:id/notes", requireAuth, requirePractitioner, async (req, res) => {

  const { notes } = req.body;

  try {

    await db.execute(`
      UPDATE bookings
      SET notes = ?
      WHERE id = ?
        AND practitioner_id = (
          SELECT id FROM practitioners WHERE user_id = ?
        )
    `, [notes, req.params.id, req.session.user.id]);

    res.redirect("/practitioner/bookings");

  } catch (err) {
    console.error(err);
    res.redirect("/practitioner/bookings");
  }

});

/*
=====================================
MARK AS COMPLETED
=====================================
*/
router.post("/bookings/:id/complete", requireAuth, requirePractitioner, async (req, res) => {
  try {

    await db.execute(`
      UPDATE bookings
      SET status = 'completed'
      WHERE id = ?
        AND practitioner_id = (
          SELECT id FROM practitioners WHERE user_id = ?
        )
    `, [req.params.id, req.session.user.id]);

    res.redirect("/practitioner/bookings");

  } catch (err) {
    console.error(err);
    res.redirect("/practitioner/bookings");
  }
});


/*
=====================================
CANCEL APPOINTMENT
=====================================
*/
router.post("/bookings/:id/cancel", requireAuth, requirePractitioner, async (req, res) => {
  try {

    await db.execute(`
      UPDATE bookings
      SET status = 'cancelled'
      WHERE id = ?
        AND practitioner_id = (
          SELECT id FROM practitioners WHERE user_id = ?
        )
    `, [req.params.id, req.session.user.id]);

    res.redirect("/practitioner/bookings");

  } catch (err) {
    console.error(err);
    res.redirect("/practitioner/bookings");
  }
});

module.exports = router;
