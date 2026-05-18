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
    const { status, page = 1, pageSize = 10 } = req.query;
    let sql = 'SELECT t.*, u.real_name as teacher_name FROM topic t LEFT JOIN user u ON t.teacher_id = u.id';
    const params = [];
    const conditions = [];

    if (status) { conditions.push('t.status = ?'); params.push(status); }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY t.created_at DESC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

    const results = await asyncQuery(sql, params);
    res.json({ code: 200, data: results });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/my-topics', auth, roleAuth('teacher'), async (req, res) => {
  try {
    const results = await asyncQuery(
      'SELECT t.*, (SELECT COUNT(*) FROM application WHERE topic_id = t.id AND status = "pass") as selected_count FROM topic t WHERE t.teacher_id = ? ORDER BY t.created_at DESC',
      [req.user.id]
    );
    res.json({ code: 200, data: results });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const results = await asyncQuery(
      'SELECT t.*, u.real_name as teacher_name FROM topic t LEFT JOIN user u ON t.teacher_id = u.id WHERE t.id = ?',
      [req.params.id]
    );
    if (!results || results.length === 0) return res.status(404).json({ code: 404, message: '课题不存在' });
    res.json({ code: 200, data: results[0] });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/', auth, roleAuth('teacher'), async (req, res) => {
  try {
    const { title, description, requirements, max_students } = req.body;
    if (!title) return res.status(400).json({ code: 400, message: '课题名称不能为空' });

    const results = await asyncQuery(
      'INSERT INTO topic (title, description, requirements, teacher_id, max_students) VALUES (?, ?, ?, ?, ?)',
      [title, description || null, requirements || null, req.user.id, max_students || 1]
    );
    res.json({ code: 200, message: '创建成功', data: { id: results.insertId } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/:id', auth, roleAuth('teacher'), async (req, res) => {
  try {
    const { title, description, requirements, max_students, status } = req.body;
    const updates = [];
    const params = [];

    if (title) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (requirements !== undefined) { updates.push('requirements = ?'); params.push(requirements); }
    if (max_students) { updates.push('max_students = ?'); params.push(max_students); }
    if (status) { updates.push('status = ?'); params.push(status); }

    params.push(req.params.id);
    await asyncQuery(`UPDATE topic SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/:id', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    await asyncQuery('DELETE FROM topic WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;