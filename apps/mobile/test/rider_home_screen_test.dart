import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/auth/rider_session.dart';
import 'package:tami_mobile/src/features/rider/rider_booking_client.dart';
import 'package:tami_mobile/src/features/rider/rider_chat_client.dart';
import 'package:tami_mobile/src/features/rider/rider_home_screen.dart';
import 'package:tami_mobile/src/features/rider/rider_ride_query_client.dart';
import 'package:tami_mobile/src/features/rider/rider_saved_place_client.dart';
import 'package:tami_mobile/src/features/rider/rider_pricing_client.dart';
import 'package:tami_mobile/src/features/rider/rider_place_search_client.dart';
import 'package:tami_mobile/src/ui/tami_route_ribbon.dart';
import 'package:tami_mobile/src/location/rider_location.dart';
import 'package:tami_mobile/src/location/rider_location_client.dart';

void main() {
  testWidgets('resolves current pickup and shows the rider session city', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: RiderHomeScreen(
          session: _hyderabadSession,
          locationClient: _ReadyLocationClient(),
          placeSearchClient: _HyderabadPlaceSearchClient(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Hyderabad'), findsOneWidget);
    expect(find.text('Rani Bagh'), findsOneWidget);
    expect(find.text('Qasimabad, Hyderabad'), findsOneWidget);
  });

  testWidgets('allows manual pickup when location permission is denied', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: RiderHomeScreen(
          session: _hyderabadSession,
          locationClient: _DeniedLocationClient(),
          placeSearchClient: _HyderabadPlaceSearchClient(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Choose pickup'), findsOneWidget);
    expect(find.text('Location permission is off'), findsOneWidget);
    await tester.tap(find.text('Choose pickup'));
    await tester.pumpAndSettle();
    expect(find.text('Choose pickup'), findsWidgets);
    await tester.enterText(find.byKey(const Key('place-search')), 'Rani');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    await tester.tap(find.text('Rani Bagh'));
    await tester.pumpAndSettle();

    expect(find.text('Qasimabad, Hyderabad'), findsOneWidget);
  });

  testWidgets('opens app settings for permanently denied location', (
    tester,
  ) async {
    final locationClient = _ForeverDeniedLocationClient();
    await tester.pumpWidget(
      MaterialApp(
        home: RiderHomeScreen(
          session: _hyderabadSession,
          locationClient: locationClient,
          placeSearchClient: const _HyderabadPlaceSearchClient(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Open location settings'));
    await tester.pump();

    expect(
      locationClient.openedStatus,
      RiderLocationStatus.permissionDeniedForever,
    );
  });

  testWidgets('retries a failed current location lookup', (tester) async {
    final locationClient = _RetryLocationClient();
    await tester.pumpWidget(
      MaterialApp(
        home: RiderHomeScreen(
          session: _hyderabadSession,
          locationClient: locationClient,
          placeSearchClient: const _HyderabadPlaceSearchClient(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Current location is unavailable'), findsOneWidget);
    await tester.tap(find.byTooltip('Retry current location'));
    await tester.pumpAndSettle();

    expect(locationClient.locateCalls, 2);
    expect(find.text('Rani Bagh'), findsOneWidget);
  });

  testWidgets('opens location settings when device services are disabled', (
    tester,
  ) async {
    final locationClient = _ServicesDisabledLocationClient();
    await tester.pumpWidget(
      MaterialApp(
        home: RiderHomeScreen(
          session: _hyderabadSession,
          locationClient: locationClient,
          placeSearchClient: const _HyderabadPlaceSearchClient(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Location services are off'), findsOneWidget);
    await tester.tap(find.byTooltip('Open location settings'));
    await tester.pump();

    expect(locationClient.openedStatus, RiderLocationStatus.servicesDisabled);
  });

  testWidgets('uses a rider saved place as the destination', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: RiderHomeScreen(
          session: _session,
          savedPlaceClient: _HomePlaceClient(),
          placeSearchClient: const _PlaceSearchClient(),
          initialPickup: _karachiPickup,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Where to?'));
    await tester.pumpAndSettle();
    expect(find.text('PECHS, Karachi'), findsOneWidget);
    await tester.tap(find.text('Home'));
    await tester.pumpAndSettle();

    expect(find.text('Choose a ride'), findsOneWidget);
    expect(find.byKey(const Key('place-search-glass')), findsNothing);
    expect(find.text('PECHS, Karachi'), findsOneWidget);
  });
  testWidgets('restores the current ride from the server', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: RiderHomeScreen(
          session: _session,
          rideQueryClient: _FakeRideQueryClient(
            current: const RiderRide(
              id: 'ride_current',
              state: 'accepted',
              categoryCode: 'standard_taxi',
              pickup: RiderRideLocation(
                latitude: 24.86,
                longitude: 67.01,
                address: 'Pickup',
              ),
              destination: RiderRideLocation(
                latitude: 24.88,
                longitude: 67.05,
                address: 'Airport, Karachi',
              ),
              scheduledPickupAt: null,
              requestedAt: '2026-07-11T09:00:00.000Z',
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Driver accepted your ride'), findsOneWidget);
    expect(find.text('Ride requested to Airport'), findsOneWidget);
  });
  testWidgets('caps the booking surface on wide preview screens', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1200, 811);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: RiderHomeScreen(
          session: _session,
          placeSearchClient: _PlaceSearchClient(),
          initialPickup: _karachiPickup,
        ),
      ),
    );

    expect(
      tester.getSize(find.byKey(const Key('rider-booking-glass'))).width,
      lessThanOrEqualTo(520),
    );
  });

  testWidgets('opens a destination search from the map booking surface', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: RiderHomeScreen(
          session: _session,
          placeSearchClient: _PlaceSearchClient(),
          initialPickup: _karachiPickup,
        ),
      ),
    );

    expect(find.byKey(const Key('rider-map')), findsOneWidget);
    expect(find.byKey(const Key('rider-city-glass')), findsOneWidget);
    expect(find.byKey(const Key('rider-safety-glass')), findsOneWidget);
    expect(find.byKey(const Key('rider-booking-glass')), findsOneWidget);
    expect(find.text('Where to?'), findsOneWidget);
    expect(find.text('Frere Hall'), findsOneWidget);

    await tester.tap(find.text('Where to?'));
    await tester.pumpAndSettle();

    expect(find.text('Choose destination'), findsOneWidget);
    expect(find.byKey(const Key('place-search-glass')), findsOneWidget);
    expect(find.byKey(const Key('place-search')), findsOneWidget);
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Work'), findsOneWidget);
  });

  testWidgets('shows ride choices after a destination is selected', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: RiderHomeScreen(
          session: _session,
          placeSearchClient: _PlaceSearchClient(),
          initialPickup: _karachiPickup,
        ),
      ),
    );

    await tester.tap(find.text('Where to?'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('place-search')), 'Mazar');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    await tester.tap(find.text('Mazar-e-Quaid'));
    await tester.pumpAndSettle();

    expect(find.text('Choose a ride'), findsOneWidget);
    expect(find.byKey(const Key('ride-options-glass')), findsOneWidget);
    expect(find.text('Standard Taxi'), findsOneWidget);
    expect(find.text('Cash'), findsOneWidget);
    expect(find.text('Confirm ride'), findsOneWidget);
  });

  testWidgets('creates a requested ride when the rider confirms', (
    tester,
  ) async {
    final bookingClient = _RecordingBookingClient();
    await tester.pumpWidget(
      MaterialApp(
        home: RiderHomeScreen(
          session: const RiderSession(
            accessToken: 'rider-session-token',
            rider: RiderProfile(
              id: 'rider_123',
              phone: '+923001234567',
              cityId: 'city_karachi',
              cityName: 'Karachi',
              name: 'Aamir',
              email: null,
              imageUrl: null,
            ),
          ),
          bookingClient: bookingClient,
          pricingClient: _PricingClient(),
          placeSearchClient: const _PlaceSearchClient(),
          initialPickup: _karachiPickup,
        ),
      ),
    );

    await tester.tap(find.text('Where to?'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('place-search')), 'Mazar');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    await tester.tap(find.text('Mazar-e-Quaid'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Confirm ride'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(bookingClient.accessToken, 'rider-session-token');
    expect(bookingClient.request?.categoryCode, 'standard_taxi');
    expect(bookingClient.request?.paymentMethod, RiderPaymentMethod.cash);
    expect(bookingClient.request?.pickup.address, 'Civil Lines, Karachi');
    expect(
      bookingClient.request?.destination.address,
      'Mazar-e-Quaid, Karachi',
    );
    expect(find.text('Finding your driver'), findsOneWidget);
    expect(find.text('Confirmed fare PKR 536.64'), findsOneWidget);
    expect(find.text('Payment Cash'), findsOneWidget);
  });

  testWidgets('shows the server fare estimate in ride options', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: RiderHomeScreen(
          session: _session,
          pricingClient: _PricingClient(),
          placeSearchClient: const _PlaceSearchClient(),
          initialPickup: _karachiPickup,
        ),
      ),
    );

    await tester.tap(find.text('Where to?'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('place-search')), 'Mazar');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    await tester.tap(find.text('Mazar-e-Quaid'));
    await tester.pumpAndSettle();

    expect(find.text('PKR 512'), findsOneWidget);
    expect(find.text('Policy version 1'), findsOneWidget);
  });

  testWidgets('disables confirmation while fare pricing is unavailable', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: RiderHomeScreen(
          session: _session,
          pricingClient: _FailingPricingClient(),
          placeSearchClient: const _PlaceSearchClient(),
          initialPickup: _karachiPickup,
        ),
      ),
    );

    await tester.tap(find.text('Where to?'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('place-search')), 'Mazar');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    await tester.tap(find.text('Mazar-e-Quaid'));
    await tester.pumpAndSettle();

    expect(find.text('Fare unavailable'), findsOneWidget);
    expect(
      tester.widget<ElevatedButton>(find.byType(ElevatedButton)).onPressed,
      isNull,
    );
    expect(find.byTooltip('Retry fare estimate'), findsOneWidget);
  });

  testWidgets('cancels a requested ride from the active ride panel', (
    tester,
  ) async {
    final bookingClient = _RecordingBookingClient();
    await tester.pumpWidget(
      MaterialApp(
        home: RiderHomeScreen(
          session: const RiderSession(
            accessToken: 'rider-session-token',
            rider: RiderProfile(
              id: 'rider_123',
              phone: '+923001234567',
              cityId: 'city_karachi',
              cityName: 'Karachi',
              name: 'Aamir',
              email: null,
              imageUrl: null,
            ),
          ),
          bookingClient: bookingClient,
          pricingClient: _PricingClient(),
          placeSearchClient: const _PlaceSearchClient(),
          initialPickup: _karachiPickup,
        ),
      ),
    );

    await _requestMazarRide(tester);
    await tester.tap(find.text('Cancel ride'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Cancel this ride?'), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, 'Cancel ride'));
    await tester.pump(const Duration(milliseconds: 300));

    expect(bookingClient.cancelledRideId, 'ride_123');
    expect(find.text('Where to?'), findsOneWidget);
  });

  testWidgets('only exposes driver chat after ride acceptance', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: RiderHomeScreen(
          initialRide: RiderBookingRide(
            id: 'ride_accepted',
            state: 'accepted',
            categoryCode: 'standard_taxi',
            scheduledPickupAt: null,
          ),
          initialDestination: TamiPlace(
            name: 'Mazar-e-Quaid',
            address: 'Mazar-e-Quaid, Karachi',
            latitude: 24.8753,
            longitude: 67.0407,
          ),
        ),
      ),
    );

    expect(find.text('Driver accepted your ride'), findsOneWidget);
    expect(find.byKey(const Key('active-ride-glass')), findsOneWidget);
    expect(find.byType(TamiRouteRibbon), findsOneWidget);
    expect(find.text('Chat with driver'), findsOneWidget);
    expect(find.text('Cancel ride'), findsOneWidget);
  });

  testWidgets('sends a rider message after a ride is accepted', (tester) async {
    final chatClient = _RecordingChatClient();
    await tester.pumpWidget(
      MaterialApp(
        home: RiderHomeScreen(
          session: const RiderSession(
            accessToken: 'rider-session-token',
            rider: RiderProfile(
              id: 'rider_123',
              phone: '+923001234567',
              cityId: 'city_karachi',
              cityName: 'Karachi',
              name: 'Aamir',
              email: null,
              imageUrl: null,
            ),
          ),
          chatClient: chatClient,
          initialRide: const RiderBookingRide(
            id: 'ride_accepted',
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

    await tester.tap(find.text('Chat with driver'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('rider-chat-glass')), findsOneWidget);
    expect(find.text('Chat with driver'), findsWidgets);
    await tester.enterText(
      find.byKey(const Key('chat-input')),
      'I am at gate 2',
    );
    await tester.tap(find.byKey(const Key('send-chat')));
    await tester.pumpAndSettle();

    expect(chatClient.sentBody, 'I am at gate 2');
    expect(find.text('I am at gate 2'), findsOneWidget);
  });

  testWidgets('offers a date and time picker for scheduled rides', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: RiderHomeScreen(
          session: _session,
          placeSearchClient: _PlaceSearchClient(),
          initialPickup: _karachiPickup,
        ),
      ),
    );

    await tester.tap(find.text('Where to?'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('place-search')), 'Mazar');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    await tester.tap(find.text('Mazar-e-Quaid'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Later'));
    await tester.pump();

    expect(find.byKey(const Key('schedule-picker')), findsOneWidget);
  });
}

const _session = RiderSession(
  accessToken: 'rider-session-token',
  rider: RiderProfile(
    id: 'rider_123',
    phone: '+923001234567',
    cityId: 'city_karachi',
    cityName: 'Karachi',
    name: 'Aamir',
    email: null,
    imageUrl: null,
  ),
);

const _karachiPickup = TamiPlace(
  id: 'karachi-frere',
  cityId: 'city_karachi',
  name: 'Frere Hall',
  address: 'Civil Lines, Karachi',
  latitude: 24.8468,
  longitude: 67.0303,
);

const _hyderabadSession = RiderSession(
  accessToken: 'hyderabad-token',
  rider: RiderProfile(
    id: 'rider_hyderabad',
    phone: '+923001234568',
    cityId: 'city_hyderabad',
    cityName: 'Hyderabad',
    name: 'Sara',
    email: null,
    imageUrl: null,
  ),
);

Future<void> _requestMazarRide(WidgetTester tester) async {
  await tester.tap(find.text('Where to?'));
  await tester.pumpAndSettle();
  await tester.enterText(find.byKey(const Key('place-search')), 'Mazar');
  await tester.pump(const Duration(milliseconds: 350));
  await tester.pump();
  await tester.tap(find.text('Mazar-e-Quaid'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Confirm ride'));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 300));
}

class _RecordingBookingClient implements RiderBookingClient {
  String? accessToken;
  CreateRiderRideRequest? request;
  String? cancelledRideId;

  @override
  Future<RiderBookingRide> createRide({
    required String accessToken,
    required CreateRiderRideRequest request,
  }) async {
    this.accessToken = accessToken;
    this.request = request;
    return const RiderBookingRide(
      id: 'ride_123',
      state: 'requested',
      categoryCode: 'standard_taxi',
      scheduledPickupAt: null,
      estimatedFareMinor: 53664,
      currency: 'PKR',
      paymentMethod: 'cash',
    );
  }

  @override
  Future<RiderBookingRide> cancelRide({
    required String accessToken,
    required String rideId,
  }) async {
    cancelledRideId = rideId;
    return const RiderBookingRide(
      id: 'ride_123',
      state: 'cancelled_by_rider',
      categoryCode: 'standard_taxi',
      scheduledPickupAt: null,
      estimatedFareMinor: 53664,
      currency: 'PKR',
      paymentMethod: 'cash',
    );
  }
}

class _PricingClient implements RiderPricingClient {
  @override
  Future<RiderFareEstimate> estimateFare({
    required String accessToken,
    required RiderFareEstimateRequest request,
  }) async {
    return const RiderFareEstimate(
      fareMinor: 51200,
      currency: 'PKR',
      policyId: 'policy_1',
      policyVersion: 1,
      distanceMeters: 6200,
      durationSeconds: 930,
      routeMethod: 'great_circle_road_factor_v1',
      multiplier: 1,
      capApplied: false,
      breakdown: RiderFareBreakdown(
        baseFareMinor: 20000,
        distanceFareMinor: 21700,
        timeFareMinor: 7500,
        bookingFeeMinor: 2000,
        subtotalMinor: 51200,
      ),
      explanationLines: ['Policy version 1'],
    );
  }
}

class _FailingPricingClient implements RiderPricingClient {
  @override
  Future<RiderFareEstimate> estimateFare({
    required String accessToken,
    required RiderFareEstimateRequest request,
  }) async => throw const RiderPricingException('Fare service is unavailable');
}

class _RecordingChatClient implements RiderChatClient {
  String? sentBody;

  @override
  Future<List<RiderChatMessage>> listMessages({
    required String accessToken,
    required String rideId,
  }) async => const [];

  @override
  Future<RiderChatMessage> sendMessage({
    required String accessToken,
    required String rideId,
    required String message,
  }) async {
    sentBody = message;
    return RiderChatMessage(
      id: 'message_1',
      senderType: 'rider',
      body: message,
      sentAt: DateTime.utc(2026, 7, 10, 12),
    );
  }
}

class _FakeRideQueryClient implements RiderRideQueryClient {
  _FakeRideQueryClient({this.current});

  final RiderRide? current;

  @override
  Future<RiderRide?> getCurrentRide({required String accessToken}) async =>
      current;

  @override
  Future<RiderRide> getRide({
    required String accessToken,
    required String rideId,
  }) async => current!;

  @override
  Future<RiderRidePage> getRideHistory({
    required String accessToken,
    String? cursor,
    int limit = 20,
  }) async => const RiderRidePage(items: [], nextCursor: null);

  @override
  Future<List<RiderRide>> getUpcomingRides({
    required String accessToken,
  }) async => const [];
}

class _HomePlaceClient implements RiderSavedPlaceClient {
  @override
  Future<void> deletePlace({
    required String accessToken,
    required String placeId,
  }) async {}

  @override
  Future<List<RiderSavedPlace>> listPlaces({
    required String accessToken,
  }) async => const [
    RiderSavedPlace(
      id: 'place_home',
      designation: RiderPlaceDesignation.home,
      label: 'Home',
      address: 'PECHS, Karachi',
      latitude: 24.86,
      longitude: 67.06,
    ),
  ];

  @override
  Future<RiderSavedPlace> savePlace({
    required String accessToken,
    required SaveRiderPlaceRequest request,
    String? placeId,
  }) => throw UnimplementedError();
}

class _PlaceSearchClient implements RiderPlaceSearchClient {
  const _PlaceSearchClient();

  @override
  Future<TamiPlace> reverse({
    required String accessToken,
    required double latitude,
    required double longitude,
  }) async => TamiPlace(
    name: 'Current location',
    address: 'Current location',
    latitude: latitude,
    longitude: longitude,
  );

  @override
  Future<List<TamiPlace>> search({
    required String accessToken,
    required String query,
    RiderPlaceProximity? proximity,
  }) async {
    if (!'Mazar-e-Quaid'.toLowerCase().contains(query.toLowerCase())) {
      return const [];
    }
    return const [
      TamiPlace(
        id: 'karachi-mazar',
        cityId: 'city_karachi',
        name: 'Mazar-e-Quaid',
        address: 'Mazar-e-Quaid, Karachi',
        latitude: 24.8753,
        longitude: 67.0407,
      ),
    ];
  }
}

class _HyderabadPlaceSearchClient implements RiderPlaceSearchClient {
  const _HyderabadPlaceSearchClient();

  @override
  Future<TamiPlace> reverse({
    required String accessToken,
    required double latitude,
    required double longitude,
  }) async => const TamiPlace(
    id: 'hyderabad-rani-bagh',
    cityId: 'city_hyderabad',
    name: 'Rani Bagh',
    address: 'Qasimabad, Hyderabad',
    latitude: 25.3935,
    longitude: 68.3544,
  );

  @override
  Future<List<TamiPlace>> search({
    required String accessToken,
    required String query,
    RiderPlaceProximity? proximity,
  }) async => const [
    TamiPlace(
      id: 'hyderabad-rani-bagh',
      cityId: 'city_hyderabad',
      name: 'Rani Bagh',
      address: 'Qasimabad, Hyderabad',
      latitude: 25.3935,
      longitude: 68.3544,
    ),
  ];
}

class _ReadyLocationClient implements RiderLocationClient {
  const _ReadyLocationClient();

  @override
  Future<RiderLocationResult> locate() async {
    return RiderLocationResult.ready(
      RiderDeviceLocation(
        latitude: 25.3935,
        longitude: 68.3544,
        accuracyMeters: 7,
        capturedAt: DateTime.utc(2026, 7, 13),
      ),
    );
  }

  @override
  Future<void> openSettings(RiderLocationStatus status) async {}
}

class _DeniedLocationClient implements RiderLocationClient {
  const _DeniedLocationClient();

  @override
  Future<RiderLocationResult> locate() async {
    return const RiderLocationResult.unavailable(
      RiderLocationStatus.permissionDenied,
    );
  }

  @override
  Future<void> openSettings(RiderLocationStatus status) async {}
}

class _ForeverDeniedLocationClient implements RiderLocationClient {
  RiderLocationStatus? openedStatus;

  @override
  Future<RiderLocationResult> locate() async {
    return const RiderLocationResult.unavailable(
      RiderLocationStatus.permissionDeniedForever,
    );
  }

  @override
  Future<void> openSettings(RiderLocationStatus status) async {
    openedStatus = status;
  }
}

class _RetryLocationClient implements RiderLocationClient {
  int locateCalls = 0;

  @override
  Future<RiderLocationResult> locate() async {
    locateCalls += 1;
    if (locateCalls == 1) {
      return const RiderLocationResult.unavailable(RiderLocationStatus.failed);
    }
    return _ReadyLocationClient().locate();
  }

  @override
  Future<void> openSettings(RiderLocationStatus status) async {}
}

class _ServicesDisabledLocationClient implements RiderLocationClient {
  RiderLocationStatus? openedStatus;

  @override
  Future<RiderLocationResult> locate() async {
    return const RiderLocationResult.unavailable(
      RiderLocationStatus.servicesDisabled,
    );
  }

  @override
  Future<void> openSettings(RiderLocationStatus status) async {
    openedStatus = status;
  }
}
