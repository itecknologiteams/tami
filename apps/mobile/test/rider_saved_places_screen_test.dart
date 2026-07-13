import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/auth/rider_session.dart';
import 'package:tami_mobile/src/features/rider/account/rider_saved_places_screen.dart';
import 'package:tami_mobile/src/features/rider/rider_saved_place_client.dart';

void main() {
  testWidgets('loads and creates rider saved places', (tester) async {
    final client = _SavedPlacesClient();
    await tester.pumpWidget(
      MaterialApp(
        home: RiderSavedPlacesScreen(
          session: _session,
          savedPlaceClient: client,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('PECHS, Karachi'), findsOneWidget);
    await tester.tap(find.byTooltip('Add saved place'));
    await tester.pumpAndSettle();
    expect(find.text('Add saved place'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('place-label')), 'Gym');
    await tester.enterText(
      find.byKey(const Key('place-address')),
      'Clifton, Karachi',
    );
    await tester.enterText(find.byKey(const Key('place-latitude')), '24.81');
    await tester.enterText(find.byKey(const Key('place-longitude')), '67.03');
    await tester.tap(find.widgetWithText(FilledButton, 'Save place'));
    await tester.pumpAndSettle();

    expect(client.savedRequest?.label, 'Gym');
    expect(find.text('Clifton, Karachi'), findsOneWidget);
  });
}

const _session = RiderSession(
  accessToken: 'token',
  rider: RiderProfile(
    id: 'rider_1',
    phone: '+923001234567',
    cityId: 'city_karachi',
    cityName: 'Karachi',
    name: 'Aamir',
    email: null,
    imageUrl: null,
  ),
);

class _SavedPlacesClient implements RiderSavedPlaceClient {
  final places = <RiderSavedPlace>[
    const RiderSavedPlace(
      id: 'place_home',
      designation: RiderPlaceDesignation.home,
      label: 'Home',
      address: 'PECHS, Karachi',
      latitude: 24.86,
      longitude: 67.06,
    ),
  ];
  SaveRiderPlaceRequest? savedRequest;

  @override
  Future<void> deletePlace({
    required String accessToken,
    required String placeId,
  }) async => places.removeWhere((place) => place.id == placeId);

  @override
  Future<List<RiderSavedPlace>> listPlaces({
    required String accessToken,
  }) async => List.unmodifiable(places);

  @override
  Future<RiderSavedPlace> savePlace({
    required String accessToken,
    required SaveRiderPlaceRequest request,
    String? placeId,
  }) async {
    savedRequest = request;
    final place = RiderSavedPlace(
      id: placeId ?? 'place_${places.length + 1}',
      designation: request.designation,
      label: request.label,
      address: request.address,
      latitude: request.latitude,
      longitude: request.longitude,
    );
    places.add(place);
    return place;
  }
}
