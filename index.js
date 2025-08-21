require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Test upload endpoint
app.post('/api/test-upload', newsletterUpload.single('pdf'), (req, res) => {
  console.log('Test upload received');
  console.log('File:', req.file);
  console.log('Body:', req.body);
  
  if (req.file) {
    res.json({ 
      message: 'Test upload successful', 
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype
    });
  } else {
    res.status(400).json({ error: 'No file received' });
  }
});

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoURI) {
  console.error('MONGODB_URI environment variable is not set');
  console.log('Server will continue running without database connection');
  console.log('Database features will be limited until connection is established');
}

// Connect to MongoDB with retry logic and better SSL handling
const connectDB = async () => {
  try {
    if (!mongoURI) {
      throw new Error('MongoDB URI not configured');
    }
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
      sslValidate: true,
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
    };

    await mongoose.connect(mongoURI, options);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('Server will continue running without database connection');
    console.log('Database features will be limited until connection is established');
    
    // Log specific SSL/TLS errors
    if (error.code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR') {
      console.error('SSL/TLS Error detected. This might be due to:');
      console.error('1. Network/firewall issues');
      console.error('2. MongoDB Atlas SSL certificate problems');
      console.error('3. TLS version incompatibility');
    }
  }
};

// Initialize database connection
connectDB();

const db = mongoose.connection;
db.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Reconnection logic
db.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  setTimeout(() => {
    connectDB();
  }, 5000);
});

// Blog Schema
const blogSchema = new mongoose.Schema({
  title: String,
  excerpt: String,
  image: String,
  thumbnail: String,
  date: String,
  author: String,
  category: String,
  tags: [String],
  content: String, // HTML/Markdown
  featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
});
const Blog = mongoose.model('Blog', blogSchema);

// Contact Submission Schema
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  subject: String,
  message: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const ContactSubmission = mongoose.model('ContactSubmission', contactSchema);

// Testimonial Schema
const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  testimonial: { type: String, default: '' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
const Testimonial = mongoose.model('Testimonial', testimonialSchema);

// Blog CRUD Endpoints
app.get('/api/blogs', async (req, res) => {
  try {
    if (!mongoose.connection.readyState) {
      return res.status(503).json({ error: 'Database not connected', details: 'Please try again later' });
    }
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs', details: error.message });
  }
});

app.get('/api/blogs/featured', async (req, res) => {
  const featuredBlogs = await Blog.find({ featured: true }).sort({ createdAt: -1 });
  res.json(featuredBlogs);
});

app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (blog) {
      blog.views += 1;
      await blog.save();
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
    
    const blog = new Blog({ 
      title, 
      excerpt, 
      image: imagePath, 
      thumbnail: thumbnailPath, 
      date, 
      author, 
      category, 
      tags: tagsArray, 
      content, 
      featured: featured || false 
    });
    
    await blog.save();
    res.status(201).json(blog);
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
    const existingBlog = await Blog.findById(req.params.id);
    if (!existingBlog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
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
    
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { 
        title, 
        excerpt, 
        image: imagePath, 
        thumbnail: thumbnailPath, 
        date, 
        author, 
        category, 
        tags: tagsArray, 
        content, 
        featured: featured || false 
      },
      { new: true }
    );
    
    res.json(blog);
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ error: 'Failed to update blog', details: error.message });
  }
});

app.delete('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    // Delete associated images
    if (blog.image && blog.image.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, blog.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ error: 'Failed to delete blog', details: error.message });
  }
});

// Analytics endpoint
app.get('/api/blogs-analytics', async (req, res) => {
  const totalPosts = await Blog.countDocuments();
  const totalViews = await Blog.aggregate([
    { $group: { _id: null, views: { $sum: '$views' } } },
  ]);
  res.json({
    totalPosts,
    totalViews: totalViews[0] ? totalViews[0].views : 0,
  });
});

// Newsletter Schema
const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  subscribedAt: { type: Date, default: Date.now },
  unsubscribed: { type: Boolean, default: false },
  unsubscribedAt: { type: Date }
}));

