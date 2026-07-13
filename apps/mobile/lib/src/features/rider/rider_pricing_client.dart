import 'dart:convert';

import 'package:http/http.dart' as http;

import 'rider_booking_client.dart';

class RiderFareEstimateRequest {
  const RiderFareEstimateRequest({
    required this.categoryCode,
    required this.pickup,
    required this.destination,
    this.scheduledPickupAt,
  });

  final String categoryCode;
  final RiderCoordinates pickup;
  final RiderCoordinates destination;
  final DateTime? scheduledPickupAt;

  Map<String, dynamic> toJson() => {
    'categoryCode': categoryCode,
    'pickup': pickup.toJson(),
    'destination': destination.toJson(),
    if (scheduledPickupAt != null)
      'scheduledPickupAt': scheduledPickupAt!.toUtc().toIso8601String(),
  };
}

class RiderFareBreakdown {
  const RiderFareBreakdown({
    required this.baseFareMinor,
    required this.distanceFareMinor,
    required this.timeFareMinor,
    required this.bookingFeeMinor,
    required this.subtotalMinor,
  });

  final int baseFareMinor;
  final int distanceFareMinor;
  final int timeFareMinor;
  final int bookingFeeMinor;
  final int subtotalMinor;

  factory RiderFareBreakdown.fromJson(Map<String, dynamic> json) {
    return RiderFareBreakdown(
      baseFareMinor: json['baseFareMinor'] as int,
      distanceFareMinor: json['distanceFareMinor'] as int,
      timeFareMinor: json['timeFareMinor'] as int,
      bookingFeeMinor: json['bookingFeeMinor'] as int,
      subtotalMinor: json['subtotalMinor'] as int,
    );
  }
}

class RiderFareEstimate {
  const RiderFareEstimate({
    required this.fareMinor,
    required this.currency,
    required this.policyId,
    required this.policyVersion,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.routeMethod,
    required this.multiplier,
    required this.capApplied,
    required this.breakdown,
    required this.explanationLines,
  });

  final int fareMinor;
  final String currency;
  final String policyId;
  final int policyVersion;
  final int distanceMeters;
  final int durationSeconds;
  final String routeMethod;
  final double multiplier;
  final bool capApplied;
  final RiderFareBreakdown breakdown;
  final List<String> explanationLines;

  factory RiderFareEstimate.fromJson(Map<String, dynamic> json) {
    return RiderFareEstimate(
      fareMinor: json['fareMinor'] as int,
      currency: json['currency'] as String,
      policyId: json['policyId'] as String,
      policyVersion: json['policyVersion'] as int,
      distanceMeters: json['distanceMeters'] as int,
      durationSeconds: json['durationSeconds'] as int,
      routeMethod: json['routeMethod'] as String,
      multiplier: (json['multiplier'] as num).toDouble(),
      capApplied: json['capApplied'] as bool,
      breakdown: RiderFareBreakdown.fromJson(
        json['breakdown'] as Map<String, dynamic>,
      ),
      explanationLines: (json['explanationLines'] as List<dynamic>)
          .cast<String>(),
    );
  }
}

abstract class RiderPricingClient {
  Future<RiderFareEstimate> estimateFare({
    required String accessToken,
    required RiderFareEstimateRequest request,
  });
}

class RiderPricingException implements Exception {
  const RiderPricingException(this.message);

  final String message;

  @override
  String toString() => message;
}

class HttpRiderPricingClient implements RiderPricingClient {
  HttpRiderPricingClient({required this.baseUrl, http.Client? client})
    : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  @override
  Future<RiderFareEstimate> estimateFare({
    required String accessToken,
    required RiderFareEstimateRequest request,
  }) async {
    try {
      final response = await _client.post(
        Uri.parse('$baseUrl/pricing/estimate'),
        headers: {
          'Authorization': 'Bearer $accessToken',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(request.toJson()),
      );
      final body = response.body.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(response.body);
      if (response.statusCode >= 400) {
        final message = body is Map<String, dynamic>
            ? body['message']?.toString() ?? 'Unable to estimate fare'
            : 'Unable to estimate fare';
        throw RiderPricingException(message);
      }
      if (body is! Map<String, dynamic>) {
        throw const RiderPricingException('Unexpected fare estimate response');
      }
      return RiderFareEstimate.fromJson(body);
    } on RiderPricingException {
      rethrow;
    } catch (_) {
      throw const RiderPricingException('Unable to estimate fare. Try again.');
    }
  }
}
