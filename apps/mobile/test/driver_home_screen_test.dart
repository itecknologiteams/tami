import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/app/tami_mobile_app.dart';
import 'package:tami_mobile/src/auth/rider_session.dart'
    show DevelopmentOtpChallenge, RiderCity;
import 'package:tami_mobile/src/features/driver/driver_identity_client.dart';
import 'package:tami_mobile/src/features/driver/driver_ride.dart';
import 'package:tami_mobile/src/features/driver/driver_ride_client.dart';
import 'package:tami_mobile/src/features/driver/driver_session.dart';
import 'package:tami_mobile/src/features/rider/rider_chat_client.dart';
import 'package:tami_mobile/src/location/rider_location.dart';
import 'package:tami_mobile/src/location/rider_location_client.dart';

Future<void> signInDriver(
  WidgetTester tester, {
  required FakeDriverRideClient rideClient,
  RiderChatClient? chatClient,
  Duration pollInterval = const Duration(minutes: 1),
}) async {
  await tester.pumpWidget(
    TamiMobileApp(
      mode: TamiAppMode.driver,
      driverIdentityClient: FakeDriverIdentityClient(),
      driverRideClient: rideClient,
      driverChatClient: chatClient ?? FakeDriverChatClient(),
      riderLocationClient: _DeniedLocationClient(),
      driverPollInterval: pollInterval,
    ),
  );

  await tester.enterText(
    find.byKey(const Key('driver-phone-input')),
    '+923009876543',
  );
  await tester.tap(find.text('Send code'));
  await tester.pumpAndSettle();
  await tester.enterText(find.byKey(const Key('driver-code-input')), '123456');
  await tester.tap(find.text('Verify code'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('takes a driver from login through a completed ride', (
    tester,
  ) async {
    final rideClient = FakeDriverRideClient();
    await signInDriver(tester, rideClient: rideClient);

    expect(find.text('Tami Driver'), findsOneWidget);
    expect(find.text('Go online to receive ride offers.'), findsOneWidget);

    await tester.tap(find.byKey(const Key('driver-online-switch')));
    await tester.pump();
    await tester.pump();

    expect(find.text('New ride offer'), findsOneWidget);
    expect(find.text('Frere Hall, Karachi'), findsOneWidget);

    await tester.tap(find.byKey(const Key('driver-accept-button')));
    await tester.pump();

    expect(find.text('Ride accepted'), findsOneWidget);
    // Route summary fetched from the route endpoint.
    expect(find.textContaining('km ·'), findsOneWidget);

    for (var step = 0; step < 5; step += 1) {
      await tester.tap(find.byKey(const Key('driver-primary-action')));
      await tester.pump();
    }
    expect(find.text('Collect fare & complete'), findsOneWidget);

    await tester.tap(find.byKey(const Key('driver-primary-action')));
    await tester.pump();

    expect(find.text('Ride completed'), findsOneWidget);
    expect(find.text('Collect PKR 350'), findsOneWidget);

    await tester.tap(find.byKey(const Key('driver-next-ride-button')));
    await tester.pump();

    expect(find.text('Waiting for the next ride request…'), findsOneWidget);

    await tester.tap(find.byKey(const Key('driver-online-switch')));
    await tester.pump();
    expect(rideClient.online, isFalse);
  });

  testWidgets('lets a driver decline an offer and keep waiting', (
    tester,
  ) async {
    final rideClient = FakeDriverRideClient();
    await signInDriver(tester, rideClient: rideClient);

    await tester.tap(find.byKey(const Key('driver-online-switch')));
    await tester.pump();
    await tester.pump();

    expect(find.text('New ride offer'), findsOneWidget);

    await tester.tap(find.byKey(const Key('driver-decline-button')));
    await tester.pump();

    expect(rideClient.declined, isTrue);
    expect(find.text('Waiting for the next ride request…'), findsOneWidget);

    await tester.tap(find.byKey(const Key('driver-online-switch')));
    await tester.pump();
  });

  testWidgets('opens rider chat from an accepted ride', (tester) async {
    final rideClient = FakeDriverRideClient();
    final chatClient = FakeDriverChatClient();
    await signInDriver(tester, rideClient: rideClient, chatClient: chatClient);

    await tester.tap(find.byKey(const Key('driver-online-switch')));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('driver-accept-button')));
    await tester.pump();

    await tester.tap(find.byKey(const Key('driver-chat-button')));
    await tester.pumpAndSettle();

    expect(find.text('Chat with rider'), findsOneWidget);
    expect(find.text('I am at the fountain gate'), findsOneWidget);

    await tester.enterText(
      find.byKey(const Key('chat-input')),
      'On my way to you',
    );
    await tester.tap(find.byKey(const Key('send-chat')));
    await tester.pumpAndSettle();

    expect(find.text('On my way to you'), findsOneWidget);
    expect(chatClient.sent, contains('On my way to you'));

    // Close the sheet and go offline to cancel timers.
    await tester.tapAt(const Offset(10, 10));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('driver-online-switch')));
    await tester.pump();
  });

  testWidgets('shows earnings and finished rides on the earnings tab', (
    tester,
  ) async {
    final rideClient = FakeDriverRideClient();
    await signInDriver(tester, rideClient: rideClient);

    await tester.tap(find.byKey(const Key('driver-tab-earnings')));
    await tester.pumpAndSettle();

    expect(find.text('Earnings'), findsWidgets);
    expect(find.text('PKR 350'), findsWidgets);
    expect(find.text('Today · 1 rides'), findsOneWidget);
    expect(find.text('Last 7 days · 3 rides'), findsOneWidget);
    expect(find.textContaining('Frere Hall, Karachi'), findsOneWidget);
  });

  testWidgets('shows the driver identity on the account tab', (tester) async {
    final rideClient = FakeDriverRideClient();
    await signInDriver(tester, rideClient: rideClient);

    await tester.tap(find.byKey(const Key('driver-tab-account')));
    await tester.pumpAndSettle();

    expect(find.text('Driver 6543'), findsWidgets);
    expect(find.text('Phone: +923009876543'), findsOneWidget);
    expect(find.text('Duty city: Karachi'), findsOneWidget);
  });
}

