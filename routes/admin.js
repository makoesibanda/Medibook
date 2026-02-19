const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const BASE = process.env.BASE_PATH || "";
const withBase = (p) => (BASE ? `${BASE}${p}` : p);


/*
=====================================
ADMIN DASHBOARD
=====================================
Main admin landing page
*/
router.get("/", requireAuth, requireAdmin, (req, res) => {
res.render("admin/dashboard", {
  user: req.session.user
});

});

/*
=====================================
ADMIN SERVICES
=====================================
Create, view, delete services
No hard-coded services anymore
*/
router.get("/services", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [services] = await db.execute(`
      SELECT id, name, price, duration_minutes
      FROM services
      ORDER BY name
    `);

    res.render("admin/services", { services });

  } catch (err) {
    console.error("Admin services load failed:", err);
res.redirect(withBase("/admin"));
  }
});

router.get("/debug", (req, res) => {
  res.send("ADMIN ROUTE WORKING");
});


/*
=====================================
CREATE SERVICE (ADMIN)
=====================================
*/
router.post("/services", requireAuth, requireAdmin, async (req, res) => {
  const { name, price, duration_minutes } = req.body;

  // Basic validation
  if (!name || !price || !duration_minutes) {
    return res.redirect(withBase("/admin/services"));

  }

  try {
    await db.execute(`
      INSERT INTO services (name, price, duration_minutes)
      VALUES (?, ?, ?)
    `, [name, price, duration_minutes]);

    res.redirect(withBase("/admin/services"));


  } catch (err) {
    console.error("Create service failed:", err);
    res.redirect(withBase("/admin/services"));

  }
});

/*
=====================================
DELETE SERVICE (ADMIN)
=====================================
NOTE:
Later we will protect this if practitioners exist
*/
router.post("/services/:id/delete", requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.execute(
      "DELETE FROM services WHERE id = ?",
      [req.params.id]
    );

    res.redirect(withBase("/admin/services"));


  } catch (err) {
    console.error("Delete service failed:", err);
    res.redirect(withBase("/admin/services"));

  }
});


/*
=====================================
VIEW ALL BOOKINGS (ADMIN)
=====================================
Shows every booking in the system
*/
router.get("/bookings", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [bookings] = await db.execute(`
      SELECT 
        b.id,
        b.booking_date,
        b.booking_time,
        b.status,
        u.full_name AS patient,
        pr.full_name AS practitioner,
        s.name AS service
      FROM bookings b
      JOIN users u ON b.patient_id = u.id
      JOIN practitioners p ON b.practitioner_id = p.id
      JOIN users pr ON p.user_id = pr.id
      JOIN services s ON p.service_id = s.id
      ORDER BY b.booking_date
    `);

res.render("admin/bookings", { bookings });

  } catch (err) {
    console.error(err);
res.redirect(withBase("/admin"));
  }
});
/*
=====================================
ADMIN – PRACTITIONER APPLICATIONS
=====================================
*/
router.get("/applications", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [applications] = await db.execute(`
      SELECT
        pa.id,
        pa.bio,
        pa.status,
        pa.created_at,
        u.id AS user_id,
        u.full_name,
        u.email
      FROM practitioner_applications pa
      JOIN users u ON pa.user_id = u.id
      ORDER BY pa.created_at DESC
    `);

    const [services] = await db.execute(`
      SELECT id, name
      FROM services
      ORDER BY name
    `);

    res.render("admin/applications", {
      applications,
      services
    });

  } catch (err) {
    console.error("Load applications failed:", err);
res.redirect(withBase("/admin"));
  }
});

/*
=====================================
APPROVE PRACTITIONER APPLICATION
=====================================
*/
router.post("/applications/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const { service_id } = req.body;
  const applicationId = req.params.id;

  if (!service_id) {
    return res.redirect(withBase("/admin/applications"));

  }

  try {
    // Get application
    const [[application]] = await db.execute(`
      SELECT user_id, bio
      FROM practitioner_applications
      WHERE id = ? AND status = 'pending'
    `, [applicationId]);

    if (!application) {
      return res.redirect(withBase("/admin/applications"));

    }

    // 1. Promote user to practitioner
    await db.execute(`
      UPDATE users
      SET role = 'practitioner'
      WHERE id = ?
    `, [application.user_id]);

    // 2. Create practitioner record
    await db.execute(`
      INSERT INTO practitioners (user_id, service_id, bio)
      VALUES (?, ?, ?)
    `, [application.user_id, service_id, application.bio]);

    // 3. Mark application approved
    await db.execute(`
      UPDATE practitioner_applications
      SET status = 'approved'
      WHERE id = ?
    `, [applicationId]);

    res.redirect(withBase("/admin/applications"));


  } catch (err) {
    console.error("Approve application failed:", err);
    res.redirect(withBase("/admin/applications"));

  }
});

