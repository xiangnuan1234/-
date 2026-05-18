const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '123456', database: 'graduation_management' });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/proposals';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 20971520 } });

const asyncQuery = (sql, params) => new Promise((resolve, reject) => {
  pool.query(sql, params, (err, results) => {
    if (err) reject(err);
    else resolve(results || []);
  });
});

const { auth, roleAuth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const results = await asyncQuery('SELECT p.*, u.real_name as student_name FROM proposal p LEFT JOIN user u ON p.student_id = u.id ORDER BY p.created_at DESC');
    res.json({ code: 200, data: results });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/', auth, roleAuth('student'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ code: 400, message: '请上传文件' });
    await asyncQuery('INSERT INTO proposal (student_id, file_path, status) VALUES (?, ?, ?)', [req.user.id, req.file.path, 'submitted']);
    res.json({ code: 200, message: '提交成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/:id/review', auth, roleAuth('teacher'), async (req, res) => {
  try {
    const { status, score, comment } = req.body;
    await asyncQuery('UPDATE proposal SET status = ?, score = ?, comment = ?, review_time = NOW() WHERE id = ?', [status, score || null, comment || null, req.params.id]);
    res.json({ code: 200, message: '评阅成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;