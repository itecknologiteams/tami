import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tami_mobile/src/features/rider/rider_saved_place_client.dart';

void main() {
  test('lists authenticated rider saved places', () async {
    final client = HttpRiderSavedPlaceClient(
      baseUrl: 'http://tami.test',
      client: MockClient((request) async {
        expect(request.url.path, '/rider/places');
        expect(request.headers['Authorization'], 'Bearer token');
        return http.Response('''[
          {
            "id":"place_1",
            "designation":"home",
            "label":"Home",
            "address":"PECHS, Karachi",
            "latitude":24.86,
            "longitude":67.06
          }
        ]''', 200);
      }),
    );

    final places = await client.listPlaces(accessToken: 'token');

    expect(places.single.designation, RiderPlaceDesignation.home);
    expect(places.single.address, 'PECHS, Karachi');
  });

  test('creates a place without accepting rider ownership fields', () async {
    final client = HttpRiderSavedPlaceClient(
      baseUrl: 'http://tami.test',
      client: MockClient((request) async {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(request.method, 'POST');
        expect(body, {
          'designation': 'work',
          'label': 'Secretariat',
          'address': 'Sindh Secretariat, Karachi',
          'latitude': 24.86,
          'longitude': 67.01,
        });
        expect(body.containsKey('riderId'), isFalse);
        expect(body.containsKey('cityId'), isFalse);
        return http.Response('''
          {
            "id":"place_2",
            "designation":"work",
            "label":"Secretariat",
            "address":"Sindh Secretariat, Karachi",
            "latitude":24.86,
            "longitude":67.01
          }
        ''', 201);
      }),
    );

    final place = await client.savePlace(
      accessToken: 'token',
      request: const SaveRiderPlaceRequest(
        designation: RiderPlaceDesignation.work,
        label: 'Secretariat',
        address: 'Sindh Secretariat, Karachi',
        latitude: 24.86,
        longitude: 67.01,
      ),
    );

    expect(place.id, 'place_2');
  });
}
