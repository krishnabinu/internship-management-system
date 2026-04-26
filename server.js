var express = require('express');
var path = require('path');
var db = require('./db');
var studentRoutes = require('./routes/studentRoutes');

var app = express();
var PORT = process.env.PORT || 5000;

// Middleware to parse JSON request bodies automatically
app.use(express.json());

// Serve your HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Main-Page.html'));
});
app.get('/admin/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'Admin-Sign-Up.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'Admin-Dashboard.html'));
});
app.get('/student/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'HTMLPage4.html'));
});

// Serve static files (CSS, images, JS, etc.)
app.use(express.static(__dirname));

// Use your studentRoutes for all routes starting with /api/student
app.use('/api/student', studentRoutes);

// 404 for all other routes
app.use((req, res) => {
  res.status(404).send('Route not found');
});

// Connect to DB, then start server
db.getConnection(function(err, connection) {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
  connection.release();

  app.listen(PORT, () => {
    console.log('✅ Server started successfully on port ' + PORT);
    console.log('Access main page at: http://localhost:' + PORT);
  });
});
