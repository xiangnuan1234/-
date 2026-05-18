const mysql = require('mysql2');
const config = require('./default');

const pool = mysql.createPool(config.db);

const db = {
  query: (sql, values) => {
    return new Promise((resolve, reject) => {
      pool.query(sql, values, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  },
  getConnection: (callback) => {
    return pool.getConnection(callback);
  }
};

const initDatabase = () => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('数据库连接失败:', err.message);
      return;
    }

    connection.query("SELECT 1", (err) => {
      if (err) {
        console.error('查询测试失败:', err.message);
        return;
      }

      const sqlTables = [
        `CREATE TABLE IF NOT EXISTS user (
          id INT PRIMARY KEY AUTO_INCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          real_name VARCHAR(50) NOT NULL,
          role ENUM('student', 'teacher', 'admin') NOT NULL,
          major VARCHAR(100),
          email VARCHAR(100),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS topic (
          id INT PRIMARY KEY AUTO_INCREMENT,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          requirements TEXT,
          teacher_id INT NOT NULL,
          max_students INT DEFAULT 1,
          status ENUM('open', 'closed') DEFAULT 'open',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (teacher_id) REFERENCES user(id)
        )`,
        `CREATE TABLE IF NOT EXISTS application (
          id INT PRIMARY KEY AUTO_INCREMENT,
          topic_id INT NOT NULL,
          student_id INT NOT NULL,
          priority INT DEFAULT 1,
          status ENUM('pending', 'pass', 'reject') DEFAULT 'pending',
          apply_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (topic_id) REFERENCES topic(id),
          FOREIGN KEY (student_id) REFERENCES user(id)
        )`,
        `CREATE TABLE IF NOT EXISTS proposal (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          file_path VARCHAR(255),
          status ENUM('pending', 'submitted', 'reviewing', 'pass', 'fail') DEFAULT 'pending',
          score INT,
          comment TEXT,
          review_time DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES user(id)
        )`,
        `CREATE TABLE IF NOT EXISTS midterm (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          progress TEXT,
          problems TEXT,
          plan TEXT,
          status ENUM('pending', 'submitted', 'reviewing', 'pass', 'fail') DEFAULT 'pending',
          score INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES user(id)
        )`,
        `CREATE TABLE IF NOT EXISTS document (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          version INT DEFAULT 1,
          file_path VARCHAR(255),
          file_name VARCHAR(200),
          status ENUM('draft', 'submitted', 'reviewed') DEFAULT 'draft',
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES user(id)
        )`,
        `CREATE TABLE IF NOT EXISTS notification (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          title VARCHAR(200) NOT NULL,
          content TEXT,
          is_read BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES user(id)
        )`
      ];

      let created = 0;
      sqlTables.forEach((sql, index) => {
        connection.query(sql, (err) => {
          if (err) console.log('建表', index, ':', err.message);
          created++;
          if (created === sqlTables.length) {
            checkAdmin(connection);
          }
        });
      });
    });
  });
};

const checkAdmin = (connection) => {
  connection.query("SELECT id FROM user WHERE username = 'admin'", (err, results) => {
    if (err || !results || results.length === 0) {
      const bcrypt = require('bcryptjs');
      const password = bcrypt.hashSync('admin123', 10);
      connection.query(
        "INSERT INTO user (username, password, real_name, role, major, email) VALUES (?, ?, ?, ?, ?, ?)",
        ['admin', password, '系统管理员', 'admin', '计算机学院', 'admin@edu.cn'],
        (err) => {
          if (!err) console.log('已创建默认管理员账户: admin / admin123');
          finishInit(connection);
        }
      );
    } else {
      finishInit(connection);
    }
  });
};

const finishInit = (connection) => {
  connection.release();
  console.log('数据库初始化完成');
};

initDatabase();

module.exports = db;