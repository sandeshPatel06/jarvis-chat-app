def normalize_phone(phone):
    """
    Normalize phone numbers: remove non-numeric chars and keep last 10 digits.
    """
    # Remove all non-numeric characters
    cleaned = ''.join(filter(str.isdigit, str(phone)))
    # Keep last 10 digits (removes country codes like 91, 1, etc.)
    if len(cleaned) > 10:
        cleaned = cleaned[-10:]
    return cleaned
