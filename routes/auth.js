const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const config = require('../config/default');

const pool = mysql.createPool(config.db);

const router = express.Router();

const initTestUsers = () => {
  const testUsers = [
    { username: 'admin', real_name: '系统管理员', role: 'admin', major: '计算机学院' },
    { username: 'student1', real_name: '张三', role: 'student', major: '计算机科学' },
    { username: 'teacher1', real_name: '李教授', role: 'teacher', major: '软件工程' }
  ];
  
  testUsers.forEach(user => {
    pool.query('SELECT id FROM user WHERE username = ?', [user.username], (err, results) => {
      if (!results || results.length === 0) {
        const password = bcrypt.hashSync('123456', 10);
        pool.query(
          'INSERT INTO user (username, password, real_name, role, major, email) VALUES (?, ?, ?, ?, ?, ?)',
          [user.username, password, user.real_name, user.role, user.major, user.username + '@edu.cn'],
          (err) => { if (!err) console.log('已创建测试账户: ' + user.username + '/123456'); }
        );
      }
    });
  });
};

setTimeout(initTestUsers, 1000);

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ code: 400, message: '用户名和密码不能为空' });
  }

  pool.query('SELECT * FROM user WHERE username = ?', [username], (err, results) => {
    if (err) {
      return res.json({ code: 500, message: '查询错误: ' + err.message });
    }
    
    if (!results || results.length === 0) {
      return res.json({ code: 401, message: '用户名或密码错误' });
    }

    const user = results[0];
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (!isMatch) {
        return res.json({ code: 401, message: '用户名或密码错误' });
      }
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, real_name: user.real_name },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );
      return res.json({ code: 200, message: '登录成功', data: { token, user: { id: user.id, username: user.username, role: user.role, real_name: user.real_name, major: user.major } } });
    });
  });
});

router.post('/logout', (req, res) => {
  res.json({ code: 200, message: '登出成功' });
});

router.post('/changePassword', (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.json({ code: 401, message: '未登录' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    pool.query('SELECT * FROM user WHERE id = ?', [decoded.id], (err, results) => {
      if (err || !results || results.length === 0) return res.json({ code: 404, message: '用户不存在' });
      
      const user = results[0];
      bcrypt.compare(oldPassword, user.password, (err, isMatch) => {
        if (!isMatch) return res.json({ code: 400, message: '原密码错误' });
        
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        pool.query('UPDATE user SET password = ? WHERE id = ?', [hashedPassword, user.id], (err) => {
          if (err) return res.json({ code: 500, message: err.message });
          res.json({ code: 200, message: '密码修改成功' });
        });
      });
    });
  } catch (e) {
    res.json({ code: 401, message: '登录已过期' });
  }
});

module.exports = router;