const express = require('express');
const {
  listEvents,
  listMyRegistrations,
  registerForEvent,
  cancelRegistration,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', listEvents);
router.get('/my-registrations', requireAuth, listMyRegistrations);

router.post('/', requireAuth, requireAdmin, createEvent);

router.post('/:id/register', requireAuth, registerForEvent);
router.delete('/:id/register', requireAuth, cancelRegistration);

router.put('/:id', requireAuth, requireAdmin, updateEvent);
router.delete('/:id', requireAuth, requireAdmin, deleteEvent);

module.exports = router;