/*
=====================================
REJECT PRACTITIONER APPLICATION
=====================================
*/
router.post("/applications/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.execute(`
      UPDATE practitioner_applications
      SET status = 'rejected'
      WHERE id = ?
    `, [req.params.id]);

    res.redirect(withBase("/admin/applications"));


  } catch (err) {
    console.error("Reject application failed:", err);
    res.redirect(withBase("/admin/applications"));

  }
});

 
/*
=====================================
ADMIN – MANAGE PRACTITIONERS
=====================================
*/
router.get("/practitioners", requireAuth, requireAdmin, async (req, res) => {
  try {

    const [practitioners] = await db.execute(`
      SELECT 
        p.id,
        u.full_name,
        u.email,
        s.id AS service_id,
        s.name AS service_name
      FROM practitioners p
      JOIN users u ON p.user_id = u.id
      JOIN services s ON p.service_id = s.id
      ORDER BY u.full_name
    `);

    const [services] = await db.execute(`
      SELECT id, name
      FROM services
      ORDER BY name
    `);

    res.render("admin/practitioners", {
      practitioners,
      services
    });

  } catch (err) {
    console.error(err);
res.redirect(withBase("/admin"));
  }
});

/*
=====================================
UPDATE PRACTITIONER SERVICE
=====================================
*/
router.post("/practitioners/:id/update-service", requireAuth, requireAdmin, async (req, res) => {
  try {

    const { service_id } = req.body;

    await db.execute(`
      UPDATE practitioners
      SET service_id = ?
      WHERE id = ?
    `, [service_id, req.params.id]);

    res.redirect(withBase("/admin/practitioners"));


  } catch (err) {
    console.error(err);
    res.redirect(withBase("/admin/practitioners"));

  }
});


/*
=====================================
DEACTIVATE PRACTITIONER
User becomes patient again
=====================================
*/
router.post("/practitioners/:id/deactivate", requireAuth, requireAdmin, async (req, res) => {
  try {

    const [[prac]] = await db.execute(
      "SELECT user_id FROM practitioners WHERE id = ?",
      [req.params.id]
    );

    if (!prac) {
      return res.redirect(withBase("/admin/practitioners"));

    }

    // Remove practitioner record
    await db.execute(
      "DELETE FROM practitioners WHERE id = ?",
      [req.params.id]
    );

    // Downgrade role
    await db.execute(
      "UPDATE users SET role = 'patient' WHERE id = ?",
      [prac.user_id]
    );

    res.redirect(withBase("/admin/practitioners"));


  } catch (err) {
    console.error(err);
    res.redirect(withBase("/admin/practitioners"));

  }
});



/*
=====================================
ADMIN AVAILABILITY PAGE
=====================================
View + create practitioner availability
*/
router.get("/availability", requireAuth, requireAdmin, async (req, res) => {
  try {

    const [practitioners] = await db.execute(`
      SELECT p.id, u.full_name, s.name AS service_name
      FROM practitioners p
      JOIN users u ON p.user_id = u.id
      JOIN services s ON p.service_id = s.id
      ORDER BY u.full_name
    `);

    const [availability] = await db.execute(`
      SELECT 
        a.id,
        a.day_of_week,
        a.start_time,
        a.end_time,
        u.full_name,
        s.name AS service_name
      FROM availability a
      JOIN practitioners p ON a.practitioner_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN services s ON p.service_id = s.id
      ORDER BY u.full_name, a.day_of_week
    `);

    res.render("admin/availability", {
      practitioners,
      availability,
      editAvailability: null   // ✅ ALWAYS define it
    });

  } catch (err) {
    console.error(err);
res.redirect(withBase("/admin"));
  }
});

/*
=====================================
CREATE AVAILABILITY
=====================================
Stores working hours for practitioner
*/
router.post("/availability", requireAuth, requireAdmin, async (req, res) => {

const {
  availability_id,
  practitioner_id,
  day_of_week,
  start_time,
  end_time
} = req.body;

 // Block invalid time ranges
if (start_time >= end_time) {
  return res.redirect(withBase("/admin/availability"));
}

try {

  if (availability_id) {
    // EDIT MODE → update by ID
    await db.execute(
      `
      UPDATE availability
      SET practitioner_id = ?, day_of_week = ?, start_time = ?, end_time = ?
      WHERE id = ?
      `,
      [practitioner_id, day_of_week, start_time, end_time, availability_id]
    );

  } else {
    // CREATE MODE → insert or overwrite same day
    await db.execute(
      `
      INSERT INTO availability (practitioner_id, day_of_week, start_time, end_time)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        start_time = VALUES(start_time),
        end_time = VALUES(end_time)
      `,
      [practitioner_id, day_of_week, start_time, end_time]
    );
  }

  res.redirect(withBase("/admin/availability"));


} catch (err) {
  console.error(err);
  res.redirect(withBase("/admin/availability"));

}

});
 
/*
=====================================
ADMIN – MANAGE USERS
=====================================
*/
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {

    const { search } = req.query;

    let query = `
      SELECT id, full_name, email, role
      FROM users
    `;

    let params = [];

    if (search) {
      query += `
        WHERE full_name LIKE ?
        OR email LIKE ?
      `;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY created_at DESC`;

    const [users] = await db.execute(query, params);

    const [services] = await db.execute(`
      SELECT id, name FROM services
    `);

    res.render("admin/users", {
      users,
      services,
      search: search || ""
    });

  } catch (err) {
    console.error(err);
res.redirect(withBase("/admin"));
  }
});



