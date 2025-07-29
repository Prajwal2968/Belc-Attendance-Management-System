const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('FATAL ERROR: Could not connect to the database.', err);
        return;
    }
    console.log('Connected to the MySQL database successfully.');
});

const JWT_SECRET = process.env.JWT_SECRET; 

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        if (results.length > 0) {
            const user = results[0];
            const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ token, role: user.role });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    });
});

app.post('/forgot-password', (req, res) => {
    const { username, new_password } = req.body;

    if (!username || !new_password) return res.status(400).json({ message: 'Username and new password are required.' });
    if (!username.endsWith('@gmail.com')) return res.status(400).json({ message: 'Username must be a valid @gmail.com address.' });
    if (new_password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharRegex.test(new_password)) return res.status(400).json({ message: 'Password must contain at least one special character.' });

    db.query('SELECT id FROM users WHERE username = ?', [username], (err, users) => {
        if (err) return res.status(500).json({ message: 'Server error.' });
        if (users.length === 0) return res.status(404).json({ message: 'Username not found.' });
        
        const userId = users[0].id;
        const insertQuery = 'INSERT INTO password_resets (user_id, new_password) VALUES (?, ?)';
        db.query(insertQuery, [userId, new_password], (insertErr) => {
            if (insertErr) return res.status(500).json({ message: 'Failed to submit request.' });
            res.status(201).json({ message: 'Password reset request submitted. An admin will approve it shortly.' });
        });
    });
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.get('/me', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.query('SELECT username FROM users WHERE id = ?', [userId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(results[0]);
    });
});

app.post('/clockin', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const query = 'INSERT INTO attendance (user_id, clock_in) VALUES (?, NOW())';
    db.query(query, [userId], (err) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'Clocked in successfully' });
    });
});

app.post('/clockout', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const query = 'UPDATE attendance SET clock_out = NOW() WHERE user_id = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1';
    db.query(query, [userId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        if (result.affectedRows === 0) return res.status(400).json({ message: 'No active clock-in found to clock out.' });
        res.json({ message: 'Clocked out successfully' });
    });
});

app.get('/attendance', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const query = 'SELECT id, clock_in, clock_out FROM attendance WHERE user_id = ? AND clock_in >= DATE_SUB(NOW(), INTERVAL 2 MONTH) ORDER BY clock_in DESC';
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(results);
    });
});

app.post('/report-issue', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { issue_type, details } = req.body;
    const query = 'INSERT INTO reports (user_id, issue_type, details) VALUES (?, ?, ?)';
    db.query(query, [userId, issue_type, details], (err) => {
        if (err) return res.status(500).json({ message: 'Failed to submit report.' });
        res.status(201).json({ message: 'Report submitted successfully.' });
    });
});

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Admins only.' });
    }
    next();
};

app.get('/admin/attendance/:userId', authenticateToken, isAdmin, (req, res) => {
    const { userId } = req.params;
    const query = `SELECT id, clock_in, clock_out FROM attendance WHERE user_id = ? AND clock_in >= DATE_SUB(NOW(), INTERVAL 2 MONTH) ORDER BY clock_in DESC`;
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

app.put('/admin/attendance/:id', authenticateToken, isAdmin, (req, res) => {
    const { clock_in, clock_out } = req.body;
    const { id } = req.params;
    const query = 'UPDATE attendance SET clock_in = ?, clock_out = ? WHERE id = ?';
    db.query(query, [clock_in, clock_out, id], (err) => {
        if (err) return res.status(500).json({ message: 'Failed to update attendance record.' });
        res.json({ message: 'Attendance record updated successfully.' });
    });
});

app.get('/admin/reports', authenticateToken, isAdmin, (req, res) => {
    const query = `SELECT r.id, r.issue_type, r.details, r.reported_at, u.username FROM reports r JOIN users u ON r.user_id = u.id WHERE r.status = 'Pending' ORDER BY r.reported_at ASC`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(results);
    });
});

app.put('/admin/reports/:reportId', authenticateToken, isAdmin, (req, res) => {
    const { reportId } = req.params;
    const query = "UPDATE reports SET status = 'Resolved' WHERE id = ?";
    db.query(query, [reportId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Failed to update report.' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Report not found.' });
        res.json({ message: 'Report marked as resolved.' });
    });
});

app.get('/admin/password-resets', authenticateToken, isAdmin, (req, res) => {
    const query = `SELECT pr.id, pr.new_password, pr.requested_at, u.username, u.id as user_id FROM password_resets pr JOIN users u ON pr.user_id = u.id WHERE pr.status = 'Pending' ORDER BY pr.requested_at ASC`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(results);
    });
});

app.put('/admin/password-reset/:id', authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const { new_password, user_id } = req.body;
    db.query('UPDATE users SET password = ? WHERE id = ?', [new_password, user_id], (err) => {
        if (err) return res.status(500).json({ message: 'Failed to update password.' });
        db.query("UPDATE password_resets SET status = 'Approved' WHERE id = ?", [id], (updateErr) => {
            if (updateErr) return res.status(500).json({ message: 'Password updated, but failed to update request status.' });
            res.json({ message: 'Password has been changed successfully.' });
        });
    });
});

app.get('/admin/users', authenticateToken, isAdmin, (req, res) => {
    db.query('SELECT id, username, role FROM users', (err, results) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(results);
    });
});

app.post('/admin/users', authenticateToken, isAdmin, (req, res) => {
    const { username, password, role } = req.body;
    const query = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
    db.query(query, [username, password, role], (err) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.status(201).json({ message: 'User created' });
    });
});

app.put('/admin/users/:id', authenticateToken, isAdmin, (req, res) => {
    const { username, role } = req.body;
    const query = 'UPDATE users SET username = ?, role = ? WHERE id = ?';
    db.query(query, [username, role, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'User updated' });
    });
});

app.delete('/admin/users/:id', authenticateToken, isAdmin, (req, res) => {
    const query = 'DELETE FROM users WHERE id = ?';
    db.query(query, [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'User deleted' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});