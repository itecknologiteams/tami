import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tami_mobile/src/features/rider/rider_booking_client.dart';
import 'package:tami_mobile/src/features/rider/rider_pricing_client.dart';

void main() {
  test('requests and parses an authoritative fare estimate', () async {
    final client = HttpRiderPricingClient(
      baseUrl: 'http://tami.test',
      client: MockClient((request) async {
        expect(request.url.path, '/pricing/estimate');
        expect(request.headers['Authorization'], 'Bearer token');
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['categoryCode'], 'standard_taxi');
        expect(body.containsKey('fareMinor'), isFalse);
        return http.Response('''
          {
            "fareMinor":51200,
            "currency":"PKR",
            "policyId":"policy_1",
            "policyVersion":1,
            "distanceMeters":6200,
            "durationSeconds":930,
            "routeMethod":"great_circle_road_factor_v1",
            "multiplier":1.0,
            "capApplied":false,
            "breakdown":{
              "baseFareMinor":20000,
              "distanceFareMinor":21700,
              "timeFareMinor":7750,
              "bookingFeeMinor":2000,
              "subtotalMinor":51450
            },
            "explanationLines":["Policy version 1"]
          }
        ''', 200);
      }),
    );

    final estimate = await client.estimateFare(
      accessToken: 'token',
      request: const RiderFareEstimateRequest(
        categoryCode: 'standard_taxi',
        pickup: RiderCoordinates(
          latitude: 24.86,
          longitude: 67.01,
          address: 'Pickup',
        ),
        destination: RiderCoordinates(
          latitude: 24.88,
          longitude: 67.05,
          address: 'Destination',
        ),
      ),
    );

    expect(estimate.fareMinor, 51200);
    expect(estimate.policyVersion, 1);
    expect(estimate.distanceMeters, 6200);
  });

  test(
    'wraps transport and malformed successful responses as retryable errors',
    () async {
      final transportClient = HttpRiderPricingClient(
        baseUrl: 'http://tami.test',
        client: MockClient((_) async => throw Exception('offline')),
      );
      final malformedClient = HttpRiderPricingClient(
        baseUrl: 'http://tami.test',
        client: MockClient((_) async => http.Response('{not json', 200)),
      );
      const request = RiderFareEstimateRequest(
        categoryCode: 'standard_taxi',
        pickup: RiderCoordinates(
          latitude: 24.86,
          longitude: 67.01,
          address: 'Pickup',
        ),
        destination: RiderCoordinates(
          latitude: 24.88,
          longitude: 67.05,
          address: 'Destination',
        ),
      );

      await expectLater(
        transportClient.estimateFare(accessToken: 'token', request: request),
        throwsA(isA<RiderPricingException>()),
      );
      await expectLater(
        malformedClient.estimateFare(accessToken: 'token', request: request),
        throwsA(isA<RiderPricingException>()),
      );
    },
  );
}
