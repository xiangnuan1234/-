const express = require('express');
const cors = require('cors');
const db = require('./config/db');  // 引入 db 确保连接池初始化

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/topics', require('./routes/topics'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/midterms', require('./routes/midterms'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/uploads', express.static('./uploads'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ code: 500, message: err.message });
});

// 关键修改：使用 Railway 注入的 PORT，本地开发时回退到 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;