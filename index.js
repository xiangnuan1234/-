const express = require('express');
const cors = require('cors');
const config = require('./config/default');
const db = require('./config/db');

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

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;