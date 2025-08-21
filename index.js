require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool, initializeDatabase } = require('./database');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize database tables
initializeDatabase();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Create newsletters directory if it doesn't exist
const newslettersDir = path.join(__dirname, 'uploads', 'newsletters');
console.log('Newsletters directory path:', newslettersDir);
if (!fs.existsSync(newslettersDir)) {
  console.log('Creating newsletters directory...');
  fs.mkdirSync(newslettersDir, { recursive: true });
  console.log('Newsletters directory created successfully');
} else {
  console.log('Newsletters directory already exists');
}

// Configure multer for newsletter PDF uploads
const newsletterUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, newslettersDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for PDFs
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads/newsletters', express.static(newslettersDir));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/api/db-health', async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    res.json({ status: 'healthy', message: 'Database connection successful', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({ status: 'unhealthy', error: 'Database connection failed', details: error.message });
  }
});

// Blog CRUD Endpoints
app.get('/api/blogs', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM blogs ORDER BY created_at DESC');
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs', details: error.message });
  }
});

app.get('/api/blogs/featured', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM blogs WHERE featured = true ORDER BY created_at DESC');
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching featured blogs:', error);
    res.status(500).json({ error: 'Failed to fetch featured blogs', details: error.message });
  }
});

app.get('/api/blogs/:id', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM blogs WHERE id = $1', [req.params.id]);
    client.release();
    
    if (result.rows.length > 0) {
      const blog = result.rows[0];
      // Update views
      await pool.query('UPDATE blogs SET views = views + 1 WHERE id = $1', [req.params.id]);
      res.json(blog);
    } else {
      res.status(404).json({ error: 'Blog not found' });
    }
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ error: 'Failed to fetch blog', details: error.message });
  }
});

app.post('/api/blogs', upload.single('image'), async (req, res) => {
  try {
    const formData = JSON.parse(req.body.data || '{}');
    const { title, excerpt, date, author, category, tags, content, featured } = formData;
    
    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Convert tags string to array if needed
    const tagsArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : tags || [];
    
    // Handle image upload
    let imagePath = '';
    let thumbnailPath = '';
    
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
      thumbnailPath = `/uploads/${req.file.filename}`; // Same image for both
    }
    
    const client = await pool.connect();
    const result = await client.query(`
      INSERT INTO blogs (title, excerpt, image, thumbnail, date, author, category, tags, content, featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [title, excerpt, imagePath, thumbnailPath, date, author, category, tagsArray, content, featured || false]);
    client.release();
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ error: 'Failed to create blog', details: error.message });
  }
});

app.put('/api/blogs/:id', upload.single('image'), async (req, res) => {
  try {
    const formData = JSON.parse(req.body.data || '{}');
    const { title, excerpt, date, author, category, tags, content, featured } = formData;
    
    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Convert tags string to array if needed
    const tagsArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : tags || [];
    
    // Get existing blog to check current image
    const client = await pool.connect();
    const existingResult = await client.query('SELECT * FROM blogs WHERE id = $1', [req.params.id]);
    
    if (existingResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    const existingBlog = existingResult.rows[0];
    
    // Handle image upload
    let imagePath = existingBlog.image;
    let thumbnailPath = existingBlog.thumbnail;
    
    if (req.file) {
      // Delete old image if it exists
      if (existingBlog.image && existingBlog.image.startsWith('/uploads/')) {
        const oldImagePath = path.join(__dirname, existingBlog.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      imagePath = `/uploads/${req.file.filename}`;
      thumbnailPath = `/uploads/${req.file.filename}`; // Same image for both
    }
    
    const result = await client.query(`
      UPDATE blogs 
      SET title = $1, excerpt = $2, image = $3, thumbnail = $4, date = $5, author = $6, category = $7, tags = $8, content = $9, featured = $10
      WHERE id = $11
      RETURNING *
    `, [title, excerpt, imagePath, thumbnailPath, date, author, category, tagsArray, content, featured || false, req.params.id]);
    client.release();
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ error: 'Failed to update blog', details: error.message });
  }
});

app.delete('/api/blogs/:id', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM blogs WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    const blog = result.rows[0];
    
    // Delete associated images
    if (blog.image && blog.image.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, blog.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await client.query('DELETE FROM blogs WHERE id = $1', [req.params.id]);
    client.release();
    
    res.json({ message: 'Blog deleted' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ error: 'Failed to delete blog', details: error.message });
  }
});

// Analytics endpoint
app.get('/api/blogs-analytics', async (req, res) => {
  try {
    const client = await pool.connect();
    const totalPostsResult = await client.query('SELECT COUNT(*) as total FROM blogs');
    const totalViewsResult = await client.query('SELECT COALESCE(SUM(views), 0) as total FROM blogs');
    client.release();
    
    res.json({
      totalPosts: parseInt(totalPostsResult.rows[0].total),
      totalViews: parseInt(totalViewsResult.rows[0].total),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

// Contact Submissions Endpoints
app.post('/api/contact-submissions', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'Name, email, subject, and message are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format', 
        details: 'Please provide a valid email address' 
      });
    }

    const client = await pool.connect();
    const result = await client.query(`
      INSERT INTO contact_submissions (name, email, phone, subject, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name.trim(), email.trim().toLowerCase(), phone ? phone.trim() : '', subject.trim(), message.trim()]);
    client.release();
    
    console.log('Contact submission saved:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating contact submission:', error);
    res.status(500).json({ 
      error: 'Failed to save contact submission', 
      details: error.message 
    });
  }
});

