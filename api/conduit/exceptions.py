from flask import jsonify

EXPOSED_HTTP_CODES = {400, 404, 405, 422}

def error_body(messages, code, details=None):
    body = {"error": {"code": code, "messages": messages}}
    if details:
        body["error"]["details"] = details
    return body


class InvalidUsage(Exception):
    status_code = 500
    default_message = "Internal server error"

    def __init__(self, message=None, status_code=None, payload=None):
        super().__init__(message)
        self.message = message or self.default_message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_json(self):
        return jsonify(error_body([self.message], self.status_code, self.payload))


class BadRequest(InvalidUsage):
    status_code = 400
    default_message = "Bad request"


class OutOfScopeDate(BadRequest):
    default_message = "Date must be between 2026-01-02 and 2026-02-01"


class NotFound(InvalidUsage):
    status_code = 404
    default_message = "Resource not found"


class UpstreamError(InvalidUsage):
    status_code = 502
    default_message = "Elexon API unavailable"