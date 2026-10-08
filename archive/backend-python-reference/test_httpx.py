import httpx
from google.oauth2 import id_token as google_id_token
import google.auth.transport

class HttpxResponse(google.auth.transport.Response):
    def __init__(self, response: httpx.Response):
        self._response = response

    @property
    def status(self):
        return self._response.status_code

    @property
    def headers(self):
        return self._response.headers

    @property
    def data(self):
        return self._response.content

class HttpxRequest(google.auth.transport.Request):
    def __init__(self):
        self.client = httpx.Client()

    def __call__(self, url, method="GET", body=None, headers=None, timeout=None, **kwargs):
        response = self.client.request(
            method, url, content=body, headers=headers, timeout=timeout
        )
        return HttpxResponse(response)

try:
    req = HttpxRequest()
    print("Request object created successfully.")
    # Fetch certs manually to test HttpxRequest
    res = req("https://www.googleapis.com/oauth2/v1/certs")
    print("Certs fetched successfully:", len(res.data) > 0)
except Exception as e:
    print("Error:", e)
