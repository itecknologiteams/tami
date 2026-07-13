import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/features/rider/booking/destination_search_sheet.dart';
import 'package:tami_mobile/src/features/rider/booking/tami_place.dart';
import 'package:tami_mobile/src/features/rider/rider_place_search_client.dart';
import 'package:tami_mobile/src/features/rider/rider_saved_place_client.dart';

void main() {
  testWidgets('waits for two characters and a 350ms debounce', (tester) async {
    final client = _RecordingPlaceSearchClient();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: RiderPlaceSearchSheet(
            mode: RiderPlaceSearchMode.destination,
            accessToken: 'token',
            searchClient: client,
          ),
        ),
      ),
    );

    await tester.enterText(find.byKey(const Key('place-search')), 'a');
    await tester.pump(const Duration(milliseconds: 500));
    expect(client.queries, isEmpty);

    await tester.enterText(find.byKey(const Key('place-search')), 'Airport');
    await tester.pump(const Duration(milliseconds: 349));
    expect(client.queries, isEmpty);
    await tester.pump(const Duration(milliseconds: 1));
    expect(client.queries, ['Airport']);
  });

  testWidgets('ignores stale results when a later query finishes first', (
    tester,
  ) async {
    final client = _CompletingPlaceSearchClient();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: RiderPlaceSearchSheet(
            mode: RiderPlaceSearchMode.destination,
            accessToken: 'token',
            searchClient: client,
          ),
        ),
      ),
    );

    await tester.enterText(find.byKey(const Key('place-search')), 'Airport');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.enterText(find.byKey(const Key('place-search')), 'Station');
    await tester.pump(const Duration(milliseconds: 350));

    client.complete('Station', const [
      TamiPlace(
        name: 'Hyderabad Railway Station',
        address: 'Station Road, Hyderabad',
        latitude: 25.3791,
        longitude: 68.3728,
      ),
    ]);
    await tester.pump();
    expect(find.text('Hyderabad Railway Station'), findsOneWidget);

    client.complete('Airport', const [
      TamiPlace(
        name: 'Jinnah International Airport',
        address: 'Airport Road, Karachi',
        latitude: 24.9065,
        longitude: 67.1608,
      ),
    ]);
    await tester.pump();
    expect(find.text('Jinnah International Airport'), findsNothing);
    expect(find.text('Hyderabad Railway Station'), findsOneWidget);
  });

  testWidgets('shows empty and retryable error states', (tester) async {
    final client = _RetryPlaceSearchClient();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: RiderPlaceSearchSheet(
            mode: RiderPlaceSearchMode.destination,
            accessToken: 'token',
            searchClient: client,
          ),
        ),
      ),
    );

    await tester.enterText(find.byKey(const Key('place-search')), 'Airport');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    expect(find.text('Search is temporarily unavailable'), findsOneWidget);

    await tester.tap(find.byTooltip('Retry place search'));
    await tester.pump();
    expect(find.text('No places found'), findsOneWidget);
  });

  testWidgets('keeps saved places and uses pickup-specific copy', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: RiderPlaceSearchSheet(
            mode: RiderPlaceSearchMode.pickup,
            accessToken: 'token',
            searchClient: _ImmediatePlaceSearchClient(),
            savedPlaces: [
              RiderSavedPlace(
                id: 'home',
                designation: RiderPlaceDesignation.home,
                label: 'Home',
                address: 'Latifabad, Hyderabad',
                latitude: 25.38,
                longitude: 68.37,
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('Choose pickup'), findsOneWidget);
    expect(find.text('Latifabad, Hyderabad'), findsOneWidget);
  });
}

class _RecordingPlaceSearchClient implements RiderPlaceSearchClient {
  final List<String> queries = [];

  @override
  Future<TamiPlace> reverse({
    required String accessToken,
    required double latitude,
    required double longitude,
  }) => throw UnimplementedError();

  @override
  Future<List<TamiPlace>> search({
    required String accessToken,
    required String query,
    RiderPlaceProximity? proximity,
  }) async {
    queries.add(query);
    return const [];
  }
}

class _CompletingPlaceSearchClient implements RiderPlaceSearchClient {
  final Map<String, Completer<List<TamiPlace>>> _requests = {};

  void complete(String query, List<TamiPlace> places) {
    _requests[query]!.complete(places);
  }

  @override
  Future<TamiPlace> reverse({
    required String accessToken,
    required double latitude,
    required double longitude,
  }) => throw UnimplementedError();

  @override
  Future<List<TamiPlace>> search({
    required String accessToken,
    required String query,
    RiderPlaceProximity? proximity,
  }) {
    final completer = Completer<List<TamiPlace>>();
    _requests[query] = completer;
    return completer.future;
  }
}

class _RetryPlaceSearchClient implements RiderPlaceSearchClient {
  int attempts = 0;

  @override
  Future<TamiPlace> reverse({
    required String accessToken,
    required double latitude,
    required double longitude,
  }) => throw UnimplementedError();

  @override
  Future<List<TamiPlace>> search({
    required String accessToken,
    required String query,
    RiderPlaceProximity? proximity,
  }) async {
    attempts += 1;
    if (attempts == 1) {
      throw const RiderPlaceSearchException(
        'Search is temporarily unavailable',
      );
    }
    return const [];
  }
}

class _ImmediatePlaceSearchClient implements RiderPlaceSearchClient {
  const _ImmediatePlaceSearchClient();

  @override
  Future<TamiPlace> reverse({
    required String accessToken,
    required double latitude,
    required double longitude,
  }) => throw UnimplementedError();

  @override
  Future<List<TamiPlace>> search({
    required String accessToken,
    required String query,
    RiderPlaceProximity? proximity,
  }) async => const [];
}
