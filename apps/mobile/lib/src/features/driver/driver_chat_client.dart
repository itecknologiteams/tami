import 'dart:convert';

import 'package:http/http.dart' as http;

import '../rider/rider_chat_client.dart';

/// Driver-side chat transport that reuses the shared chat client interface so
/// the ride chat sheet works for both roles.
class HttpDriverChatClient implements RiderChatClient {
  HttpDriverChatClient({required this.baseUrl, http.Client? client})
    : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  @override
  Future<List<RiderChatMessage>> listMessages({
    required String accessToken,
    required String rideId,
  }) async {
    final response = await _client.get(
      Uri.parse('$baseUrl/driver/rides/$rideId/chat'),
      headers: _headers(accessToken),
    );
    final body = _decode(response);
    return (body as List<dynamic>)
        .cast<Map<String, dynamic>>()
        .map(RiderChatMessage.fromJson)
        .toList();
  }

  @override
  Future<RiderChatMessage> sendMessage({
    required String accessToken,
    required String rideId,
    required String message,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/driver/rides/$rideId/chat'),
      headers: _headers(accessToken),
      body: jsonEncode({'body': message}),
    );
    return RiderChatMessage.fromJson(_decode(response) as Map<String, dynamic>);
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
      throw RiderChatException(message);
    }

    return body;
  }
}
