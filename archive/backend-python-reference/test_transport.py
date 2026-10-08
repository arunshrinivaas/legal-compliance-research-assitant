import os

import google_auth_oauthlib.flow
flow = google_auth_oauthlib.flow.Flow.from_client_config(
    {
        "web": {
            "client_id": "test_id",
            "project_id": "opuslex",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": "test_secret"
        }
    },
    scopes=["openid"]
)
flow.redirect_uri = "http://localhost:5173/settings"

try:
    flow.fetch_token(code="invalid")
except Exception as e:
    print(type(e), e)
