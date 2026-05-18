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
    const results = await asyncQuery('SELECT a.*, t.title as topic_title, u.real_name as student_name FROM application a LEFT JOIN topic t ON a.topic_id = t.id LEFT JOIN user u ON a.student_id = u.id ORDER BY a.apply_time DESC');
    res.json({ code: 200, data: results });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/', auth, roleAuth('student'), async (req, res) => {
  try {
    const { topic_ids } = req.body;
    if (!topic_ids || !Array.isArray(topic_ids) || topic_ids.length === 0) {
      return res.status(400).json({ code: 400, message: '请选择至少一个课题' });
    }
    if (topic_ids.length > 3) return res.status(400).json({ code: 400, message: '最多只能申请3个课题' });

    for (let i = 0; i < topic_ids.length; i++) {
      await asyncQuery('INSERT INTO application (topic_id, student_id, priority, status) VALUES (?, ?, ?, ?)', [topic_ids[i], req.user.id, i + 1, 'pending']);
    }
    res.json({ code: 200, message: '申请成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/:id/approve', auth, roleAuth('teacher'), async (req, res) => {
  try {
    const { status } = req.body;
    await asyncQuery('UPDATE application SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ code: 200, message: '审核成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await asyncQuery('DELETE FROM application WHERE id = ? AND student_id = ? AND status = "pending"', [req.params.id, req.user.id]);
    res.json({ code: 200, message: '取消成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;