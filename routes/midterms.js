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
    const results = await asyncQuery('SELECT m.*, u.real_name as student_name FROM midterm m LEFT JOIN user u ON m.student_id = u.id ORDER BY m.created_at DESC');
    res.json({ code: 200, data: results });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/', auth, roleAuth('student'), async (req, res) => {
  try {
    const { progress, problems, plan } = req.body;
    await asyncQuery('INSERT INTO midterm (student_id, progress, problems, plan, status) VALUES (?, ?, ?, ?, ?)', [req.user.id, progress, problems, plan, 'submitted']);
    res.json({ code: 200, message: '提交成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/:id/review', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { status, score } = req.body;
    await asyncQuery('UPDATE midterm SET status = ?, score = ? WHERE id = ?', [status, score || null, req.params.id]);
    res.json({ code: 200, message: '评分成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;