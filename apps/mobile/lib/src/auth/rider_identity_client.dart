import 'dart:convert';

import 'package:http/http.dart' as http;

import 'rider_session.dart';

abstract class RiderIdentityClient {
  Future<List<RiderCity>> getActiveCities();
  Future<DevelopmentOtpChallenge> requestOtp(String phone);
  Future<RiderSession> verifyOtp({
    required String challengeId,
    required String code,
    required String cityId,
  });
  Future<RiderProfile> updateProfile({
    required String accessToken,
    required String cityId,
    required String name,
    String? email,
    String? imageUrl,
  });
}

class RiderIdentityException implements Exception {
  const RiderIdentityException(this.message);

  final String message;

  @override
  String toString() => message;
}

class HttpRiderIdentityClient implements RiderIdentityClient {
  HttpRiderIdentityClient({required this.baseUrl, http.Client? client})
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
      Uri.parse('$baseUrl/auth/rider/otp'),
      headers: _jsonHeaders,
      body: jsonEncode({'phone': phone}),
    );
    return DevelopmentOtpChallenge.fromJson(
      _decode(response) as Map<String, dynamic>,
    );
  }

  @override
  Future<RiderSession> verifyOtp({
    required String challengeId,
    required String code,
    required String cityId,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/auth/rider/verify'),
      headers: _jsonHeaders,
      body: jsonEncode({
        'challengeId': challengeId,
        'code': code,
        'cityId': cityId,
      }),
    );
    return RiderSession.fromJson(_decode(response) as Map<String, dynamic>);
  }

  @override
  Future<RiderProfile> updateProfile({
    required String accessToken,
    required String cityId,
    required String name,
    String? email,
    String? imageUrl,
  }) async {
    final response = await _client.put(
      Uri.parse('$baseUrl/rider/me'),
      headers: {
        ..._jsonHeaders,
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode({
        'cityId': cityId,
        'name': name,
        'email': email,
        'imageUrl': imageUrl,
      }),
    );
    return RiderProfile.fromJson(_decode(response) as Map<String, dynamic>);
  }

  static const _jsonHeaders = {'Content-Type': 'application/json'};

  dynamic _decode(http.Response response) {
    final body = response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
    if (response.statusCode >= 400) {
      final message = body is Map<String, dynamic>
          ? body['message']?.toString() ?? 'Request failed'
          : 'Request failed';
      throw RiderIdentityException(message);
    }

    return body;
  }
}
