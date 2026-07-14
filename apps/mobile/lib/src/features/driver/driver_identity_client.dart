import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../auth/rider_session.dart' show DevelopmentOtpChallenge, RiderCity;
import 'driver_session.dart';

abstract class DriverIdentityClient {
  Future<List<RiderCity>> getActiveCities();
  Future<DevelopmentOtpChallenge> requestOtp(String phone);
  Future<DriverSession> verifyOtp({
    required String challengeId,
    required String code,
    required String cityId,
  });
}

class DriverIdentityException implements Exception {
  const DriverIdentityException(this.message);

  final String message;

  @override
  String toString() => message;
}

class HttpDriverIdentityClient implements DriverIdentityClient {
  HttpDriverIdentityClient({required this.baseUrl, http.Client? client})
    : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  @override
  Future<List<RiderCity>> getActiveCities() async {
    final response = await _client.get(Uri.parse('$baseUrl/auth/rider/cities'));
    final body = _decode(response);
    return (body as List<dynamic>)
        .cast<Map<String, dynamic>>()
        .map(RiderCity.fromJson)
        .toList();
  }

  @override
  Future<DevelopmentOtpChallenge> requestOtp(String phone) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/auth/driver/otp'),
      headers: _jsonHeaders,
      body: jsonEncode({'phone': phone}),
    );
    return DevelopmentOtpChallenge.fromJson(
      _decode(response) as Map<String, dynamic>,
    );
  }

  @override
  Future<DriverSession> verifyOtp({
    required String challengeId,
    required String code,
    required String cityId,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/auth/driver/verify'),
      headers: _jsonHeaders,
      body: jsonEncode({
        'challengeId': challengeId,
        'code': code,
        'cityId': cityId,
      }),
    );
    return DriverSession.fromJson(_decode(response) as Map<String, dynamic>);
  }

  static const _jsonHeaders = {'Content-Type': 'application/json'};

  dynamic _decode(http.Response response) {
    final body = response.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body);
    if (response.statusCode >= 400) {
      final message = body is Map<String, dynamic>
          ? body['message']?.toString() ?? 'Request failed'
          : 'Request failed';
      throw DriverIdentityException(message);
    }

    return body;
  }
}
