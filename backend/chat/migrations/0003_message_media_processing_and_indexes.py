from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0002_message_contact_name_message_contact_phone_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='media_metadata',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='message',
            name='media_processing_state',
            field=models.CharField(choices=[('ready', 'Ready'), ('pending', 'Pending'), ('processing', 'Processing'), ('failed', 'Failed')], default='ready', max_length=20),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['conversation', 'is_read', 'timestamp'], name='chat_messag_conversa_8b51e7_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['conversation', 'deleted_at', 'timestamp'], name='chat_messag_conversa_7a0be6_idx'),
        ),
    ]
