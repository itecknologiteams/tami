import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/maps/tami_map_view_state.dart';

void main() {
  test('calculates bounds from endpoints and the full road route', () {
    const state = TamiMapViewState(
      pickup: TamiMapCoordinate(latitude: 25.39, longitude: 68.35),
      destination: TamiMapCoordinate(latitude: 25.40, longitude: 68.38),
      routeCoordinates: [
        TamiMapCoordinate(latitude: 25.385, longitude: 68.345),
        TamiMapCoordinate(latitude: 25.42, longitude: 68.37),
        TamiMapCoordinate(latitude: 25.405, longitude: 68.395),
      ],
    );

    expect(state.bounds?.latitudeSouth, 25.385);
    expect(state.bounds?.latitudeNorth, 25.42);
    expect(state.bounds?.longitudeWest, 68.345);
    expect(state.bounds?.longitudeEast, 68.395);
    expect(state.cameraCenter.latitude, closeTo(25.4025, 0.000001));
    expect(state.cameraCenter.longitude, closeTo(68.37, 0.000001));
  });

  test('uses the pickup as the camera center before a route exists', () {
    const state = TamiMapViewState(
      pickup: TamiMapCoordinate(latitude: 27.71, longitude: 68.86),
    );

    expect(state.hasRoute, isFalse);
    expect(state.cameraCenter.latitude, 27.71);
    expect(state.cameraCenter.longitude, 68.86);
  });

  test('falls back to the configured Sindh center without map points', () {
    const state = TamiMapViewState();

    expect(state.bounds, isNull);
    expect(state.cameraCenter.latitude, inInclusiveRange(24, 29));
    expect(state.cameraCenter.longitude, inInclusiveRange(66, 71));
  });
}
