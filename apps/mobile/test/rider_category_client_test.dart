import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tami_mobile/src/features/rider/rider_category_client.dart';

void main() {
  test('loads the authenticated city ride category catalog', () async {
    late http.Request captured;
    final client = HttpRiderCategoryClient(
      baseUrl: 'https://api.tami.test',
      client: MockClient((request) async {
        captured = request;
        return http.Response(
          jsonEncode({
            'categories': [
              {
                'code': 'standard_taxi',
                'name': 'Standard Taxi',
                'description': 'General Tami taxi rides.',
              },
            ],
            'scheduledRidesEnabled': false,
          }),
          200,
        );
      }),
    );

    final catalog = await client.getCatalog(accessToken: 'rider-token');

    expect(captured.url.path, '/pricing/categories');
    expect(captured.headers['authorization'], 'Bearer rider-token');
    expect(catalog.categories.single.code, 'standard_taxi');
    expect(catalog.scheduledRidesEnabled, isFalse);
  });
}
