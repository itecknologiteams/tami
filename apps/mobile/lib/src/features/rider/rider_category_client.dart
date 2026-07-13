import 'dart:convert';

import 'package:http/http.dart' as http;

class RiderAvailableCategory {
  const RiderAvailableCategory({
    required this.code,
    required this.name,
    required this.description,
  });

  final String code;
  final String name;
  final String description;

  factory RiderAvailableCategory.fromJson(Map<String, dynamic> json) {
    return RiderAvailableCategory(
      code: json['code'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
    );
  }
}

class RiderCategoryCatalog {
  const RiderCategoryCatalog({
    required this.categories,
    required this.scheduledRidesEnabled,
  });

  final List<RiderAvailableCategory> categories;
  final bool scheduledRidesEnabled;

  factory RiderCategoryCatalog.fromJson(Map<String, dynamic> json) {
    final categories = json['categories'];
    if (categories is! List<dynamic>) {
      throw const RiderCategoryException('Unexpected ride category response');
    }
    return RiderCategoryCatalog(
      categories: categories
          .map(
            (category) => RiderAvailableCategory.fromJson(
              category as Map<String, dynamic>,
            ),
          )
          .toList(growable: false),
      scheduledRidesEnabled: json['scheduledRidesEnabled'] as bool? ?? false,
    );
  }
}

abstract class RiderCategoryClient {
  Future<RiderCategoryCatalog> getCatalog({required String accessToken});
}

class RiderCategoryException implements Exception {
  const RiderCategoryException(this.message);

  final String message;

  @override
  String toString() => message;
}

class HttpRiderCategoryClient implements RiderCategoryClient {
  HttpRiderCategoryClient({required this.baseUrl, http.Client? client})
    : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  @override
  Future<RiderCategoryCatalog> getCatalog({required String accessToken}) async {
    final response = await _client.get(
      Uri.parse('$baseUrl/pricing/categories'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    final body = response.body.isEmpty ? null : jsonDecode(response.body);
    if (response.statusCode >= 400) {
      final message = body is Map<String, dynamic>
          ? body['message']?.toString() ?? 'Unable to load ride categories'
          : 'Unable to load ride categories';
      throw RiderCategoryException(message);
    }
    if (body is! Map<String, dynamic>) {
      throw const RiderCategoryException('Unexpected ride category response');
    }
    try {
      return RiderCategoryCatalog.fromJson(body);
    } on RiderCategoryException {
      rethrow;
    } catch (_) {
      throw const RiderCategoryException('Unexpected ride category response');
    }
  }
}