app.get('/api/contact-submissions', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM contact_submissions ORDER BY created_at DESC');
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contact submissions', 
      details: error.message 
    });
  }
});

app.put('/api/contact-submissions/:id/read', async (req, res) => {
  try {
    const { read } = req.body;
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE contact_submissions SET read = $1 WHERE id = $2 RETURNING *
    `, [read, req.params.id]);
    client.release();
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Contact submission not found' });
    }
  } catch (error) {
    console.error('Error updating contact submission:', error);
    res.status(500).json({ 
      error: 'Failed to update contact submission', 
      details: error.message 
    });
  }
});

app.delete('/api/contact-submissions/:id', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('DELETE FROM contact_submissions WHERE id = $1 RETURNING *', [req.params.id]);
    client.release();
    
    if (result.rows.length > 0) {
      console.log('Contact submission deleted:', req.params.id);
      res.json({ message: 'Contact submission deleted' });
    } else {
      res.status(404).json({ error: 'Contact submission not found' });
    }
  } catch (error) {
    console.error('Error deleting contact submission:', error);
    res.status(500).json({ 
      error: 'Failed to delete contact submission', 
      details: error.message 
    });
  }
});

// Newsletter Endpoints
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    const client = await pool.connect();
    
    // Check if already subscribed
    const existingResult = await client.query('SELECT * FROM newsletter_subscribers WHERE email = $1', [email.toLowerCase()]);
    
    if (existingResult.rows.length > 0) {
      const existingSubscriber = existingResult.rows[0];
      
      if (existingSubscriber.unsubscribed) {
        // Reactivate subscription
        const result = await client.query(`
          UPDATE newsletter_subscribers 
          SET unsubscribed = false, unsubscribed_at = NULL 
          WHERE id = $1 
          RETURNING *
        `, [existingSubscriber.id]);
        client.release();
        
        return res.json({ message: 'Subscription reactivated', subscriber: result.rows[0] });
      } else {
        client.release();
        return res.status(400).json({ 
          error: 'Email already subscribed' 
        });
      }
    }

    const result = await client.query(`
      INSERT INTO newsletter_subscribers (email, name)
      VALUES ($1, $2)
      RETURNING *
    `, [email.toLowerCase(), name || '']);
    client.release();
    
    console.log('Newsletter subscription added:', result.rows[0].id);
    res.status(201).json({ message: 'Successfully subscribed', subscriber: result.rows[0] });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    res.status(500).json({ 
      error: 'Failed to subscribe', 
      details: error.message 
    });
  }
});

app.get('/api/newsletter/subscribers', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC');
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching newsletter subscribers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch subscribers', 
      details: error.message 
    });
  }
});

app.put('/api/newsletter/subscribers/:id/unsubscribe', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE newsletter_subscribers 
      SET unsubscribed = true, unsubscribed_at = $1 
      WHERE id = $2 
      RETURNING *
    `, [new Date(), req.params.id]);
    client.release();
    
    if (result.rows.length > 0) {
      console.log('Newsletter subscriber unsubscribed:', req.params.id);
      res.json({ message: 'Successfully unsubscribed', subscriber: result.rows[0] });
    } else {
      res.status(404).json({ error: 'Subscriber not found' });
    }
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error);
    res.status(500).json({ 
      error: 'Failed to unsubscribe', 
      details: error.message 
    });
  }
});

