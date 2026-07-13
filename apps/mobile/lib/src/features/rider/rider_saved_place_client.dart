import 'dart:convert';

import 'package:http/http.dart' as http;

enum RiderPlaceDesignation { home, work }

class RiderSavedPlace {
  const RiderSavedPlace({
    required this.id,
    required this.designation,
    required this.label,
    required this.address,
    required this.latitude,
    required this.longitude,
  });

  final String id;
  final RiderPlaceDesignation? designation;
  final String label;
  final String address;
  final double latitude;
  final double longitude;

  factory RiderSavedPlace.fromJson(Map<String, dynamic> json) {
    final designation = json['designation'] as String?;
    return RiderSavedPlace(
      id: json['id'] as String,
      designation: designation == null
          ? null
          : RiderPlaceDesignation.values.byName(designation),
      label: json['label'] as String,
      address: json['address'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
    );
  }
}

class SaveRiderPlaceRequest {
  const SaveRiderPlaceRequest({
    required this.designation,
    required this.label,
    required this.address,
    required this.latitude,
    required this.longitude,
  });

  final RiderPlaceDesignation? designation;
  final String label;
  final String address;
  final double latitude;
  final double longitude;

  Map<String, dynamic> toJson() => {
    'designation': designation?.name,
    'label': label,
    'address': address,
    'latitude': latitude,
    'longitude': longitude,
  };
}

abstract class RiderSavedPlaceClient {
  Future<List<RiderSavedPlace>> listPlaces({required String accessToken});

  Future<RiderSavedPlace> savePlace({
    required String accessToken,
    required SaveRiderPlaceRequest request,
    String? placeId,
  });

  Future<void> deletePlace({
    required String accessToken,
    required String placeId,
  });
}

class RiderSavedPlaceException implements Exception {
  const RiderSavedPlaceException(this.message);

  final String message;

  @override
  String toString() => message;
}

class HttpRiderSavedPlaceClient implements RiderSavedPlaceClient {
  HttpRiderSavedPlaceClient({required this.baseUrl, http.Client? client})
    : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  @override
  Future<List<RiderSavedPlace>> listPlaces({
    required String accessToken,
  }) async {
    final response = await _client.get(
      Uri.parse('$baseUrl/rider/places'),
      headers: _headers(accessToken),
    );
    final body = _decode(response);
    if (body is! List<dynamic>) {
      throw const RiderSavedPlaceException('Unexpected saved places response');
    }
    return body
        .map((item) => RiderSavedPlace.fromJson(item as Map<String, dynamic>))
        .toList(growable: false);
  }

  @override
  Future<RiderSavedPlace> savePlace({
    required String accessToken,
    required SaveRiderPlaceRequest request,
    String? placeId,
  }) async {
    final uri = Uri.parse(
      placeId == null
          ? '$baseUrl/rider/places'
          : '$baseUrl/rider/places/$placeId',
    );
    final response = placeId == null
        ? await _client.post(
            uri,
            headers: _headers(accessToken, json: true),
            body: jsonEncode(request.toJson()),
          )
        : await _client.put(
            uri,
            headers: _headers(accessToken, json: true),
            body: jsonEncode(request.toJson()),
          );
    return RiderSavedPlace.fromJson(_map(_decode(response)));
  }

  @override
  Future<void> deletePlace({
    required String accessToken,
    required String placeId,
  }) async {
    final response = await _client.delete(
      Uri.parse('$baseUrl/rider/places/$placeId'),
      headers: _headers(accessToken),
    );
    _decode(response);
  }

  Map<String, String> _headers(String token, {bool json = false}) => {
    'Authorization': 'Bearer $token',
    if (json) 'Content-Type': 'application/json',
  };

  dynamic _decode(http.Response response) {
    final body = response.body.isEmpty ? null : jsonDecode(response.body);
    if (response.statusCode >= 400) {
      final message = body is Map<String, dynamic>
          ? body['message']?.toString() ?? 'Unable to update saved places'
          : 'Unable to update saved places';
      throw RiderSavedPlaceException(message);
    }
    return body;
  }

  Map<String, dynamic> _map(dynamic body) {
    if (body is! Map<String, dynamic>) {
      throw const RiderSavedPlaceException('Unexpected saved place response');
    }
    return body;
  }
}
