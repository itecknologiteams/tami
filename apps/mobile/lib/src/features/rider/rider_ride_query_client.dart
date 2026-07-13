import 'dart:convert';

import 'package:http/http.dart' as http;

class RiderRideLocation {
  const RiderRideLocation({
    required this.latitude,
    required this.longitude,
    required this.address,
  });

  final double latitude;
  final double longitude;
  final String address;

  factory RiderRideLocation.fromJson(Map<String, dynamic> json) {
    return RiderRideLocation(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      address: json['address'] as String,
    );
  }
}

class RiderRide {
  const RiderRide({
    required this.id,
    required this.state,
    required this.categoryCode,
    required this.pickup,
    required this.destination,
    required this.scheduledPickupAt,
    required this.requestedAt,
    this.estimatedFareMinor,
    this.currency,
    this.farePolicyVersion,
    this.paymentMethod,
  });

  final String id;
  final String state;
  final String categoryCode;
  final RiderRideLocation pickup;
  final RiderRideLocation destination;
  final String? scheduledPickupAt;
  final String requestedAt;
  final int? estimatedFareMinor;
  final String? currency;
  final int? farePolicyVersion;
  final String? paymentMethod;

  factory RiderRide.fromJson(Map<String, dynamic> json) {
    return RiderRide(
      id: json['id'] as String,
      state: json['state'] as String,
      categoryCode: json['categoryCode'] as String,
      pickup: RiderRideLocation.fromJson(
        json['pickup'] as Map<String, dynamic>,
      ),
      destination: RiderRideLocation.fromJson(
        json['destination'] as Map<String, dynamic>,
      ),
      scheduledPickupAt: json['scheduledPickupAt'] as String?,
      requestedAt: json['requestedAt'] as String,
      estimatedFareMinor: json['estimatedFareMinor'] as int?,
      currency: json['currency'] as String?,
      farePolicyVersion: json['farePolicyVersion'] as int?,
      paymentMethod: json['paymentMethod'] as String?,
    );
  }
}

class RiderRidePage {
  const RiderRidePage({required this.items, required this.nextCursor});

  final List<RiderRide> items;
  final String? nextCursor;

  factory RiderRidePage.fromJson(Map<String, dynamic> json) {
    return RiderRidePage(
      items: (json['items'] as List<dynamic>)
          .map((item) => RiderRide.fromJson(item as Map<String, dynamic>))
          .toList(growable: false),
      nextCursor: json['nextCursor'] as String?,
    );
  }
}

abstract class RiderRideQueryClient {
  Future<RiderRide?> getCurrentRide({required String accessToken});

  Future<RiderRide> getRide({
    required String accessToken,
    required String rideId,
  });

  Future<List<RiderRide>> getUpcomingRides({required String accessToken});

  Future<RiderRidePage> getRideHistory({
    required String accessToken,
    String? cursor,
    int limit = 20,
  });
}

class RiderRideQueryException implements Exception {
  const RiderRideQueryException(this.message);

  final String message;

  @override
  String toString() => message;
}

class HttpRiderRideQueryClient implements RiderRideQueryClient {
  HttpRiderRideQueryClient({required this.baseUrl, http.Client? client})
    : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  @override
  Future<RiderRide?> getCurrentRide({required String accessToken}) async {
    final response = await _get('/rides/current', accessToken);
    if (response == null) {
      return null;
    }
    return RiderRide.fromJson(_map(response));
  }

  @override
  Future<RiderRide> getRide({
    required String accessToken,
    required String rideId,
  }) async {
    return RiderRide.fromJson(_map(await _get('/rides/$rideId', accessToken)));
  }

  @override
  Future<List<RiderRide>> getUpcomingRides({
    required String accessToken,
  }) async {
    final body = await _get('/rides/upcoming', accessToken);
    if (body is! List<dynamic>) {
      throw const RiderRideQueryException('Unexpected upcoming rides response');
    }
    return body
        .map((item) => RiderRide.fromJson(item as Map<String, dynamic>))
        .toList(growable: false);
  }

  @override
  Future<RiderRidePage> getRideHistory({
    required String accessToken,
    String? cursor,
    int limit = 20,
  }) async {
    final query = <String, String>{'limit': '$limit'};
    if (cursor != null) {
      query['cursor'] = cursor;
    }
    final uri = Uri.parse(
      '$baseUrl/rides/history',
    ).replace(queryParameters: query);
    final response = await _client.get(uri, headers: _headers(accessToken));
    return RiderRidePage.fromJson(_map(_decode(response)));
  }

  Future<dynamic> _get(String path, String accessToken) async {
    final response = await _client.get(
      Uri.parse('$baseUrl$path'),
      headers: _headers(accessToken),
    );
    return _decode(response);
  }

  Map<String, String> _headers(String accessToken) => {
    'Authorization': 'Bearer $accessToken',
  };

  dynamic _decode(http.Response response) {
    final body = response.body.isEmpty ? null : jsonDecode(response.body);
    if (response.statusCode >= 400) {
      final message = body is Map<String, dynamic>
          ? body['message']?.toString() ?? 'Unable to load rides'
          : 'Unable to load rides';
      throw RiderRideQueryException(message);
    }
    return body;
  }

  Map<String, dynamic> _map(dynamic body) {
    if (body is! Map<String, dynamic>) {
      throw const RiderRideQueryException('Unexpected ride response');
    }
    return body;
  }
}
