const express = require('express');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');

const router = express.Router();

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
    const { role, major, page = 1, pageSize = 10 } = req.query;
    let sql = 'SELECT id, username, real_name, role, major, email, created_at FROM user';
    const params = [];
    const conditions = [];

    if (role) { conditions.push('role = ?'); params.push(role); }
    if (major) { conditions.push('major = ?'); params.push(major); }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

    const list = await asyncQuery(sql, params);
    res.json({ code: 200, data: { list, total: list.length, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/', auth, roleAuth('admin'), async (req, res) => {
  try {
    const { username, password, real_name, role, major, email } = req.body;
    if (!username || !password || !real_name || !role) {
      return res.status(400).json({ code: 400, message: '必填项不能为空' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const results = await asyncQuery(
      'INSERT INTO user (username, password, real_name, role, major, email) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, real_name, role, major || null, email || null]
    );
    res.json({ code: 200, message: '创建成功', data: { id: results.insertId } });
  } catch (err) {
    res.status(400).json({ code: 400, message: '用户名已存在' });
  }
});

router.put('/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    const { real_name, major, email, role } = req.body;
    const updates = [];
    const params = [];

    if (real_name) { updates.push('real_name = ?'); params.push(real_name); }
    if (major) { updates.push('major = ?'); params.push(major); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (role) { updates.push('role = ?'); params.push(role); }

    if (updates.length === 0) return res.status(400).json({ code: 400, message: '没有要更新的字段' });

    params.push(req.params.id);
    await asyncQuery(`UPDATE user SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    const results = await asyncQuery('DELETE FROM user WHERE id = ? AND role != "admin"', [req.params.id]);
    if (results.affectedRows === 0) return res.status(400).json({ code: 400, message: '删除失败' });
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/resetPassword/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    const hashedPassword = bcrypt.hashSync('123456', 10);
    await asyncQuery('UPDATE user SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
    res.json({ code: 200, message: '密码已重置为123456' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;