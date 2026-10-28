from flask import Blueprint, jsonify, request

from conduit.exceptions import BadRequest
from . import services
from .params import (
    in_scope, parse_cutoff, parse_date, parse_range, parse_window_days,
)

blueprint = Blueprint("wind", __name__)


@blueprint.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@blueprint.route("/forecast", methods=["GET"])
def forecast(): 
    """Requirement 1: decision-time forecast for one delivery day (48 slots)."""
    delivery_date = in_scope(parse_date(request.args, "delivery_date"), "delivery_date")
    cutoff = parse_cutoff(request.args)
    return jsonify(services.get_decision_forecast(delivery_date, cutoff)), 200
    # return {'hi': 'hi'}, 200


@blueprint.route("/comparison", methods=["GET"]) #to verify the prediciton results with actual data
def comparison():
    """Per-slot actual vs decision-time forecast, with error. Feeds both charts."""
    delivery_date = in_scope(parse_date(request.args, "delivery_date"), "delivery_date")
    cutoff = parse_cutoff(request.args)
    return jsonify(services.build_comparison(delivery_date, cutoff)), 200
    # return {'hi': 'hi'}, 200


@blueprint.route("/accuracy", methods=["GET"])
def accuracy():
    delivery_date = in_scope(parse_date(request.args, "delivery_date"), "delivery_date")
    cutoff = parse_cutoff(request.args)
    window_days = parse_window_days(request.args)
    return jsonify(services.get_decision_time_accuracy(delivery_date, window_days, cutoff)), 200