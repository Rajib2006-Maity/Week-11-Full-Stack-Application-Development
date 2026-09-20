require('./setup');
const request = require('supertest');
const app = require('../src/server');

async function registerAndLogin(overrides = {}) {
  const user = {
    username: 'writer',
    email: 'writer@example.com',
    password: 'password123',
    ...overrides
  };
  const res = await request(app).post('/api/auth/register').send(user);
  return { token: res.body.accessToken, user: res.body.user };
}

describe('Post CRUD + comments', () => {
  test('requires auth to create a post', async () => {
    const res = await request(app).post('/api/posts').send({ title: 'Hi', content: 'Hello' });
    expect(res.status).toBe(401);
  });

  test('creates, lists, updates and deletes a post (author only)', async () => {
    const { token } = await registerAndLogin();

    const create = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My First Post', content: '<p>Hello world</p>', tags: 'intro,news' });
    expect(create.status).toBe(201);
    const postId = create.body.post._id;

    const list = await request(app).get('/api/posts');
    expect(list.status).toBe(200);
    expect(list.body.posts.length).toBe(1);

    const update = await request(app)
      .put(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title' });
    expect(update.status).toBe(200);
    expect(update.body.post.title).toBe('Updated Title');

    const otherUser = await registerAndLogin({ username: 'intruder', email: 'intruder@example.com' });
    const forbidden = await request(app)
      .delete(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${otherUser.token}`);
    expect(forbidden.status).toBe(403);

    const del = await request(app)
      .delete(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });

  test('supports nested comment replies and cascading delete', async () => {
    const { token } = await registerAndLogin();

    const post = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Post with comments', content: '<p>Content</p>' });
    const postId = post.body.post._id;

    const topLevel = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Nice post!' });
    expect(topLevel.status).toBe(201);
    const commentId = topLevel.body.comment._id;

    const reply = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Thanks!', parentComment: commentId });
    expect(reply.status).toBe(201);

    const list = await request(app).get(`/api/posts/${postId}/comments`);
    expect(list.body.comments.length).toBe(1); // one root comment
    expect(list.body.comments[0].replies.length).toBe(1); // with one nested reply
    expect(list.body.total).toBe(2);

    const del = await request(app)
      .delete(`/api/posts/${postId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.deletedCount).toBe(2); // parent + its reply
  });

  test('toggling like adds and removes the current user', async () => {
    const { token } = await registerAndLogin();
    const post = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Likeable post', content: '<p>Content</p>' });
    const postId = post.body.post._id;

    const like = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(like.body.likeCount).toBe(1);
    expect(like.body.likedByMe).toBe(true);

    const unlike = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(unlike.body.likeCount).toBe(0);
    expect(unlike.body.likedByMe).toBe(false);
  });
});