app.delete('/api/newsletter/subscribers/:id', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('DELETE FROM newsletter_subscribers WHERE id = $1 RETURNING *', [req.params.id]);
    client.release();
    
    if (result.rows.length > 0) {
      console.log('Newsletter subscriber deleted:', req.params.id);
      res.json({ message: 'Subscriber deleted' });
    } else {
      res.status(404).json({ error: 'Subscriber not found' });
    }
  } catch (error) {
    console.error('Error deleting newsletter subscriber:', error);
    res.status(500).json({ 
      error: 'Failed to delete subscriber', 
      details: error.message 
    });
  }
});

app.post('/api/newsletter/send', async (req, res) => {
  try {
    const { subject, content, sendTo, subscriberIds } = req.body;
    
    if (!subject || !content) {
      return res.status(400).json({ 
        error: 'Subject and content are required' 
      });
    }

    const client = await pool.connect();
    let targetSubscribers = [];
    
    if (sendTo === 'all') {
      const result = await client.query('SELECT * FROM newsletter_subscribers WHERE unsubscribed = false');
      targetSubscribers = result.rows;
    } else if (sendTo === 'selected' && subscriberIds && subscriberIds.length > 0) {
      const result = await client.query(`
        SELECT * FROM newsletter_subscribers 
        WHERE id = ANY($1) AND unsubscribed = false
      `, [subscriberIds]);
      targetSubscribers = result.rows;
    } else if (sendTo === 'unsubscribed') {
      const result = await client.query('SELECT * FROM newsletter_subscribers WHERE unsubscribed = true');
      targetSubscribers = result.rows;
    }
    client.release();

    // Here you would integrate with your email service (SendGrid, Mailgun, etc.)
    // For now, we'll just log the newsletter details
    console.log('Newsletter would be sent to:', targetSubscribers.length, 'subscribers');
    console.log('Subject:', subject);
    console.log('Content:', content);
    
    // Simulate sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({ 
      message: `Newsletter sent to ${targetSubscribers.length} subscribers`,
      sentTo: targetSubscribers.length
    });
  } catch (error) {
    console.error('Error sending newsletter:', error);
    res.status(500).json({ 
      error: 'Failed to send newsletter', 
      details: error.message 
    });
  }
});

