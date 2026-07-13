import 'dart:convert';

import 'package:http/http.dart' as http;

enum RiderPaymentMethod { cash, jazzCash, easypaisa, nayapay }

extension RiderPaymentMethodWireValue on RiderPaymentMethod {
  String get wireValue => switch (this) {
    RiderPaymentMethod.cash => 'cash',
    RiderPaymentMethod.jazzCash => 'jazzcash',
    RiderPaymentMethod.easypaisa => 'easypaisa',
    RiderPaymentMethod.nayapay => 'nayapay',
  };
}

class RiderCoordinates {
  const RiderCoordinates({
    required this.latitude,
    required this.longitude,
    required this.address,
  });

  final double latitude;
  final double longitude;
  final String address;

  Map<String, dynamic> toJson() => {
    'latitude': latitude,
    'longitude': longitude,
    'address': address,
  };
}

class CreateRiderRideRequest {
  const CreateRiderRideRequest({
    required this.categoryCode,
    required this.pickup,
    required this.destination,
    required this.paymentMethod,
    this.scheduledPickupAt,
  });

  final String categoryCode;
  final RiderCoordinates pickup;
  final RiderCoordinates destination;
  final RiderPaymentMethod paymentMethod;
  final DateTime? scheduledPickupAt;

  Map<String, dynamic> toJson() => {
    'categoryCode': categoryCode,
    'pickup': pickup.toJson(),
    'destination': destination.toJson(),
    'paymentMethod': paymentMethod.wireValue,
    if (scheduledPickupAt != null)
      'scheduledPickupAt': scheduledPickupAt!.toUtc().toIso8601String(),
  };
}

class RiderBookingRide {
  const RiderBookingRide({
    required this.id,
    required this.state,
    required this.categoryCode,
    required this.scheduledPickupAt,
    this.estimatedFareMinor,
    this.currency,
    this.farePolicyVersion,
    this.paymentMethod,
  });

  final String id;
  final String state;
  final String categoryCode;
  final String? scheduledPickupAt;
  final int? estimatedFareMinor;
  final String? currency;
  final int? farePolicyVersion;
  final String? paymentMethod;

  factory RiderBookingRide.fromJson(Map<String, dynamic> json) {
    return RiderBookingRide(
      id: json['id'] as String,
      state: json['state'] as String,
      categoryCode: json['categoryCode'] as String,
      scheduledPickupAt: json['scheduledPickupAt'] as String?,
      estimatedFareMinor: json['estimatedFareMinor'] as int?,
      currency: json['currency'] as String?,
      farePolicyVersion: json['farePolicyVersion'] as int?,
      paymentMethod: json['paymentMethod'] as String?,
    );
  }
}

abstract class RiderBookingClient {
  Future<RiderBookingRide> createRide({
    required String accessToken,
    required CreateRiderRideRequest request,
  });

  Future<RiderBookingRide> cancelRide({
    required String accessToken,
    required String rideId,
  });
}

class RiderBookingException implements Exception {
  const RiderBookingException(this.message);

  final String message;

  @override
  String toString() => message;
}

class HttpRiderBookingClient implements RiderBookingClient {
  HttpRiderBookingClient({required this.baseUrl, http.Client? client})
    : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  @override
  Future<RiderBookingRide> createRide({
    required String accessToken,
    required CreateRiderRideRequest request,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/bookings/rides'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode(request.toJson()),
    );
    return RiderBookingRide.fromJson(_decode(response));
  }

  @override
  Future<RiderBookingRide> cancelRide({
    required String accessToken,
    required String rideId,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/bookings/rides/$rideId/cancel'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );
    return RiderBookingRide.fromJson(_decode(response));
  }

  Map<String, dynamic> _decode(http.Response response) {
    final body = response.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body);
    if (response.statusCode >= 400) {
      final message = body is Map<String, dynamic>
          ? body['message']?.toString() ?? 'Unable to request a ride'
          : 'Unable to request a ride';
      throw RiderBookingException(message);
    }
    if (body is! Map<String, dynamic>) {
      throw const RiderBookingException('Unexpected booking response');
    }
    return body;
  }
}
