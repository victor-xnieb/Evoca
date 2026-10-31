import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from .managers import UserManager


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField("correo electrónico", unique=True)
    date_of_birth = models.DateField("fecha de nacimiento")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["date_of_birth"]

    objects = UserManager()

    def __str__(self):
        return self.email


class ConsentRecord(models.Model):
    class Type(models.TextChoices):
        TERMS = "terms", "Términos de uso"
        PRIVACY = "privacy", "Política de privacidad"
        HEALTH_DATA = "health_data", "Tratamiento de datos sensibles"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="consents")
    consent_type = models.CharField(max_length=20, choices=Type.choices)
    document_version = models.CharField(max_length=40)
    accepted_at = models.DateTimeField(default=timezone.now, editable=False)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-accepted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "consent_type", "document_version"],
                name="unique_user_consent_version",
            )
        ]

    def __str__(self):
        return f"{self.user.email}: {self.consent_type} ({self.document_version})"

