import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/app/tami_mobile_app.dart';
import 'package:tami_mobile/src/features/driver/driver_ride.dart';
import 'package:tami_mobile/src/features/driver/driver_ride_client.dart';
import 'package:tami_mobile/src/realtime/realtime_client.dart';

import 'driver_home_screen_test.dart' show FakeDriverIdentityClient, FakeDriverChatClient;

void main() {
  testWidgets(
    'refreshes immediately when the socket announces an offer, ahead of the poll fallback',
    (tester) async {
      final rideClient = _DelayedOfferRideClient();
      final fakeSocket = FakeRealtimeClient();
      await tester.pumpWidget(
        TamiMobileApp(
          mode: TamiAppMode.driver,
          driverIdentityClient: FakeDriverIdentityClient(),
          driverRideClient: rideClient,
          driverChatClient: FakeDriverChatClient(),
          driverRealtimeClient: fakeSocket,
          // Poll fallback set far in the future so only the socket event
          // can plausibly deliver the offer within this test's timeframe.
          driverPollInterval: const Duration(minutes: 5),
        ),
      );

      await tester.enterText(
        find.byKey(const Key('driver-phone-input')),
        '+923009876543',
      );
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('driver-code-input')),
        '123456',
      );
      await tester.tap(find.text('Verify code'));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('driver-online-switch')));
      await tester.pump();

      // The driver has just gone online; no ride is available yet.
      expect(find.text('New ride offer'), findsNothing);
      rideClient.offerNowAvailable = true;

      fakeSocket.emit('ride.offer', {
        'rideId': 'ride_1',
        'driverId': 'driver_1',
      });
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('New ride offer'), findsOneWidget);
      expect(rideClient.getCurrentRideCallCount, greaterThanOrEqualTo(2));

      await tester.tap(find.byKey(const Key('driver-online-switch')));
      await tester.pump();
    },
  );
}

class FakeRealtimeClient implements RealtimeClient {
  final Map<String, StreamController<dynamic>> _controllers = {};
  bool connected = false;

  @override
  void connect() {
    connected = true;
  }

  @override
  Stream<T> on<T>(String event) {
    final controller = _controllers.putIfAbsent(
      event,
      () => StreamController<dynamic>.broadcast(),
    );
    return controller.stream.cast<T>();
  }

  void emit(String event, Map<String, dynamic> payload) {
    _controllers[event]?.add(payload);
  }

  @override
  bool get isConnected => connected;

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.close();
    }
    _controllers.clear();
  }
}

/// A ride client whose current ride only becomes available once
/// [offerNowAvailable] is flipped, simulating a ride being offered on the
/// backend sometime after the driver went online.
class _DelayedOfferRideClient implements DriverRideClient {
  bool offerNowAvailable = false;
  int getCurrentRideCallCount = 0;

  DriverRide _ride() {
    return const DriverRide(
      id: 'ride_1',
      state: 'offered_to_driver',
      riderPhone: '+923001234567',
      pickup: DriverRidePoint(
        latitude: 24.8475,
        longitude: 67.0331,
        address: 'Frere Hall, Karachi',
      ),
      destination: DriverRidePoint(
        latitude: 24.8138,
        longitude: 67.0307,
        address: 'Clifton Beach, Karachi',
      ),
      estimatedFareMinor: 35000,
      finalFareMinor: null,
      currency: 'PKR',
      requestedAt: '2026-07-13T11:00:00.000Z',
    );
  }

  @override
  Future<void> setAvailability({
    required String accessToken,
    required bool online,
    double? latitude,
    double? longitude,
  }) async {}

  @override
  Future<DriverRide?> getCurrentRide({required String accessToken}) async {
    getCurrentRideCallCount += 1;
    return offerNowAvailable ? _ride() : null;
  }

  @override
  Future<DriverRide> acceptRide({
    required String accessToken,
    required String rideId,
  }) async => _ride();

  @override
  Future<void> declineRide({
    required String accessToken,
    required String rideId,
  }) async {}

  @override
  Future<DriverRide> advanceRide({
    required String accessToken,
    required String rideId,
    required String to,
  }) async => _ride();

  @override
  Future<DriverRide> completeRide({
    required String accessToken,
    required String rideId,
  }) async => _ride();

  @override
  Future<DriverRide> cancelRide({
    required String accessToken,
    required String rideId,
  }) async => _ride();

  @override
  Future<void> pingLocation({
    required String accessToken,
    required double latitude,
    required double longitude,
  }) async {}

  @override
  Future<DriverRoute> getRideRoute({
    required String accessToken,
    required String rideId,
  }) async {
    return const DriverRoute(
      distanceMeters: 5200,
      durationSeconds: 840,
      coordinates: [
        DriverRouteCoordinate(latitude: 24.8475, longitude: 67.0331),
        DriverRouteCoordinate(latitude: 24.8138, longitude: 67.0307),
      ],
    );
  }

  @override
  Future<List<DriverRide>> getRideHistory({required String accessToken}) async {
    return const [];
  }

  @override
  Future<DriverEarnings> getEarnings({required String accessToken}) async {
    return const DriverEarnings(
      currency: 'PKR',
      today: DriverEarningsWindow(rides: 0, totalMinor: 0),
      week: DriverEarningsWindow(rides: 0, totalMinor: 0),
    );
  }
}
