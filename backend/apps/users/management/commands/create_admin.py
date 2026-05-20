from django.core.management.base import BaseCommand
from decouple import config

from apps.users.models import User


class Command(BaseCommand):
    help = 'Crea el usuario administrador inicial desde variables de entorno'

    def handle(self, *args, **kwargs):
        username = config('ADMIN_USERNAME', default='')
        password = config('ADMIN_PASSWORD', default='')
        first_name = config('ADMIN_FIRST_NAME', default='Admin')
        last_name = config('ADMIN_LAST_NAME', default='')

        if not username or not password:
            self.stdout.write(self.style.WARNING(
                'ADMIN_USERNAME o ADMIN_PASSWORD no definidos — omitiendo creación de admin.'
            ))
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(
                f'El usuario "{username}" ya existe — omitiendo.'
            ))
            return

        User.objects.create_superuser(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=User.Role.JEFE_TALLER,
        )
        self.stdout.write(self.style.SUCCESS(f'Admin "{username}" creado correctamente.'))
