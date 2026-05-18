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

router.get('/overview', auth, roleAuth('admin', 'teacher'), async (req, res) => {
  try {
    const users = await asyncQuery('SELECT role, COUNT(*) as count FROM user GROUP BY role');
    const userStats = { student: 0, teacher: 0, admin: 0 };
    users.forEach(u => { userStats[u.role] = parseInt(u.count); });
    
    const openTopics = await asyncQuery('SELECT COUNT(*) as count FROM topic WHERE status = "open"');
    const selected = await asyncQuery('SELECT COUNT(*) as count FROM application WHERE status = "pass"');
    
    res.json({ code: 200, data: { users: userStats, openTopics: openTopics[0]?.count || 0, selectedStudents: selected[0]?.count || 0 } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/topics/popularity', auth, roleAuth('admin', 'teacher'), async (req, res) => {
  try {
    const results = await asyncQuery(`
      SELECT t.id, t.title, u.real_name as teacher_name,
        (SELECT COUNT(*) FROM application WHERE topic_id = t.id) as application_count
      FROM topic t LEFT JOIN user u ON t.teacher_id = u.id
      ORDER BY application_count DESC LIMIT 10
    `);
    res.json({ code: 200, data: results });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/teachers/stats', auth, roleAuth('admin'), async (req, res) => {
  try {
    const results = await asyncQuery(`
      SELECT u.id, u.real_name,
        (SELECT COUNT(*) FROM topic WHERE teacher_id = u.id) as topic_count,
        (SELECT COUNT(*) FROM application a JOIN topic t ON a.topic_id = t.id WHERE t.teacher_id = u.id AND a.status = "pass") as student_count
      FROM user u WHERE u.role = "teacher"
    `);
    res.json({ code: 200, data: results });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/stages/progress', auth, async (req, res) => {
  try {
    const totalStudents = await asyncQuery('SELECT COUNT(*) as count FROM user WHERE role = "student"');
    const proposalSubmitted = await asyncQuery('SELECT COUNT(*) as count FROM proposal WHERE status != "pending"');
    const midtermSubmitted = await asyncQuery('SELECT COUNT(*) as count FROM midterm WHERE status != "pending"');
    const documentSubmitted = await asyncQuery('SELECT COUNT(*) as count FROM document WHERE status = "submitted"');
    
    const studentCount = totalStudents[0]?.count || 1;
    res.json({
      code: 200,
      data: {
        proposal: { submitted: proposalSubmitted[0]?.count || 0, rate: Math.round((proposalSubmitted[0]?.count || 0) / studentCount * 100) },
        midterm: { submitted: midtermSubmitted[0]?.count || 0, rate: Math.round((midtermSubmitted[0]?.count || 0) / studentCount * 100) },
        document: { submitted: documentSubmitted[0]?.count || 0, rate: Math.round((documentSubmitted[0]?.count || 0) / studentCount * 100) }
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/scores', auth, roleAuth('admin'), async (req, res) => {
  try {
    const proposals = await asyncQuery('SELECT score FROM proposal WHERE score IS NOT NULL');
    const midterms = await asyncQuery('SELECT score FROM midterm WHERE score IS NOT NULL');
    res.json({ code: 200, data: { proposalScores: proposals.map(p => p.score), midtermScores: midterms.map(m => m.score) } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;