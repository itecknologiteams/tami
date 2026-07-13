import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tami_mobile/src/features/rider/rider_booking_client.dart';

void main() {
  test('sends the stable idempotency key with a ride request', () async {
    late http.Request captured;
    final client = HttpRiderBookingClient(
      baseUrl: 'https://api.tami.test',
      client: MockClient((request) async {
        captured = request;
        return http.Response(
          jsonEncode({
            'id': 'ride_1',
            'state': 'requested',
            'categoryCode': 'standard_taxi',
            'scheduledPickupAt': null,
          }),
          201,
        );
      }),
    );

    await client.createRide(
      accessToken: 'token',
      idempotencyKey: 'request_1234567890abcdef',
      request: const CreateRiderRideRequest(
        categoryCode: 'standard_taxi',
        pickup: RiderCoordinates(
          latitude: 24.8607,
          longitude: 67.0011,
          address: 'Frere Hall, Karachi',
        ),
        destination: RiderCoordinates(
          latitude: 24.8425,
          longitude: 67.05,
          address: 'Mazar-e-Quaid, Karachi',
        ),
        paymentMethod: RiderPaymentMethod.cash,
      ),
    );

    expect(captured.headers['idempotency-key'], 'request_1234567890abcdef');
  });
}
