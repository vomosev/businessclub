const express = require('express');
const {
  listMembers,
  getMemberById,
  updateCurrentMember,
} = require('../controllers/memberController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, listMembers);
router.put('/me', requireAuth, updateCurrentMember);
router.get('/:id', requireAuth, getMemberById);

module.exports = router;