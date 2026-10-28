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
    # return jsonify(services.get_decision_forecast(delivery_date, cutoff)), 200
    return {'hi': 'hi'}, 200


@blueprint.route("/comparison", methods=["GET"])
def comparison():
    """Per-slot actual vs decision-time forecast, with error. Feeds both charts."""
    start, end = parse_range(request.args)
    cutoff = parse_cutoff(request.args)
    # return jsonify(services.build_comparison(start, end, cutoff)), 200
    return {'hi': 'hi'}, 200


# @blueprint.route("/accuracy", methods=["GET"])
# def accuracy():
#     """
#     Requirement 2. Two modes:
#       decision-time: ?delivery_date=D[&window_days=14]  (history before the cutoff only)
#       backtest:      ?start=S&end=E                     (hindsight over a range)
#     """
#     args = request.args
#     cutoff = parse_cutoff(args)

#     has_delivery = "delivery_date" in args
#     has_range = "start" in args or "end" in args
#     if has_delivery == has_range:
#         raise BadRequest(
#             "provide either delivery_date (decision-time) or start and end (backtest)"
#         )

#     if has_delivery:
#         delivery_date = in_scope(parse_date(args, "delivery_date"), "delivery_date")
#         window_days = parse_window_days(args)
#         result = services.get_decision_time_accuracy(delivery_date, window_days, cutoff)
#     else:
#         start, end = parse_range(args)
#         result = services.get_backtest_accuracy(start, end, cutoff)

#     return jsonify(result), 200
