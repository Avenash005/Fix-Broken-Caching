const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error' 
  });
});
const cacheService = require('./cacheService');



// GET /tasks
app.get('/tasks', async (req, res, next) => {
  try {
    const tasks = await cacheService.getOrSet('tasks:list', () => prisma.task.findMany());
    res.status(200).json(tasks || []);
  } catch (err) {
    next(err);
  }
});


// GET /tasks/:id
app.get('/tasks/:id', async (req, res, next) => {
  const { id } = req.params;
  const taskId = parseInt(id);
  if (isNaN(taskId)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const task = await cacheService.getOrSet(`task:${taskId}`, () => prisma.task.findUnique({
      where: { id: taskId }
    }));
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
});


// POST /tasks
app.post('/tasks', async (req, res, next) => {
  const { title, description, price } = req.body;
  if (!title || !description || !price) {
    return res.status(400).json({ error: 'Title, description, and price required' });
  }

  try {
    const newTask = await prisma.task.create({
      data: { 
        title, 
        description, 
        price: parseFloat(price) 
      }
    });
    cacheService.invalidate('tasks:list');
    res.status(201).json(newTask);
  } catch (err) {
    next(err);
  }
});


// DELETE /tasks/:id
app.delete('/tasks/:id', async (req, res, next) => {
  const { id } = req.params;
  const taskId = parseInt(id);
  if (isNaN(taskId)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    await prisma.task.delete({
      where: { id: taskId }
    });
    cacheService.invalidate('tasks:list');
    cacheService.invalidate(`task:${taskId}`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

