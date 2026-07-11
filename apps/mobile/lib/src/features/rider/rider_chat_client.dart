import 'dart:convert';

import 'package:http/http.dart' as http;

class RiderChatMessage {
  const RiderChatMessage({
    required this.id,
    required this.senderType,
    required this.body,
    required this.sentAt,
  });

  final String id;
  final String senderType;
  final String body;
  final DateTime sentAt;

  factory RiderChatMessage.fromJson(Map<String, dynamic> json) {
    return RiderChatMessage(
      id: json['id'] as String,
      senderType: json['senderType'] as String,
      body: json['body'] as String,
      sentAt: DateTime.parse(json['sentAt'] as String),
    );
  }
}

abstract class RiderChatClient {
  Future<List<RiderChatMessage>> listMessages({
    required String accessToken,
    required String rideId,
  });

  Future<RiderChatMessage> sendMessage({
    required String accessToken,
    required String rideId,
    required String message,
  });
}

class RiderChatException implements Exception {
  const RiderChatException(this.message);

  final String message;

  @override
  String toString() => message;
}

class HttpRiderChatClient implements RiderChatClient {
  HttpRiderChatClient({required this.baseUrl, http.Client? client})
    : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  @override
  Future<List<RiderChatMessage>> listMessages({
    required String accessToken,
    required String rideId,
  }) async {
    final response = await _client.get(
      Uri.parse('$baseUrl/bookings/rides/$rideId/chat'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    final body = _decode(response);
    if (body is! List<dynamic>) {
      throw const RiderChatException('Unexpected chat response');
    }
    return body
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
      Uri.parse('$baseUrl/bookings/rides/$rideId/chat'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode({'message': message}),
    );
    final body = _decode(response);
    if (body is! Map<String, dynamic>) {
      throw const RiderChatException('Unexpected chat response');
    }
    return RiderChatMessage.fromJson(body);
  }

  dynamic _decode(http.Response response) {
    final body = response.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body);
    if (response.statusCode >= 400) {
      final message = body is Map<String, dynamic>
          ? body['message']?.toString() ?? 'Unable to load chat'
          : 'Unable to load chat';
      throw RiderChatException(message);
    }
    return body;
  }
}
