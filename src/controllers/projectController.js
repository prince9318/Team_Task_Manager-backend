const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const buildProjectFilter = (user) =>
  user.role === 'Admin'
    ? {}
    : {
        $or: [{ owner: user._id }, { members: user._id }],
      };

const ensureUsersExist = async (userIds = []) => {
  const sanitizedIds = [...new Set(userIds.filter(Boolean))];

  if (!sanitizedIds.every((id) => mongoose.Types.ObjectId.isValid(id))) {
    return { ok: false, message: 'One or more member IDs are invalid.' };
  }

  const count = await User.countDocuments({ _id: { $in: sanitizedIds } });
  if (count !== sanitizedIds.length) {
    return { ok: false, message: 'One or more selected members do not exist.' };
  }

  return { ok: true, userIds: sanitizedIds };
};

const getAllProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find(buildProjectFilter(req.user))
    .populate('owner', 'name email role')
    .populate('members', 'name email role')
    .sort({ createdAt: -1 });

  const projectIds = projects.map((project) => project._id);
  const tasks = await Task.find({ project: { $in: projectIds } }).select('project status dueDate');

  const metricsMap = tasks.reduce((acc, task) => {
    const key = task.project.toString();
    if (!acc[key]) {
      acc[key] = { total: 0, completed: 0, overdue: 0 };
    }

    acc[key].total += 1;
    if (task.status === 'Done') {
      acc[key].completed += 1;
    }
    if (task.dueDate && task.dueDate < new Date() && task.status !== 'Done') {
      acc[key].overdue += 1;
    }

    return acc;
  }, {});

  res.json(
    projects.map((project) => ({
      ...project.toObject(),
      metrics: metricsMap[project._id.toString()] || { total: 0, completed: 0, overdue: 0 },
    }))
  );
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    ...buildProjectFilter(req.user),
  })
    .populate('owner', 'name email role')
    .populate('members', 'name email role');

  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  res.json(project);
});

const createProject = asyncHandler(async (req, res) => {
  const checkedMembers = await ensureUsersExist(req.body.memberIds || []);
  if (!checkedMembers.ok) {
    return res.status(400).json({ message: checkedMembers.message });
  }

  const project = await Project.create({
    name: req.body.name,
    description: req.body.description || '',
    status: req.body.status,
    dueDate: req.body.dueDate || null,
    owner: req.user._id,
    members: [...new Set([req.user._id.toString(), ...checkedMembers.userIds])],
  });

  const populatedProject = await Project.findById(project._id)
    .populate('owner', 'name email role')
    .populate('members', 'name email role');

  res.status(201).json(populatedProject);
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  const checkedMembers = await ensureUsersExist(req.body.memberIds || []);
  if (!checkedMembers.ok) {
    return res.status(400).json({ message: checkedMembers.message });
  }

  project.name = req.body.name;
  project.description = req.body.description || '';
  project.status = req.body.status;
  project.dueDate = req.body.dueDate || null;
  project.members = [...new Set([project.owner.toString(), ...checkedMembers.userIds])];

  await project.save();

  const populatedProject = await Project.findById(project._id)
    .populate('owner', 'name email role')
    .populate('members', 'name email role');

  res.json(populatedProject);
});

const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  await Task.deleteMany({ project: project._id });
  await project.deleteOne();

  res.json({ message: 'Project deleted successfully.' });
});

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