router.post("/users/:id/make-patient", requireAuth, requireAdmin, async (req, res) => {
  try {

    // Delete practitioner record
    await db.execute(
      "DELETE FROM practitioners WHERE user_id = ?",
      [req.params.id]
    );

    // Change role
    await db.execute(
      "UPDATE users SET role = 'patient' WHERE id = ?",
      [req.params.id]
    );

    res.redirect(withBase("/admin/users"));


  } catch (err) {
    console.error(err);
    res.redirect(withBase("/admin/users"));

  }
});


/*
=====================================
MAKE USER PRACTITIONER
=====================================
*/
router.post("/users/:id/make-practitioner", requireAuth, requireAdmin, async (req, res) => {
  try {

    const { service_id } = req.body;

    if (!service_id) {
      return res.redirect(withBase("/admin/users"));

    }

    // 1. Update user role
    await db.execute(
      "UPDATE users SET role = 'practitioner' WHERE id = ?",
      [req.params.id]
    );

    // 2. Create practitioner record
    await db.execute(
      "INSERT INTO practitioners (user_id, service_id) VALUES (?, ?)",
      [req.params.id, service_id]
    );

   res.redirect(withBase("/admin/users"));


  } catch (err) {
    console.error(err);
   res.redirect(withBase("/admin/users"));

  }
});



/*
=====================================
DELETE AVAILABILITY (ADMIN)
=====================================
Deletes availability only if
no future bookings exist
*/
router.post("/availability/:id/delete", requireAuth, requireAdmin, async (req, res) => {

  const availabilityId = req.params.id;

  try {

    // Block delete if future bookings exist
    const [[row]] = await db.execute(`
      SELECT COUNT(*) AS cnt
      FROM bookings b
      JOIN availability a
        ON a.practitioner_id = b.practitioner_id
      WHERE a.id = ?
        AND b.booking_date >= CURDATE()
        AND b.status = 'booked'
    `, [availabilityId]);

    if (row.cnt > 0) {
      return res.redirect(withBase("/admin/availability"));

    }

    // Delete availability
    await db.execute(
      "DELETE FROM availability WHERE id = ?",
      [availabilityId]
    );

    res.redirect(withBase("/admin/availability"));


  } catch (err) {
    console.error(err);
    res.redirect(withBase("/admin/availability"));

  }
});


// EDIT availability (load into form)
router.get("/availability/:id/edit", requireAuth, requireAdmin, async (req, res) => {

  const [[editAvailability]] = await db.execute(
    "SELECT * FROM availability WHERE id = ?",
    [req.params.id]
  );

  const [practitioners] = await db.execute(`
    SELECT p.id, u.full_name, s.name AS service_name
    FROM practitioners p
    JOIN users u ON p.user_id = u.id
    JOIN services s ON p.service_id = s.id
  `);

  const [availability] = await db.execute(`
    SELECT 
      a.id,
      a.day_of_week,
      a.start_time,
      a.end_time,
      u.full_name,
      s.name AS service_name
    FROM availability a
    JOIN practitioners p ON a.practitioner_id = p.id
    JOIN users u ON p.user_id = u.id
    JOIN services s ON p.service_id = s.id
  `);

  res.render("admin/availability", {
    practitioners,
    availability,
    editAvailability
  });
});




module.exports = router;
