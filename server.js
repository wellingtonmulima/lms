// server.js
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const { check, validationResult } = require('express-validator');
const app = express();

// Configure session middleware
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Willy1997!',
    database: 'learning_management'
});

// Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL as id ' + connection.threadId);
});

// Serve static files from the default directory
app.use(express.static(__dirname));

// Set up middleware to parse incoming JSON data
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Define routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


  
// Define a User representation for clarity
const User = {
    tableName: 'users', 
    createUser: function(newUser, callback) {
        connection.query('INSERT INTO ' + this.tableName + ' SET ?', newUser, callback);
    },  
    getUserByEmail: function(email, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE email = ?', email, callback);
    },
    getUserByUsername: function(username, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE username = ?', username, callback);
    }
};

// Registration route
app.post('/register', [
    // Validate email and username fields
    check('email').isEmail(),
    check('username').isAlphanumeric().withMessage('Username must be alphanumeric'),

    // Custom validation to check if email and username are unique
    check('email').custom(async (value) => {
        const user = await User.getUserByEmail(value);
        if (user) {
            throw new Error('Email already exists');
        }
    }),
    check('username').custom(async (value) => {
        const user = await User.getUserByUsername(value);
        if (user) {
            throw new Error('Username already exists');
        }
    }),
], async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    // Create a new user object
    const newUser = {
        email: req.body.email,
        username: req.body.username,
        password: hashedPassword,
        full_name: req.body.full_name
    };

    // Insert user into MySQL
   // User.createUser(newUser, (error, results, fields) => {
   //     if (error) {
       //   console.error('Error inserting user: ' + error.message);
      //    return res.status(500).json({ error: error.message });
      //  }
     //   console.log('Inserted a new user with id ' + results.insertId);
      //  res.status(201).json(newUser);
     // });
//});

    // Save the user to the database
    try {
        const savedUser = await newUser.save();
        res.status(201).json(savedUser); // Return the newly created user
    } catch (err) {
        res.status(500).json({ error: err.message }); // Handle database errors
    }
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Retrieve user from database
    connection.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            res.status(401).send('Invalid username or password');
        } else {
            const user = results[0];
            // Compare passwords
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) throw err;
                if (isMatch) {
                    // Store user in session
                    req.session.user = user;
                    res.send('Login successful');
                } else {
                    res.status(401).send('Invalid username or password');
                }
            });
        }
    });
});


//app.post('/course-content', (req, res) => {
    // Check if user is authenticated
   // if (req.session.user) {
        // Render courses page and pass user data if needed
        //res.render('course-content.html', { user: req.session.user });
    //} else {
        // Redirect to login page if user is not authenticated
        //res.redirect('/login');
   // }
//});



// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.send('Logout successful');
});

//Dashboard route
app.get('/dashboard', (req, res) => {
    // Assuming you have middleware to handle user authentication and store user information in req.user
    const userFullName = req.user.full_name;
    res.render('dashboard', { fullName: userFullName });

});

//course selection route
app.post('/select-courses',(req,res) =>{
    const {selectedCourses} = req.body;
    const userId = req.session.user.id; // Assuming you store user id in session

    //insert selected courses into database
    const sql = 'INSERT INTO user_courses (user_id, course_id) VALUES ?';
    const values = selectedCourses.map(courseId => [userId, courseId]);
    connection.query(sql, [values], (err, result) => {
        if (err){
            console.error('Error inserting selected courses:', err);
            res.status(500).send('Failed to select courses');
        }else{
            res.status(200).send('Courses selected successfully');
        }
    });
});


// Fetch selected courses for the current user
app.get('/selected-courses', (req, res) => {
    const userId = req.session.user.id; // Assuming you store user id in session

    // Fetch selected courses from database for the current user
    const sql = 'SELECT * FROM courses INNER JOIN user_courses ON courses.id = user_courses.course_id WHERE user_courses.user_id = ?';
    connection.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching selected courses:', err);
            res.status(500).send('Failed to fetch selected courses');
        } else {
            res.status(200).json(results);
        }
    });
});

//route to serve course course-content.html

//app.get('/course-content.html',(req,res) =>{
   // res.sendFile(__dirname + '/course-content.html');
//});

// Route to retrieve course content
app.get('/course/:id', (req, res) => {
    const courseId = req.params.id;
    const sql = 'SELECT * FROM courses WHERE id = ?';
    db.query(sql, [courseId], (err, result) => {
      if (err) {
        throw err;
      }
      // Send course content as JSON response
      res.json(result);
    });
  });

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});