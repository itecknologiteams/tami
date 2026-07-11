import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/auth/rider_session.dart';
import 'package:tami_mobile/src/features/rider/rider_shell.dart';
import 'package:tami_mobile/src/features/rider/rider_ride_query_client.dart';

void main() {
  testWidgets('switches between booking, trips, and account', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: RiderShell(
          session: const RiderSession(
            accessToken: 'rider-session-token',
            rider: RiderProfile(
              id: 'rider_123',
              phone: '+923001234567',
              cityId: 'city_karachi',
              name: 'Aamir Khan',
              email: 'aamir@example.com',
              imageUrl: null,
            ),
          ),
          rideQueryClient: _TripsClient(),
        ),
      ),
    );

    expect(find.text('Where to?'), findsOneWidget);
    expect(find.byKey(const Key('rider-navigation-glass')), findsOneWidget);
    await tester.tap(find.text('Trips'));
    await tester.pumpAndSettle();
    expect(find.text('Your trips'), findsOneWidget);
    expect(find.text('Jinnah International Airport'), findsOneWidget);
    await tester.tap(find.text('Jinnah International Airport'));
    await tester.pumpAndSettle();
    expect(find.text('Trip details'), findsOneWidget);
    expect(find.text('Pickup'), findsWidgets);
    await tester.pageBack();
    await tester.pumpAndSettle();

    await tester.tap(find.text('Account'));
    await tester.pumpAndSettle();
    expect(find.text('Aamir Khan'), findsOneWidget);
    expect(find.text('Saved places'), findsOneWidget);
  });
}

class _TripsClient implements RiderRideQueryClient {
  static const upcomingRide = RiderRide(
    id: 'ride_upcoming',
    state: 'requested',
    categoryCode: 'scheduled_ride',
    pickup: RiderRideLocation(
      latitude: 24.86,
      longitude: 67.01,
      address: 'Pickup',
    ),
    destination: RiderRideLocation(
      latitude: 24.90,
      longitude: 67.17,
      address: 'Jinnah International Airport',
    ),
    scheduledPickupAt: '2026-07-12T09:00:00.000Z',
    requestedAt: '2026-07-11T09:00:00.000Z',
  );

  @override
  Future<RiderRide?> getCurrentRide({required String accessToken}) async =>
      null;

  @override
  Future<RiderRide> getRide({
    required String accessToken,
    required String rideId,
  }) async => upcomingRide;

  @override
  Future<RiderRidePage> getRideHistory({
    required String accessToken,
    String? cursor,
    int limit = 20,
  }) async => const RiderRidePage(items: [], nextCursor: null);

  @override
  Future<List<RiderRide>> getUpcomingRides({
    required String accessToken,
  }) async => const [upcomingRide];
}
