from django.shortcuts import get_object_or_404, redirect, render
from .models import Task


def task_list(request):
    """Render all tasks ordered newest-first."""
    tasks = Task.objects.all().order_by('-created_at')
    completed_count = tasks.filter(completed=True).count()
    return render(
        request,
        'todo/task_list.html',
        {
            'tasks': tasks,
            'total_count': tasks.count(),
            'completed_count': completed_count,
        },
    )


def add_task(request):
    """Create a new task on POST or display the creation form on GET."""
    if request.method == 'POST':
        title = (request.POST.get('title') or '').strip()
        if title:
            Task.objects.create(title=title)
        return redirect('task_list')
    return render(request, 'todo/add_task.html')


def toggle_task(request, task_id):
    """Toggle completion status of a task."""
    task = get_object_or_404(Task, id=task_id)
    task.completed = not task.completed
    task.save()
    return redirect('task_list')


def delete_task(request, task_id):
    """Delete an existing task."""
    task = get_object_or_404(Task, id=task_id)
    task.delete()
    return redirect('task_list')