// Newsletter Upload Schema
const NewsletterUpload = mongoose.model('NewsletterUpload', new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  date: { type: Date, required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}));

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

    const submission = new ContactSubmission({ 
      name: name.trim(), 
      email: email.trim().toLowerCase(), 
      phone: phone ? phone.trim() : '', 
      subject: subject.trim(), 
      message: message.trim() 
    });
    
    await submission.save();
    console.log('Contact submission saved:', submission._id);
    res.status(201).json(submission);
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
    const submissions = await ContactSubmission.find().sort({ createdAt: -1 });
    res.json(submissions);
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
    const submission = await ContactSubmission.findByIdAndUpdate(
      req.params.id,
      { read },
      { new: true }
    );
    if (submission) {
      res.json(submission);
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
    const submission = await ContactSubmission.findByIdAndDelete(req.params.id);
    if (submission) {
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

    // Check if already subscribed
    const existingSubscriber = await NewsletterSubscriber.findOne({ email: email.toLowerCase() });
    if (existingSubscriber) {
      if (existingSubscriber.unsubscribed) {
        // Reactivate subscription
        existingSubscriber.unsubscribed = false;
        existingSubscriber.unsubscribedAt = null;
        await existingSubscriber.save();
        return res.json({ message: 'Subscription reactivated', subscriber: existingSubscriber });
      } else {
        return res.status(400).json({ 
          error: 'Email already subscribed' 
        });
      }
    }

    const subscriber = new NewsletterSubscriber({
      email: email.toLowerCase(),
      name: name || ''
    });
    
    await subscriber.save();
    console.log('Newsletter subscription added:', subscriber._id);
    res.status(201).json({ message: 'Successfully subscribed', subscriber });
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
    const subscribers = await NewsletterSubscriber.find().sort({ subscribedAt: -1 });
    res.json(subscribers);
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
    const subscriber = await NewsletterSubscriber.findByIdAndUpdate(
      req.params.id,
      { 
        unsubscribed: true, 
        unsubscribedAt: new Date() 
      },
      { new: true }
    );
    if (subscriber) {
      console.log('Newsletter subscriber unsubscribed:', req.params.id);
      res.json({ message: 'Successfully unsubscribed', subscriber });
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
    const subscriber = await NewsletterSubscriber.findByIdAndDelete(req.params.id);
    if (subscriber) {
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

    let targetSubscribers = [];
    
    if (sendTo === 'all') {
      targetSubscribers = await NewsletterSubscriber.find({ unsubscribed: false });
    } else if (sendTo === 'selected' && subscriberIds && subscriberIds.length > 0) {
      targetSubscribers = await NewsletterSubscriber.find({ 
        _id: { $in: subscriberIds },
        unsubscribed: false 
      });
    } else if (sendTo === 'unsubscribed') {
      targetSubscribers = await NewsletterSubscriber.find({ unsubscribed: true });
    }

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
    
    const newsletter = new NewsletterUpload({
      name: name.trim(),
      category: category.trim(),
      date: new Date(date),
      filename: req.file.filename,
      originalName: req.file.originalname
    });
    
    console.log('Saving newsletter metadata to database...');
    await newsletter.save();
    console.log('Newsletter uploaded successfully:', newsletter._id);
    console.log('File stored locally, metadata stored in database');
    res.status(201).json({ message: 'Newsletter uploaded successfully', newsletter });
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
    const newsletters = await NewsletterUpload.find().sort({ uploadedAt: -1 });
    res.json(newsletters);
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
    const newsletter = await NewsletterUpload.findById(req.params.id);
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }
    
    // Delete the file from uploads directory
    const filePath = path.join(__dirname, 'uploads', 'newsletters', newsletter.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await NewsletterUpload.findByIdAndDelete(req.params.id);
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
    const testimonials = await Testimonial.find({ active: true }).sort({ createdAt: -1 });
    res.json(testimonials);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ error: 'Failed to fetch testimonials', details: error.message });
  }
});

app.get('/api/testimonials/all', async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json(testimonials);
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
    
    const newTestimonial = new Testimonial({
      name: name.trim(),
      company: company.trim(),
      rating: parseInt(rating),
      testimonial: testimonial ? testimonial.trim() : ''
    });
    
    await newTestimonial.save();
    console.log('Testimonial created:', newTestimonial._id);
    res.status(201).json({ message: 'Testimonial created successfully', testimonial: newTestimonial });
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
    
    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        company: company.trim(),
        rating: parseInt(rating),
        testimonial: testimonial ? testimonial.trim() : '',
        active: active !== undefined ? active : true
      },
      { new: true }
    );
    
    if (!updatedTestimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    
    console.log('Testimonial updated:', req.params.id);
    res.json({ message: 'Testimonial updated successfully', testimonial: updatedTestimonial });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({ error: 'Failed to update testimonial', details: error.message });
  }
});

app.delete('/api/testimonials/:id', async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    
    console.log('Testimonial deleted:', req.params.id);
    res.json({ message: 'Testimonial deleted successfully' });
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
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB URI: ${mongoURI ? mongoURI.substring(0, 50) + '...' : 'Not configured'}`);
}); 