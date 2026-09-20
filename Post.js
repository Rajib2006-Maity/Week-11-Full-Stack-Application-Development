const mongoose = require('mongoose');
const slugify = require('slugify');

const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 150
    },
    slug: {
      type: String,
      unique: true,
      index: true
    },
    content: {
      type: String,
      required: [true, 'Content is required']
    },
    excerpt: {
      type: String,
      maxlength: 280
    },
    coverImage: {
      type: String,
      default: ''
    },
    tags: {
      type: [String],
      default: []
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    views: {
      type: Number,
      default: 0
    },
    published: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Text index powers the ?search= query on GET /api/posts
PostSchema.index({ title: 'text', content: 'text', tags: 'text' });

PostSchema.pre('validate', function generateSlug(next) {
  if (this.title && (this.isModified('title') || !this.slug)) {
    this.slug = `${slugify(this.title, { lower: true, strict: true })}-${Date.now()
      .toString(36)}`;
  }
  if (!this.excerpt && this.content) {
    const plain = this.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    this.excerpt = plain.slice(0, 200);
  }
  next();
});

PostSchema.virtual('likeCount').get(function likeCount() {
  return this.likes ? this.likes.length : 0;
});

PostSchema.set('toJSON', { virtuals: true });
PostSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Post', PostSchema);
