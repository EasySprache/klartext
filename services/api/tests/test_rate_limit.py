import os
import unittest
from unittest.mock import patch

from starlette.requests import Request
from starlette.responses import JSONResponse

from services.api.app import main as app_main


def make_request(
    *,
    path: str = "/openapi.json",
    method: str = "GET",
    client_ip: str = "8.8.8.8",
    headers: dict[str, str] | None = None,
) -> Request:
    raw_headers = [
        (key.lower().encode("latin-1"), value.encode("latin-1"))
        for key, value in (headers or {}).items()
    ]
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("latin-1"),
        "query_string": b"",
        "headers": raw_headers,
        "client": (client_ip, 12345),
        "server": ("testserver", 80),
        "asgi": {"version": "3.0"},
    }
    return Request(scope)


class GetClientIpTests(unittest.TestCase):
    def test_ignores_spoofed_forwarded_header_from_untrusted_public_client(self):
        request = make_request(
            client_ip="8.8.8.8",
            headers={"x-forwarded-for": "1.1.1.1"},
        )

        self.assertEqual(app_main.get_client_ip(request), "8.8.8.8")

    def test_uses_forwarded_header_from_private_trusted_proxy(self):
        request = make_request(
            client_ip="10.0.0.5",
            headers={"x-forwarded-for": "1.1.1.1, 10.0.0.5"},
        )

        self.assertEqual(app_main.get_client_ip(request), "1.1.1.1")

    def test_uses_allowlisted_public_proxy_ip(self):
        request = make_request(
            client_ip="44.55.66.77",
            headers={"x-forwarded-for": "1.1.1.1"},
        )

        with patch.dict(os.environ, {"TRUSTED_PROXY_IPS": "44.55.66.77"}):
            self.assertEqual(app_main.get_client_ip(request), "1.1.1.1")


class RateLimitMiddlewareTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.original_environment = app_main.environment
        self.original_default_rate_limiter = app_main.default_rate_limiter
        self.original_endpoint_rate_limiters = app_main.endpoint_rate_limiters

        app_main.environment = "production"
        app_main.default_rate_limiter = app_main.RateLimiter(max_requests=2, window_seconds=60)
        app_main.endpoint_rate_limiters = {}
        self.middleware = app_main.RateLimitMiddleware(app_main.app)

    async def asyncTearDown(self):
        app_main.environment = self.original_environment
        app_main.default_rate_limiter = self.original_default_rate_limiter
        app_main.endpoint_rate_limiters = self.original_endpoint_rate_limiters

    async def test_spoofed_forwarded_ips_do_not_bypass_rate_limit(self):
        async def call_next(_request: Request):
            return JSONResponse(status_code=200, content={"ok": True})

        first = make_request(
            client_ip="8.8.8.8",
            headers={"x-forwarded-for": "1.1.1.1"},
        )
        second = make_request(
            client_ip="8.8.8.8",
            headers={"x-forwarded-for": "1.0.0.1"},
        )
        third = make_request(
            client_ip="8.8.8.8",
            headers={"x-forwarded-for": "9.9.9.9"},
        )

        response_1 = await self.middleware.dispatch(first, call_next)
        response_2 = await self.middleware.dispatch(second, call_next)
        response_3 = await self.middleware.dispatch(third, call_next)

        self.assertEqual(response_1.status_code, 200)
        self.assertEqual(response_2.status_code, 200)
        self.assertEqual(response_3.status_code, 429)


if __name__ == "__main__":
    unittest.main()
