# Backend API for Blog

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the backend directory with the following content:
   ```env
   MONGO_URI=mongodb://localhost:27017/blogdb
   PORT=5000
   ```
3. Start the server:
   ```bash
   node index.js
   ```

## API Endpoints
- `GET /api/blogs` - List all blogs
- `GET /api/blogs/:id` - Get a single blog (increments views)
- `POST /api/blogs` - Create a new blog
- `PUT /api/blogs/:id` - Update a blog
- `DELETE /api/blogs/:id` - Delete a blog
- `GET /api/blogs-analytics` - Get blog analytics (total posts, total views) 