const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const postController = require('../controllers/posts.controller');

router.post('/', authenticateToken, postController.createPost);
router.get('/', authenticateToken, postController.getAllPosts);
router.put('/:id', authenticateToken, postController.updatePost);
router.delete('/:id', authenticateToken, postController.deletePost);

module.exports = router;
