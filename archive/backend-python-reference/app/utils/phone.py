import phonenumbers

def normalize_phone_number(phone_str: str) -> str:
    """
    Parses and normalizes a phone number to E.164 format.
    Raises ValueError if the phone number is invalid.
    Does not assume a default region unless explicitly provided,
    but here we require the frontend to provide the country code (e.g., +91, +1).
    """
    try:
        # We don't provide a default region so it expects the user to include country code (+...)
        parsed_number = phonenumbers.parse(phone_str, None)
        if not phonenumbers.is_valid_number(parsed_number):
            raise ValueError("Invalid phone number")
        
        return phonenumbers.format_number(parsed_number, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        raise ValueError("Invalid phone number format. Please include country code, e.g. +1 or +91.")
