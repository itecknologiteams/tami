import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/maps/map_preview_fallback.dart';
import 'package:tami_mobile/src/maps/tami_map_view_state.dart';

void main() {
  testWidgets('renders the road route and both endpoint markers', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 390,
            height: 700,
            child: MapPreviewFallback(
              viewState: TamiMapViewState(
                pickup: TamiMapCoordinate(
                  latitude: 25.3935,
                  longitude: 68.3544,
                ),
                destination: TamiMapCoordinate(
                  latitude: 25.396,
                  longitude: 68.373,
                ),
                routeCoordinates: [
                  TamiMapCoordinate(latitude: 25.3935, longitude: 68.3544),
                  TamiMapCoordinate(latitude: 25.401, longitude: 68.363),
                  TamiMapCoordinate(latitude: 25.396, longitude: 68.373),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.byKey(const Key('map-road-route')), findsOneWidget);
    expect(find.byKey(const Key('map-pickup-marker')), findsOneWidget);
    expect(find.byKey(const Key('map-destination-marker')), findsOneWidget);
  });
}
