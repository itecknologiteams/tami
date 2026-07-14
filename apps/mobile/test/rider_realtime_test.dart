import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/features/rider/rider_booking_client.dart';
import 'package:tami_mobile/src/features/rider/rider_home_screen.dart';
import 'package:tami_mobile/src/realtime/realtime_client.dart';

void main() {
  testWidgets('updates the active ride live when the socket reports a state change', (
    tester,
  ) async {
    final fakeSocket = FakeRealtimeClient();
    await tester.pumpWidget(
      MaterialApp(
        home: RiderHomeScreen(
          realtimeClient: fakeSocket,
          initialRide: const RiderBookingRide(
            id: 'ride_live',
            state: 'accepted',
            categoryCode: 'standard_taxi',
            scheduledPickupAt: null,
          ),
          initialDestination: const TamiPlace(
            name: 'Mazar-e-Quaid',
            address: 'Mazar-e-Quaid, Karachi',
            latitude: 24.8753,
            longitude: 67.0407,
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Driver accepted your ride'), findsOneWidget);

    fakeSocket.emit('ride.state_changed', {
      'rideId': 'ride_live',
      'state': 'in_progress',
    });
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Ride in progress'), findsOneWidget);
  });

  testWidgets('clears the active ride when the socket reports a terminal state', (
    tester,
  ) async {
    final fakeSocket = FakeRealtimeClient();
    await tester.pumpWidget(
      MaterialApp(
        home: RiderHomeScreen(
          realtimeClient: fakeSocket,
          initialRide: const RiderBookingRide(
            id: 'ride_live',
            state: 'in_progress',
            categoryCode: 'standard_taxi',
            scheduledPickupAt: null,
          ),
          initialDestination: const TamiPlace(
            name: 'Mazar-e-Quaid',
            address: 'Mazar-e-Quaid, Karachi',
            latitude: 24.8753,
            longitude: 67.0407,
          ),
        ),
      ),
    );
    await tester.pump();

    fakeSocket.emit('ride.state_changed', {
      'rideId': 'ride_live',
      'state': 'completed',
    });
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Where to?'), findsOneWidget);
  });

  testWidgets('ignores state changes for a different ride id', (tester) async {
    final fakeSocket = FakeRealtimeClient();
    await tester.pumpWidget(
      MaterialApp(
        home: RiderHomeScreen(
          realtimeClient: fakeSocket,
          initialRide: const RiderBookingRide(
            id: 'ride_live',
            state: 'accepted',
            categoryCode: 'standard_taxi',
            scheduledPickupAt: null,
          ),
          initialDestination: const TamiPlace(
            name: 'Mazar-e-Quaid',
            address: 'Mazar-e-Quaid, Karachi',
            latitude: 24.8753,
            longitude: 67.0407,
          ),
        ),
      ),
    );
    await tester.pump();

    fakeSocket.emit('ride.state_changed', {
      'rideId': 'some_other_ride',
      'state': 'completed',
    });
    await tester.pump();

    expect(find.text('Driver accepted your ride'), findsOneWidget);
  });
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
