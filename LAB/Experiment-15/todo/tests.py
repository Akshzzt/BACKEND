from django.contrib.staticfiles import finders
from django.test import TestCase
from django.urls import reverse

from .models import Task


class TaskModelAndViewsTests(TestCase):
    def test_task_str_returns_title(self):
        task = Task.objects.create(title='Write Django tests')
        self.assertEqual(str(task), 'Write Django tests')
        self.assertFalse(task.completed)

    def test_task_list_uses_modular_templates_and_static(self):
        Task.objects.create(title='Sample Task')
        response = self.client.get(reverse('task_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Sample Task')
        self.assertContains(response, '/static/css/style.css')
        self.assertTemplateUsed(response, 'todo/base.html')
        self.assertTemplateUsed(response, 'todo/partials/_navbar.html')
        self.assertTemplateUsed(response, 'todo/partials/_task_item.html')
        self.assertTemplateUsed(response, 'todo/partials/_footer.html')

    def test_add_task_post_creates_task_and_ignores_blank(self):
        post_response = self.client.post(reverse('add_task'), {'title': '  Learn MVT  '})
        self.assertRedirects(post_response, reverse('task_list'))
        self.assertEqual(Task.objects.count(), 1)
        self.assertEqual(Task.objects.first().title, 'Learn MVT')

        blank_response = self.client.post(reverse('add_task'), {'title': '   '})
        self.assertRedirects(blank_response, reverse('task_list'))
        self.assertEqual(Task.objects.count(), 1)

    def test_toggle_and_delete_task(self):
        task = Task.objects.create(title='Toggle Me')
        toggle_resp = self.client.get(reverse('toggle_task', args=[task.id]))
        self.assertRedirects(toggle_resp, reverse('task_list'))
        task.refresh_from_db()
        self.assertTrue(task.completed)

        del_resp = self.client.get(reverse('delete_task', args=[task.id]))
        self.assertRedirects(del_resp, reverse('task_list'))
        self.assertEqual(Task.objects.count(), 0)

    def test_nonexistent_task_returns_404(self):
        self.assertEqual(self.client.get(reverse('toggle_task', args=[999])).status_code, 404)
        self.assertEqual(self.client.get(reverse('delete_task', args=[999])).status_code, 404)

    def test_static_files_discoverable(self):
        self.assertIsNotNone(finders.find('css/style.css'))
        self.assertIsNotNone(finders.find('js/app.js'))
