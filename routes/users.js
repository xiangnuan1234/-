const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const router = express.Router();

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
    
    // 获取总数
    const countSql = 'SELECT COUNT(*) as total FROM user' + (conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '');
    const countResults = await db.query(countSql, params);
    const total = countResults[0].total;
    
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

    const list = await db.query(sql, params);
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    console.error('获取用户列表错误:', err);
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
    const results = await db.query(
      'INSERT INTO user (username, password, real_name, role, major, email) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, real_name, role, major || null, email || null]
    );
    res.json({ code: 200, message: '创建成功', data: { id: results.insertId } });
  } catch (err) {
    console.error('创建用户错误:', err);
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
    await db.query(`UPDATE user SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    console.error('更新用户错误:', err);
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    const results = await db.query('DELETE FROM user WHERE id = ? AND role != "admin"', [req.params.id]);
    if (results.affectedRows === 0) return res.status(400).json({ code: 400, message: '删除失败' });
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error('删除用户错误:', err);
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/resetPassword/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    const hashedPassword = bcrypt.hashSync('123456', 10);
    await db.query('UPDATE user SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
    res.json({ code: 200, message: '密码已重置为123456' });
  } catch (err) {
    console.error('重置密码错误:', err);
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;