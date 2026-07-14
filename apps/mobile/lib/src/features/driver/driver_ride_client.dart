import 'dart:convert';

import 'package:http/http.dart' as http;

import 'driver_ride.dart';

abstract class DriverRideClient {
  Future<void> setAvailability({
    required String accessToken,
    required bool online,
    double? latitude,
    double? longitude,
  });
  Future<DriverRide?> getCurrentRide({required String accessToken});
  Future<DriverRide> acceptRide({
    required String accessToken,
    required String rideId,
  });
  Future<void> declineRide({
    required String accessToken,
    required String rideId,
  });
  Future<DriverRide> advanceRide({
    required String accessToken,
    required String rideId,
    required String to,
  });
  Future<DriverRide> completeRide({
    required String accessToken,
    required String rideId,
  });
  Future<DriverRide> cancelRide({
    required String accessToken,
    required String rideId,
  });
  Future<void> pingLocation({
    required String accessToken,
    required double latitude,
    required double longitude,
  });
  Future<DriverRoute> getRideRoute({
    required String accessToken,
    required String rideId,
  });
  Future<List<DriverRide>> getRideHistory({required String accessToken});
  Future<DriverEarnings> getEarnings({required String accessToken});
}

class DriverRideException implements Exception {
  const DriverRideException(this.message);

  final String message;

  @override
  String toString() => message;
}

class HttpDriverRideClient implements DriverRideClient {
  HttpDriverRideClient({required this.baseUrl, http.Client? client})
    : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  @override
  Future<void> setAvailability({
    required String accessToken,
    required bool online,
    double? latitude,
    double? longitude,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/driver/availability'),
      headers: _headers(accessToken),
      body: jsonEncode({
        'online': online,
        'latitude': ?latitude,
        'longitude': ?longitude,
      }),
    );
    _decode(response);
  }

  @override
  Future<DriverRide?> getCurrentRide({required String accessToken}) async {
    final response = await _client.get(
      Uri.parse('$baseUrl/driver/rides/current'),
      headers: _headers(accessToken),
    );
    final body = _decode(response) as Map<String, dynamic>;
    final ride = body['ride'];
    if (ride == null) {
      return null;
    }
    return DriverRide.fromJson(ride as Map<String, dynamic>);
  }

  @override
  Future<DriverRide> acceptRide({
    required String accessToken,
    required String rideId,
  }) {
    return _postRide(accessToken, rideId, 'accept');
  }

  @override
  Future<void> declineRide({
    required String accessToken,
    required String rideId,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/driver/rides/$rideId/decline'),
      headers: _headers(accessToken),
    );
    _decode(response);
  }

  @override
  Future<DriverRide> advanceRide({
    required String accessToken,
    required String rideId,
    required String to,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/driver/rides/$rideId/advance'),
      headers: _headers(accessToken),
      body: jsonEncode({'to': to}),
    );
    return DriverRide.fromJson(_decode(response) as Map<String, dynamic>);
  }

  @override
  Future<DriverRide> completeRide({
    required String accessToken,
    required String rideId,
  }) {
    return _postRide(accessToken, rideId, 'complete');
  }

  @override
  Future<DriverRide> cancelRide({
    required String accessToken,
    required String rideId,
  }) {
    return _postRide(accessToken, rideId, 'cancel');
  }

  @override
  Future<void> pingLocation({
    required String accessToken,
    required double latitude,
    required double longitude,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/driver/location'),
      headers: _headers(accessToken),
      body: jsonEncode({'latitude': latitude, 'longitude': longitude}),
    );
    _decode(response);
  }

  @override
  Future<DriverRoute> getRideRoute({
    required String accessToken,
    required String rideId,
  }) async {
    final response = await _client.get(
      Uri.parse('$baseUrl/driver/rides/$rideId/route'),
      headers: _headers(accessToken),
    );
    return DriverRoute.fromJson(_decode(response) as Map<String, dynamic>);
  }

  @override
  Future<List<DriverRide>> getRideHistory({
    required String accessToken,
  }) async {
    final response = await _client.get(
      Uri.parse('$baseUrl/driver/rides/history'),
      headers: _headers(accessToken),
    );
    return (_decode(response) as List<dynamic>)
        .cast<Map<String, dynamic>>()
        .map(DriverRide.fromJson)
        .toList();
  }

  @override
  Future<DriverEarnings> getEarnings({required String accessToken}) async {
    final response = await _client.get(
      Uri.parse('$baseUrl/driver/earnings'),
      headers: _headers(accessToken),
    );
    return DriverEarnings.fromJson(_decode(response) as Map<String, dynamic>);
  }

  Future<DriverRide> _postRide(
    String accessToken,
    String rideId,
    String action,
  ) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/driver/rides/$rideId/$action'),
      headers: _headers(accessToken),
    );
    return DriverRide.fromJson(_decode(response) as Map<String, dynamic>);
  }

  Map<String, String> _headers(String accessToken) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken',
    };
  }

  dynamic _decode(http.Response response) {
    final body = response.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body);
    if (response.statusCode >= 400) {
      final message = body is Map<String, dynamic>
          ? body['message']?.toString() ?? 'Request failed'
          : 'Request failed';
      throw DriverRideException(message);
    }

    return body;
  }
}