// Newsletter Upload Endpoints
app.post('/api/newsletter/upload', newsletterUpload.single('pdf'), async (req, res) => {
  try {
    console.log('=== Newsletter Upload Request ===');
    console.log('Request received at:', new Date().toISOString());
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    console.log('Request files:', req.files);
    
    // Check for multer errors
    if (req.fileValidationError) {
      console.log('File validation error:', req.fileValidationError);
      return res.status(400).json({ 
        error: 'File validation error', 
        details: req.fileValidationError 
      });
    }
    
    if (!req.file) {
      console.log('No file uploaded');
      console.log('Available request properties:', Object.keys(req));
      console.log('Multer error:', req.fileValidationError);
      return res.status(400).json({ 
        error: 'No file uploaded', 
        details: 'Please select a PDF file to upload. Make sure the file is a valid PDF and under 50MB.' 
      });
    }
    
    const { name, category, date } = req.body;
    
    if (!name || !category || !date) {
      console.log('Missing required fields:', { name, category, date });
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'Name, category, and date are required' 
      });
    }

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      console.log('Invalid file type:', req.file.mimetype);
      return res.status(400).json({ 
        error: 'Invalid file type', 
        details: 'Only PDF files are allowed' 
      });
    }

    console.log('Creating newsletter document...');
    console.log('File saved locally at:', req.file.path);
    console.log('File filename:', req.file.filename);
    console.log('File original name:', req.file.originalname);
    
    const client = await pool.connect();
    const result = await client.query(`
      INSERT INTO newsletter_uploads (name, category, date, filename, original_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name.trim(), category.trim(), new Date(date), req.file.filename, req.file.originalname]);
    client.release();
    
    console.log('Newsletter uploaded successfully:', result.rows[0].id);
    console.log('File stored locally, metadata stored in database');
    res.status(201).json({ message: 'Newsletter uploaded successfully', newsletter: result.rows[0] });
  } catch (error) {
    console.error('Error uploading newsletter:', error);
    res.status(500).json({ 
      error: 'Failed to upload newsletter', 
      details: error.message 
    });
  }
});

app.get('/api/newsletter/uploads', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM newsletter_uploads ORDER BY uploaded_at DESC');
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching uploaded newsletters:', error);
    res.status(500).json({ 
      error: 'Failed to fetch uploaded newsletters', 
      details: error.message 
    });
  }
});

app.delete('/api/newsletter/uploads/:id', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM newsletter_uploads WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Newsletter not found' });
    }
    
    const newsletter = result.rows[0];
    
    // Delete the file from uploads directory
    const filePath = path.join(__dirname, 'uploads', 'newsletters', newsletter.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await client.query('DELETE FROM newsletter_uploads WHERE id = $1', [req.params.id]);
    client.release();
    
    console.log('Newsletter deleted:', req.params.id);
    res.json({ message: 'Newsletter deleted successfully' });
  } catch (error) {
    console.error('Error deleting newsletter:', error);
    res.status(500).json({ 
      error: 'Failed to delete newsletter', 
      details: error.message 
    });
  }
});

// Testimonials CRUD Endpoints
app.get('/api/testimonials', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM testimonials WHERE active = true ORDER BY created_at DESC');
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ error: 'Failed to fetch testimonials', details: error.message });
  }
});

app.get('/api/testimonials/all', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM testimonials ORDER BY created_at DESC');
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all testimonials:', error);
    res.status(500).json({ error: 'Failed to fetch testimonials', details: error.message });
  }
});

app.post('/api/testimonials', async (req, res) => {
  try {
    const { name, company, rating, testimonial } = req.body;
    
    // Validate required fields
    if (!name || !company || !rating) {
      return res.status(400).json({ error: 'Name, company, and rating are required' });
    }
    
    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    const client = await pool.connect();
    const result = await client.query(`
      INSERT INTO testimonials (name, company, rating, testimonial)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name.trim(), company.trim(), parseInt(rating), testimonial ? testimonial.trim() : '']);
    client.release();
    
    console.log('Testimonial created:', result.rows[0].id);
    res.status(201).json({ message: 'Testimonial created successfully', testimonial: result.rows[0] });
  } catch (error) {
    console.error('Error creating testimonial:', error);
    res.status(500).json({ error: 'Failed to create testimonial', details: error.message });
  }
});

app.put('/api/testimonials/:id', async (req, res) => {
  try {
    const { name, company, rating, testimonial, active } = req.body;
    
    // Validate required fields
    if (!name || !company || !rating) {
      return res.status(400).json({ error: 'Name, company, and rating are required' });
    }
    
    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE testimonials 
      SET name = $1, company = $2, rating = $3, testimonial = $4, active = $5
      WHERE id = $6 
      RETURNING *
    `, [name.trim(), company.trim(), parseInt(rating), testimonial ? testimonial.trim() : '', active !== undefined ? active : true, req.params.id]);
    client.release();
    
    if (result.rows.length > 0) {
      console.log('Testimonial updated:', req.params.id);
      res.json({ message: 'Testimonial updated successfully', testimonial: result.rows[0] });
    } else {
      res.status(404).json({ error: 'Testimonial not found' });
    }
  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({ error: 'Failed to update testimonial', details: error.message });
  }
});

app.delete('/api/testimonials/:id', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('DELETE FROM testimonials WHERE id = $1 RETURNING *', [req.params.id]);
    client.release();
    
    if (result.rows.length > 0) {
      console.log('Testimonial deleted:', req.params.id);
      res.json({ message: 'Testimonial deleted successfully' });
    } else {
      res.status(404).json({ error: 'Testimonial not found' });
    }
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({ error: 'Failed to delete testimonial', details: error.message });
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Handle multer errors specifically
  if (error instanceof multer.MulterError) {
    console.log('Multer error:', error.code);
    return res.status(400).json({
      error: 'File upload error',
      details: error.message
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error', 
    details: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 PostgreSQL database connected`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 