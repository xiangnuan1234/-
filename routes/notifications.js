const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '123456', database: 'graduation_management' });

const asyncQuery = (sql, params) => new Promise((resolve, reject) => {
  pool.query(sql, params, (err, results) => {
    if (err) reject(err);
    else resolve(results || []);
  });
});

const { auth, roleAuth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const list = await asyncQuery('SELECT * FROM notification WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json({ code: 200, data: { list, unreadCount: list.filter(n => !n.is_read).length } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { user_id, title, content } = req.body;
    await asyncQuery('INSERT INTO notification (user_id, title, content) VALUES (?, ?, ?)', [user_id, title, content || null]);
    res.json({ code: 200, message: '发送成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/broadcast', auth, roleAuth('admin'), async (req, res) => {
  try {
    const { title, content, role } = req.body;
    const users = await asyncQuery(role ? 'SELECT id FROM user WHERE role = ?' : 'SELECT id FROM user', role ? [role] : []);
    let sent = 0;
    for (const u of users) {
      await asyncQuery('INSERT INTO notification (user_id, title, content) VALUES (?, ?, ?)', [u.id, title, content || null]);
      sent++;
    }
    res.json({ code: 200, message: `成功发送给${sent}个用户` });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    await asyncQuery('UPDATE notification SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ code: 200, message: '标记已读' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/readAll', auth, async (req, res) => {
  try {
    await asyncQuery('UPDATE notification SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ code: 200, message: '全部已读' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;