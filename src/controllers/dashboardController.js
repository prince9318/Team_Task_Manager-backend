const Project = require('../models/Project');
const Task = require('../models/Task');
const asyncHandler = require('../utils/asyncHandler');

const getDashboardOverview = asyncHandler(async (req, res) => {
  const projectFilter =
    req.user.role === 'Admin'
      ? {}
      : {
          $or: [{ owner: req.user._id }, { members: req.user._id }],
        };

  const projects = await Project.find(projectFilter).populate('members', 'name role').sort({ createdAt: -1 });
  const projectIds = projects.map((project) => project._id);

  const taskFilter =
    req.user.role === 'Admin'
      ? {}
      : {
          project: { $in: projectIds },
        };

  const tasks = await Task.find(taskFilter)
    .populate('project', 'name')
    .populate('assignee', 'name role');

  const recentTasks = await Task.find(taskFilter)
    .populate('project', 'name')
    .populate('assignee', 'name role')
    .sort({ updatedAt: -1 })
    .limit(6);

  const now = new Date();

  res.json({
    stats: {
      projects: projects.length,
      tasks: tasks.length,
      completed: tasks.filter((task) => task.status === 'Done').length,
      inProgress: tasks.filter((task) => task.status === 'In Progress').length,
      overdue: tasks.filter((task) => task.dueDate && task.dueDate < now && task.status !== 'Done').length,
    },
    recentTasks,
    projectSummaries: projects.map((project) => {
      const relatedTasks = tasks.filter(
        (task) => task.project && task.project._id.toString() === project._id.toString()
      );
      const doneCount = relatedTasks.filter((task) => task.status === 'Done').length;

      return {
        _id: project._id,
        name: project.name,
        status: project.status,
        dueDate: project.dueDate,
        memberCount: project.members.length,
        taskCount: relatedTasks.length,
        completionRate: relatedTasks.length ? Math.round((doneCount / relatedTasks.length) * 100) : 0,
      };
    }),
  });
});

module.exports = {
  getDashboardOverview,
};
