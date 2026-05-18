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
    const dir = './uploads/documents';
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
    const results = await asyncQuery('SELECT d.*, u.real_name as student_name FROM document d LEFT JOIN user u ON d.student_id = u.id ORDER BY d.uploaded_at DESC');
    res.json({ code: 200, data: results });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/', auth, roleAuth('student'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ code: 400, message: '请上传文件' });
    const latest = await asyncQuery('SELECT MAX(version) as maxVersion FROM document WHERE student_id = ?', [req.user.id]);
    const newVersion = (latest[0]?.maxVersion || 0) + 1;
    await asyncQuery('INSERT INTO document (student_id, version, file_path, file_name, status) VALUES (?, ?, ?, ?, ?)', [req.user.id, newVersion, req.file.path, req.file.originalname, 'submitted']);
    res.json({ code: 200, message: '上传成功', data: { version: newVersion } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/:id/status', auth, roleAuth('teacher'), async (req, res) => {
  try {
    const { status } = req.body;
    await asyncQuery('UPDATE document SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ code: 200, message: '状态更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;