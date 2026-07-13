import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tami_mobile/src/features/rider/rider_place_search_client.dart';

void main() {
  test('searches places with bearer auth and pickup proximity', () async {
    final client = HttpRiderPlaceSearchClient(
      baseUrl: 'http://tami.test',
      client: MockClient((request) async {
        expect(request.url.path, '/places/search');
        expect(request.url.queryParameters['query'], 'Civic Centre');
        expect(request.url.queryParameters['proximityLatitude'], '24.8607');
        expect(request.url.queryParameters['proximityLongitude'], '67.0011');
        expect(request.headers['Authorization'], 'Bearer rider-token');
        return http.Response('''[
          {
            "id":"poi.123",
            "name":"Civic Centre",
            "address":"Civic Centre, Karachi, Sindh",
            "latitude":24.9176,
            "longitude":67.0719,
            "cityId":"city_karachi"
          }
        ]''', 200);
      }),
    );

    final results = await client.search(
      accessToken: 'rider-token',
      query: 'Civic Centre',
      proximity: const RiderPlaceProximity(
        latitude: 24.8607,
        longitude: 67.0011,
      ),
    );

    expect(results.single.id, 'poi.123');
    expect(results.single.cityId, 'city_karachi');
    expect(results.single.name, 'Civic Centre');
  });

  test('reverse geocodes a rider coordinate', () async {
    final client = HttpRiderPlaceSearchClient(
      baseUrl: 'http://tami.test',
      client: MockClient((request) async {
        expect(request.url.path, '/places/reverse');
        expect(request.url.queryParameters, {
          'latitude': '25.3791',
          'longitude': '68.3728',
        });
        return http.Response('''
          {
            "id":"hyderabad-station",
            "name":"Hyderabad Railway Station",
            "address":"Station Road, Hyderabad",
            "latitude":25.3791,
            "longitude":68.3728,
            "cityId":"city_hyderabad"
          }
        ''', 200);
      }),
    );

    final result = await client.reverse(
      accessToken: 'rider-token',
      latitude: 25.3791,
      longitude: 68.3728,
    );

    expect(result.address, 'Station Road, Hyderabad');
  });

  test('wraps API, transport, and malformed responses as stable errors', () async {
    final apiClient = HttpRiderPlaceSearchClient(
      baseUrl: 'http://tami.test',
      client: MockClient(
        (_) async => http.Response('{"message":"Search quota exceeded"}', 503),
      ),
    );
    final transportClient = HttpRiderPlaceSearchClient(
      baseUrl: 'http://tami.test',
      client: MockClient((_) async => throw Exception('offline')),
    );
    final malformedClient = HttpRiderPlaceSearchClient(
      baseUrl: 'http://tami.test',
      client: MockClient((_) async => http.Response('{not-json', 200)),
    );

    await expectLater(
      apiClient.search(accessToken: 'token', query: 'Airport'),
      throwsA(
        isA<RiderPlaceSearchException>().having(
          (error) => error.message,
          'message',
          'Search quota exceeded',
        ),
      ),
    );
    await expectLater(
      transportClient.search(accessToken: 'token', query: 'Airport'),
      throwsA(isA<RiderPlaceSearchException>()),
    );
    await expectLater(
      malformedClient.search(accessToken: 'token', query: 'Airport'),
      throwsA(isA<RiderPlaceSearchException>()),
    );
  });
}
