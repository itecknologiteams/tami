import 'dart:convert';

import 'package:http/http.dart' as http;

import 'booking/tami_place.dart';

class RiderPlaceProximity {
  const RiderPlaceProximity({
    required this.latitude,
    required this.longitude,
  });

  final double latitude;
  final double longitude;
}

abstract interface class RiderPlaceSearchClient {
  Future<List<TamiPlace>> search({
    required String accessToken,
    required String query,
    RiderPlaceProximity? proximity,
  });

  Future<TamiPlace> reverse({
    required String accessToken,
    required double latitude,
    required double longitude,
  });
}

class RiderPlaceSearchException implements Exception {
  const RiderPlaceSearchException(this.message);

  final String message;

  @override
  String toString() => message;
}

class HttpRiderPlaceSearchClient implements RiderPlaceSearchClient {
  HttpRiderPlaceSearchClient({required this.baseUrl, http.Client? client})
    : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  @override
  Future<List<TamiPlace>> search({
    required String accessToken,
    required String query,
    RiderPlaceProximity? proximity,
  }) async {
    final parameters = <String, String>{
      'query': query,
      if (proximity != null) ...{
        'proximityLatitude': proximity.latitude.toString(),
        'proximityLongitude': proximity.longitude.toString(),
      },
    };
    final body = await _get(
      path: '/places/search',
      accessToken: accessToken,
      queryParameters: parameters,
    );
    if (body is! List<dynamic>) {
      throw const RiderPlaceSearchException(
        'Unexpected place search response',
      );
    }
    try {
      return body
          .map((item) => _placeFromJson(item as Map<String, dynamic>))
          .toList(growable: false);
    } catch (_) {
      throw const RiderPlaceSearchException(
        'Unexpected place search response',
      );
    }
  }

  @override
  Future<TamiPlace> reverse({
    required String accessToken,
    required double latitude,
    required double longitude,
  }) async {
    final body = await _get(
      path: '/places/reverse',
      accessToken: accessToken,
      queryParameters: {
        'latitude': latitude.toString(),
        'longitude': longitude.toString(),
      },
    );
    if (body is! Map<String, dynamic>) {
      throw const RiderPlaceSearchException(
        'Unexpected reverse geocoding response',
      );
    }
    try {
      return _placeFromJson(body);
    } catch (_) {
      throw const RiderPlaceSearchException(
        'Unexpected reverse geocoding response',
      );
    }
  }

  Future<dynamic> _get({
    required String path,
    required String accessToken,
    required Map<String, String> queryParameters,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl$path').replace(
        queryParameters: queryParameters,
      );
      final response = await _client.get(
        uri,
        headers: {'Authorization': 'Bearer $accessToken'},
      );
      final body = response.body.isEmpty ? null : jsonDecode(response.body);
      if (response.statusCode >= 400) {
        final message = body is Map<String, dynamic>
            ? body['message']?.toString() ?? 'Unable to search places'
            : 'Unable to search places';
        throw RiderPlaceSearchException(message);
      }
      return body;
    } on RiderPlaceSearchException {
      rethrow;
    } catch (_) {
      throw const RiderPlaceSearchException(
        'Unable to search places. Try again.',
      );
    }
  }
}

TamiPlace _placeFromJson(Map<String, dynamic> json) {
  return TamiPlace(
    id: json['id'] as String,
    cityId: json['cityId'] as String,
    name: json['name'] as String,
    address: json['address'] as String,
    latitude: (json['latitude'] as num).toDouble(),
    longitude: (json['longitude'] as num).toDouble(),
  );
}
