from django.db import models


class Client(models.Model):
    class DocumentType(models.TextChoices):
        CEDULA = 'CEDULA', 'Cédula'
        NIT = 'NIT', 'NIT'

    document_type = models.CharField(max_length=6, choices=DocumentType.choices)
    document_number = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    address = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.document_number})'