class FakeDriverIdentityClient implements DriverIdentityClient {
  @override
  Future<List<RiderCity>> getActiveCities() async {
    return const [RiderCity(id: 'city_karachi', name: 'Karachi')];
  }

  @override
  Future<DevelopmentOtpChallenge> requestOtp(String phone) async {
    return const DevelopmentOtpChallenge(
      challengeId: 'challenge_1',
      developmentCode: '123456',
      expiresAt: '2026-07-13T12:00:00.000Z',
    );
  }

  @override
  Future<DriverSession> verifyOtp({
    required String challengeId,
    required String code,
    required String cityId,
  }) async {
    return const DriverSession(
      accessToken: 'driver-token',
      driver: DriverProfile(
        id: 'driver_1',
        phone: '+923009876543',
        cityId: 'city_karachi',
        cityName: 'Karachi',
        name: 'Driver 6543',
        online: false,
      ),
    );
  }
}

class FakeDriverChatClient implements RiderChatClient {
  final List<String> sent = [];

  @override
  Future<List<RiderChatMessage>> listMessages({
    required String accessToken,
    required String rideId,
  }) async {
    return [
      RiderChatMessage(
        id: 'message_1',
        senderType: 'rider',
        body: 'I am at the fountain gate',
        sentAt: DateTime.parse('2026-07-13T11:00:00.000Z'),
      ),
    ];
  }

  @override
  Future<RiderChatMessage> sendMessage({
    required String accessToken,
    required String rideId,
    required String message,
  }) async {
    sent.add(message);
    return RiderChatMessage(
      id: 'message_${sent.length + 1}',
      senderType: 'driver',
      body: message,
      sentAt: DateTime.parse('2026-07-13T11:01:00.000Z'),
    );
  }
}

class _DeniedLocationClient implements RiderLocationClient {
  @override
  Future<RiderLocationResult> locate() async {
    return const RiderLocationResult.unavailable(
      RiderLocationStatus.permissionDenied,
    );
  }

  @override
  Future<void> openSettings(RiderLocationStatus status) async {}
}

class FakeDriverRideClient implements DriverRideClient {
  bool online = false;
  bool declined = false;
  String state = 'offered_to_driver';
  bool consumed = false;
  final List<({double latitude, double longitude})> pings = [];

  DriverRide _ride() {
    return DriverRide(
      id: 'ride_1',
      state: state,
      riderPhone: '+923001234567',
      pickup: const DriverRidePoint(
        latitude: 24.8475,
        longitude: 67.0331,
        address: 'Frere Hall, Karachi',
      ),
      destination: const DriverRidePoint(
        latitude: 24.8138,
        longitude: 67.0307,
        address: 'Clifton Beach, Karachi',
      ),
      estimatedFareMinor: 35000,
      finalFareMinor: state == 'completed' ? 35000 : null,
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
  }) async {
    this.online = online;
  }

  @override
  Future<DriverRide?> getCurrentRide({required String accessToken}) async {
    if (!online || consumed) {
      return null;
    }
    return _ride();
  }

  @override
  Future<DriverRide> acceptRide({
    required String accessToken,
    required String rideId,
  }) async {
    state = 'accepted';
    return _ride();
  }

  @override
  Future<void> declineRide({
    required String accessToken,
    required String rideId,
  }) async {
    declined = true;
    consumed = true;
  }

  @override
  Future<DriverRide> advanceRide({
    required String accessToken,
    required String rideId,
    required String to,
  }) async {
    state = to;
    return _ride();
  }

  @override
  Future<DriverRide> completeRide({
    required String accessToken,
    required String rideId,
  }) async {
    state = 'completed';
    consumed = true;
    return _ride();
  }

  @override
  Future<DriverRide> cancelRide({
    required String accessToken,
    required String rideId,
  }) async {
    state = 'cancelled_by_driver';
    consumed = true;
    return _ride();
  }

  @override
  Future<void> pingLocation({
    required String accessToken,
    required double latitude,
    required double longitude,
  }) async {
    pings.add((latitude: latitude, longitude: longitude));
  }

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
  Future<List<DriverRide>> getRideHistory({
    required String accessToken,
  }) async {
    return [
      DriverRide(
        id: 'ride_done',
        state: 'completed',
        riderPhone: '+923001234567',
        pickup: const DriverRidePoint(
          latitude: 24.8475,
          longitude: 67.0331,
          address: 'Frere Hall, Karachi',
        ),
        destination: const DriverRidePoint(
          latitude: 24.8138,
          longitude: 67.0307,
          address: 'Clifton Beach, Karachi',
        ),
        estimatedFareMinor: 35000,
        finalFareMinor: 35000,
        currency: 'PKR',
        requestedAt: '2026-07-13T10:00:00.000Z',
      ),
    ];
  }

  @override
  Future<DriverEarnings> getEarnings({required String accessToken}) async {
    return const DriverEarnings(
      currency: 'PKR',
      today: DriverEarningsWindow(rides: 1, totalMinor: 35000),
      week: DriverEarningsWindow(rides: 3, totalMinor: 105000),
    );
  }
}
