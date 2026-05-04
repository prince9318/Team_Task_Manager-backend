const Project = require('../models/Project');
const Task = require('../models/Task');
const asyncHandler = require('../utils/asyncHandler');

const buildAccessibleProjects = async (user) => {
  if (user.role === 'Admin') {
    const projects = await Project.find().select('_id');
    return projects.map((project) => project._id);
  }

  const projects = await Project.find({
    $or: [{ owner: user._id }, { members: user._id }],
  }).select('_id');

  return projects.map((project) => project._id);
};

const validateAssigneeMembership = async (projectId, assigneeId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    return { ok: false, status: 404, message: 'Project not found.' };
  }

  const allowedAssignees = new Set([
    project.owner.toString(),
    ...project.members.map((memberId) => memberId.toString()),
  ]);

  if (!allowedAssignees.has(assigneeId)) {
    return { ok: false, status: 400, message: 'Assignee must be part of the selected project.' };
  }

  return { ok: true };
};

const getAllTasks = asyncHandler(async (req, res) => {
  const filter = {};
  let accessibleProjectIds = null;

  if (req.user.role !== 'Admin') {
    accessibleProjectIds = await buildAccessibleProjects(req.user);
    filter.project = { $in: accessibleProjectIds };
  }

  if (req.query.projectId) {
    if (req.user.role === 'Admin') {
      filter.project = req.query.projectId;
    } else if (accessibleProjectIds.some((projectId) => projectId.toString() === req.query.projectId)) {
      filter.project = req.query.projectId;
    } else {
      return res.status(403).json({ message: 'You do not have access to this project.' });
    }
  }

  const tasks = await Task.find(filter)
    .populate('project', 'name status')
    .populate('assignee', 'name email role')
    .populate('createdBy', 'name email role')
    .sort({ dueDate: 1, createdAt: -1 });

  res.json(tasks);
});

const createTask = asyncHandler(async (req, res) => {
  const membership = await validateAssigneeMembership(req.body.projectId, req.body.assigneeId);
  if (!membership.ok) {
    return res.status(membership.status).json({ message: membership.message });
  }

  const task = await Task.create({
    title: req.body.title,
    description: req.body.description || '',
    status: req.body.status,
    priority: req.body.priority,
    dueDate: req.body.dueDate || null,
    project: req.body.projectId,
    assignee: req.body.assigneeId,
    createdBy: req.user._id,
  });

  const populatedTask = await Task.findById(task._id)
    .populate('project', 'name status')
    .populate('assignee', 'name email role')
    .populate('createdBy', 'name email role');

  res.status(201).json(populatedTask);
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const membership = await validateAssigneeMembership(req.body.projectId, req.body.assigneeId);
  if (!membership.ok) {
    return res.status(membership.status).json({ message: membership.message });
  }

  task.title = req.body.title;
  task.description = req.body.description || '';
  task.status = req.body.status;
  task.priority = req.body.priority;
  task.dueDate = req.body.dueDate || null;
  task.project = req.body.projectId;
  task.assignee = req.body.assigneeId;

  await task.save();

  const populatedTask = await Task.findById(task._id)
    .populate('project', 'name status')
    .populate('assignee', 'name email role')
    .populate('createdBy', 'name email role');

  res.json(populatedTask);
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const canUpdate = req.user.role === 'Admin' || task.assignee.toString() === req.user._id.toString();

  if (!canUpdate) {
    return res.status(403).json({ message: 'You can only update tasks assigned to you.' });
  }

  task.status = req.body.status;
  await task.save();

  const populatedTask = await Task.findById(task._id)
    .populate('project', 'name status')
    .populate('assignee', 'name email role')
    .populate('createdBy', 'name email role');

  res.json(populatedTask);
});

const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  await task.deleteOne();
  res.json({ message: 'Task deleted successfully.' });
});

module.exports = {
  getAllTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
