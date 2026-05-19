from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        RECEPCIONISTA = 'RECEPCIONISTA', 'Recepcionista'
        TECNICO = 'TECNICO', 'Técnico'
        JEFE_TALLER = 'JEFE_TALLER', 'Jefe de taller'

    role = models.CharField(max_length=20, choices=Role.choices)
    phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f'{self.get_full_name()} ({self.role})'
