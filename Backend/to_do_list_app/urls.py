from django.urls import path
from . import views

urlpatterns = [
    path('tasks/', views.task_list, name='task_list'),
    path('taskops/<int:pk>/', views.task_detail, name='task_detail'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.me_view, name='me'),
    path('register/', views.register_view, name='register'),
    path('csrf/', views.get_csrf_token, name='csrf-token'),
]