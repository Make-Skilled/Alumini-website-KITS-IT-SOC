const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const cors = require('cors')
const { ObjectId } = require('mongodb'); // Import ObjectId from MongoDB

const app = express();
app.use(cors());
const port = 3000;
const mongoUrl = 'mongodb+srv://krishnareddy:1234567890@diploma.1v5g6.mongodb.net/';
const dbName = 'userDB';
let db;

// Middleware
app.use(bodyParser.json());

// Connect to MongoDB
MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db(dbName);
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });


  app.post('/signup', async (req, res) => {
    const { email, username, password, confirmPassword } = req.body;
  
    // Check for required fields
    if (!email || !username || !password || !confirmPassword) {
      return res.status(400).send({ error: 'All fields are required' });
    }
  
    // Validate password confirmation
    if (password !== confirmPassword) {
      return res.status(400).send({ error: 'Passwords do not match' });
    }
  
    try {
      const usersCollection = db.collection('users');
  
      // Check if the username or email already exists
      const existingUser = await usersCollection.findOne({ $or: [{ username }, { email }] });
  
      if (existingUser) {
        return res.status(400).send({ error: 'Username or email already exists' });
      }
  
      // Insert new user into the database (without password hashing)
      const newUser = {
        email,
        username,
        password,  // Store the password as plain text
      };
  
      const result = await usersCollection.insertOne(newUser);
  
      // Return success response
      res.status(201).send({ message: 'User registered successfully' });
  
    } catch (err) {
      console.error('Error during registration:', err);
      res.status(500).send({ error: 'Internal server error' });
    }
  });
  

  app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const usersCollection = db.collection('users');

        // Find the user by username
        const user = await usersCollection.findOne({ username });

        // If user doesn't exist
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Compare password directly (no hashing)
        if (user.password === password) {
            // Since we're not using JWT, you can use session or other methods.
            // For now, we'll return a simple message.
            return res.status(200).json({
                message: 'Login successful',
                user: { username: user.username },
            });
        } else {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

    } catch (err) {
        console.error('Error during login:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


// Admin Login API
app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send({ error: 'Username and password are required' });
  }

  if (username === 'admin' && password === 'admin@123') {
    res.status(200).send({ message: 'Admin login successful' });
  } else {
    res.status(401).send({ error: 'Invalid admin credentials' });
  }
});

app.post('/add-event', async (req, res) => {
    const { eventName, registrationFee, eventDate, numPeople, department, location } = req.body;
  
    if (!eventName || !registrationFee || !eventDate || !numPeople || !department || !location) {
        return res.status(400).send({ error: 'All fields are required' });
    }
  
    try {
        const eventsCollection = db.collection('events');
        const newEvent = {
            eventName,
            registrationFee: parseFloat(registrationFee),
            eventDate: new Date(eventDate),
            numPeople: parseInt(numPeople, 10),
            department,
            location,
            totalRegistrations: 0, // Initialize total registrations to 0
            registeredUsers: [] // Initialize an empty list of registered users
        };
  
        const result = await eventsCollection.insertOne(newEvent);
        res.status(201).send({ message: 'Event added successfully', eventId: result.insertedId });
    } catch (err) {
        console.error('Error adding event:', err);
        res.status(500).send({ error: 'Internal server error' });
    }
});



app.get('/all-events', async (req, res) => {
    try {
      const eventsCollection = db.collection('events');
      const events = await eventsCollection.find().toArray();
  
      res.status(200).send(events);
    } catch (err) {
      console.error('Error fetching events:', err);
      res.status(500).send({ error: 'Internal server error' });
    }
});
  
// DELETE endpoint to delete an event by ID
app.delete('/delete-event/:id', async (req, res) => {
    const eventId = req.params.id;
    console.log(`Deleting event with ID: ${eventId}`);

    try {
        const eventsCollection = db.collection('events');

        // Check if the eventId is a valid ObjectId
        if (!ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }

        // Delete the event from the database using the eventId
        const result = await eventsCollection.deleteOne({ _id: new ObjectId(eventId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ message: 'Failed to delete the event' });
    }
});

app.get('/event/:id', async (req, res) => {
    const eventId = req.params.id; // Get the event ID from the request parameters
    console.log(`Fetching details for event with ID: ${eventId}`);

    try {
        const eventsCollection = db.collection('events'); // Reference to the 'events' collection

        // Check if the eventId is a valid ObjectId
        if (!ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }

        // Find the event in the database by its _id
        const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) });

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Return the event details as a JSON response
        res.status(200).json(event);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ message: 'Failed to fetch event details' });
    }
});

// PUT endpoint to update an event by ID
app.put('/update-event/:id', async (req, res) => {
    const eventId = req.params.id; // Get the event ID from the request parameters
    console.log(`Updating event with ID: ${eventId}`);

    // Extract the updated event data from the request body
    const { eventName, registrationFee, eventDate, numPeople, department, location } = req.body;

    // Validate the data
    if (!eventName || !registrationFee || !eventDate || !numPeople || !department || !location) {
        return res.status(400).send({ error: 'All fields are required' });
    }

    try {
        const eventsCollection = db.collection('events'); // Reference to the 'events' collection

        // Check if the eventId is a valid ObjectId
        if (!ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }

        // Prepare the updated event object
        const updatedEvent = {
            eventName,
            registrationFee: parseFloat(registrationFee),
            eventDate: new Date(eventDate), // Convert the eventDate string to Date object
            numPeople: parseInt(numPeople, 10),
            department,
            location,
        };

        // Update the event in the database by its _id
        const result = await eventsCollection.updateOne(
            { _id: new ObjectId(eventId) }, // Filter to find the event by _id
            { $set: updatedEvent } // Set the updated event data
        );

        // Check if the event was found and updated
        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'Event not found or no changes made' });
        }

        // Return the updated event details as a response
        res.status(200).json({ message: 'Event updated successfully', updatedEvent });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ message: 'Failed to update event' });
    }
});

// POST /register endpoint for event registration
app.post('/register-event', async (req, res) => {
    const { eventId, username } = req.body;  // Get the eventId and username from the request body

    if (!eventId || !username) {
        return res.status(400).json({ error: 'Event ID and Username are required' });
    }

    try {
        const eventsCollection = db.collection('events');

        // Find the event by eventId
        const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) });

        // If the event doesn't exist, return an error
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Check if the username is already registered for the event
        if (event.registeredUsers.includes(username)) {
            return res.status(400).json({ error: 'User is already registered for this event' });
        }

        // Check if the total registrations have reached the limit
        if (event.totalRegistrations >= event.numPeople) {
            return res.status(400).json({ error: 'Event is fully booked' });
        }

        // Add the username to the registeredUsers array
        const updatedEvent = await eventsCollection.updateOne(
            { _id: new ObjectId(eventId) },
            { 
                $push: { registeredUsers: username },  // Add the username to the registeredUsers array
                $inc: { totalRegistrations: 1 }  // Increment totalRegistrations by 1
            }
        );

        // Check if the event was updated
        if (updatedEvent.modifiedCount === 0) {
            return res.status(500).json({ error: 'Failed to register user for the event' });
        }

        // Return success message
        res.status(200).json({ message: 'Registration successful' });
    } catch (err) {
        console.error('Error during event registration:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

  

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
