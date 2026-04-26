var express = require('express');
var router = express.Router();
var db = require('../db');
var auth = require('../utils/auth');

// Middleware to authenticate student
var authenticateStudent = function(req, res, next) {
    var token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
        var decoded = auth.verifyToken(token);
        if (decoded.role !== 'student') throw new Error();
        req.student = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// POST /api/student/signup
router.post('/signup', async function(req, res) {
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var email = req.body.email;
    var phone = req.body.phone;
    var password = req.body.password;

    // Validation
    if (!firstName || !lastName || !email || !phone || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Check if email exists
        var [existing] = await db.query(
            'SELECT id FROM students WHERE email = ?', 
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        var hashedPassword = await auth.hashPassword(password);

        // Create student
        var [result] = await db.query(
            `INSERT INTO students 
            (first_name, last_name, email, phone, password) 
            VALUES (?, ?, ?, ?, ?)`,
            [firstName, lastName, email, phone, hashedPassword]
        );

        // Generate JWT
        var token = auth.generateToken({
            id: result.insertId,
            email: email,
            role: 'student'
        });

        res.status(201).json({ 
            message: 'Registration successful', 
            token,
            user: {
                id: result.insertId,
                firstName: firstName,
                lastName: lastName,
                email: email
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/admin/signup', async function(req, res) {
    const {
        companyName,
        contactName,
        email,
        password,
        industry,
        otherIndustry,
        location,
        description,
        logoUrl
    } = req.body;

    if (!companyName || !contactName || !email || !password || !industry || !description) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const finalIndustry = industry === 'Other' ? otherIndustry : industry;

    try {
        const [existing] = await db.query(
            'SELECT id FROM companies WHERE email = ?', 
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await auth.hashPassword(password);

        const [result] = await db.query(
            `INSERT INTO companies
            (company_name, contact_name, email, password, industry, location, description, logo_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyName, contactName, email, hashedPassword, finalIndustry, location, description, logoUrl]
        );

        res.writeHead(302, { Location: '/admin/dashboard' });
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/student/login
router.post('/login', async function(req, res) {
    var email = req.body.email;
    var password = req.body.password;

    try {
        // Find student
        var [students] = await db.query(
            'SELECT * FROM students WHERE email = ?',
            [email]
        );
        
        if (students.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        var student = students[0];

        // Compare passwords
        var isMatch = await auth.comparePassword(password, student.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        var token = auth.generateToken({
            id: student.id,
            email: student.email,
            role: 'student'
        });

        res.json({ 
            message: 'Login successful', 
            token,
            user: {
                id: student.id,
                firstName: student.first_name,
                lastName: student.last_name,
                email: student.email
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /api/student/profile
router.get('/profile', authenticateStudent, async function(req, res) {
    try {
        var [students] = await db.query(
            `SELECT id, first_name, last_name, email, phone, university, nationality, age 
             FROM students WHERE id = ?`,
            [req.student.id]
        );
        
        if (students.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        var student = students[0];
        res.json({
            id: student.id,
            firstName: student.first_name,
            lastName: student.last_name,
            email: student.email,
            phone: student.phone,
            university: student.university,
            nationality: student.nationality,
            age: student.age
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// PUT /api/student/profile
router.put('/profile', authenticateStudent, async function(req, res) {
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var phone = req.body.phone;
    var university = req.body.university;
    var nationality = req.body.nationality;
    var age = req.body.age;

    try {
        await db.query(
            `UPDATE students 
             SET first_name = ?, last_name = ?, phone = ?,
                 university = ?, nationality = ?, age = ?
             WHERE id = ?`,
            [firstName, lastName, phone, university, nationality, age, req.student.id]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /api/internships
router.get('/internships', authenticateStudent, async function(req, res) {
    try {
        var [internships] = await db.query(
            `SELECT i.id, i.title, i.description, i.location, 
                    i.age_requirement, i.salary, i.deadline,
                    c.name AS company_name, c.logo_url
             FROM internships i
             JOIN companies c ON i.company_id = c.id
             WHERE i.deadline > CURDATE()`
        );

        res.json(internships);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /api/apply/:id
router.post('/apply/:id', authenticateStudent, async function(req, res) {
    var internshipId = req.params.id;

    try {
        // Check if already applied
        var [existing] = await db.query(
            `SELECT id FROM applications 
             WHERE student_id = ? AND internship_id = ?`,
            [req.student.id, internshipId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already applied to this internship' });
        }

        // Create application
        await db.query(
            `INSERT INTO applications 
             (student_id, internship_id, status) 
             VALUES (?, ?, 'Pending')`,
            [req.student.id, internshipId]
        );

        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /api/applications
router.get('/applications', authenticateStudent, async function(req, res) {
    try {
        var [applications] = await db.query(
            `SELECT a.id, a.status, a.applied_at,
                    i.title, i.location, i.salary,
                    c.name AS company_name
             FROM applications a
             JOIN internships i ON a.internship_id = i.id
             JOIN companies c ON i.company_id = c.id
             WHERE a.student_id = ?`,
            [req.student.id]
        );

        res.json(applications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;