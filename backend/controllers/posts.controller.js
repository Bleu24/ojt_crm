const Post = require('../models/Post.model');

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const post = new Post({
      ...req.body,
      createdBy: req.user.userId
    });
    await post.save();
    res.status(201).json({ message: 'Post created successfully', post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all posts (can be filtered later)
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().populate('createdBy', 'name email');
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update post by ID
exports.updatePost = async (req, res) => {
  try {
    const updated = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Post not found' });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete post by ID
exports.deletePost = async (req, res) => {
  try {
    const deleted = await Post.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Post not found' });
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
