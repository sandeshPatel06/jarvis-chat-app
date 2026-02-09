from django.contrib.auth import get_user_model
from collections import Counter
User = get_user_model()
emails = User.objects.values_list('email', flat=True)
duplicates = [e for e, count in Counter(emails).items() if count > 1]
print(f'Duplicates: {duplicates}')
for email in duplicates:
    if not email: continue
    ids = list(User.objects.filter(email=email).order_by('id').values_list('id', flat=True))[1:]
    User.objects.filter(id__in=ids).delete()
