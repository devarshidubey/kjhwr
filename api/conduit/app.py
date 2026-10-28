from flask import Flask, jsonify
from conduit import wind
from conduit.extensions import cors
from werkzeug.exceptions import HTTPException
from conduit.exceptions import InvalidUsage, error_body

EXPOSED_HTTP_CODES = {400, 404, 405, 422}

def create_app(config_object):
    #application factory

    app = Flask(__name__.split('.')[0])
    app.url_map.strict_slashes = False
    app.config.from_object(config_object)
    
    register_blueprints(app)
    register_errorhandlers(app)

    return app

def register_blueprints(app):
    origins = app.config.get('CORS_ORIGIN_WHITELIST', '*')
    cors.init_app(app, origins=origins)

    app.register_blueprint(wind.views.blueprint, url_prefix='/api/wind')

def generic_500():
    return jsonify(error_body(["Internal server error"], 500)), 500


def register_errorhandlers(app):

    @app.errorhandler(InvalidUsage)
    def handle_invalid_usage(error):
        response = error.to_json()
        response.status_code = error.status_code
        return response

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        code = error.code or 500
        if code in EXPOSED_HTTP_CODES:
            return jsonify(error_body([error.description], code)), code
        app.logger.warning("Unexposed HTTP error %s: %s", code, error)
        return generic_500()

    @app.errorhandler(Exception)
    def handle_unexpected(error):
        app.logger.exception("Unhandled exception")
        return generic_500()