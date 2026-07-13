import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tami_mobile/src/features/rider/rider_ride_query_client.dart';

void main() {
  test('loads the authenticated rider current ride', () async {
    final client = HttpRiderRideQueryClient(
      baseUrl: 'http://tami.test',
      client: MockClient((request) async {
        expect(request.url.path, '/rides/current');
        expect(request.headers['Authorization'], 'Bearer token');
        return http.Response('''
          {
            "id":"ride_1",
            "state":"accepted",
            "categoryCode":"standard_taxi",
            "pickup":{"latitude":24.86,"longitude":67.01,"address":"Pickup"},
            "destination":{"latitude":24.88,"longitude":67.05,"address":"Destination"},
            "scheduledPickupAt":null,
            "requestedAt":"2026-07-11T09:00:00.000Z",
            "estimatedFareMinor":51200,
            "currency":"PKR",
            "farePolicyVersion":1,
            "paymentMethod":"cash"
          }
        ''', 200);
      }),
    );

    final ride = await client.getCurrentRide(accessToken: 'token');

    expect(ride?.id, 'ride_1');
    expect(ride?.destination.address, 'Destination');
    expect(ride?.estimatedFareMinor, 51200);
    expect(ride?.currency, 'PKR');
    expect(ride?.farePolicyVersion, 1);
    expect(ride?.paymentMethod, 'cash');
  });

  test('loads upcoming rides and paginated history', () async {
    final paths = <String>[];
    final client = HttpRiderRideQueryClient(
      baseUrl: 'http://tami.test',
      client: MockClient((request) async {
        paths.add(request.url.toString());
        if (request.url.path == '/rides/upcoming') {
          return http.Response('''[
            {
              "id":"ride_upcoming",
              "state":"requested",
              "categoryCode":"scheduled_ride",
              "pickup":{"latitude":24.86,"longitude":67.01,"address":"Pickup"},
              "destination":{"latitude":24.88,"longitude":67.05,"address":"Airport"},
              "scheduledPickupAt":"2026-07-12T09:00:00.000Z",
              "requestedAt":"2026-07-11T09:00:00.000Z"
            }
          ]''', 200);
        }
        return http.Response('''
          {"items":[],"nextCursor":"ride_cursor"}
        ''', 200);
      }),
    );

    final upcoming = await client.getUpcomingRides(accessToken: 'token');
    final history = await client.getRideHistory(
      accessToken: 'token',
      cursor: 'ride_previous',
      limit: 10,
    );

    expect(upcoming.single.destination.address, 'Airport');
    expect(history.nextCursor, 'ride_cursor');
    expect(
      paths.last,
      'http://tami.test/rides/history?limit=10&cursor=ride_previous',
    );
  });
}
