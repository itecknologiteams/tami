import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/maps/map_config.dart';

void main() {
  group('mobile map config', () {
    test('uses the approved MapLibre public provider', () {
      expect(tamiMapConfig.provider, 'maplibre_public');
    });

    test('uses the requested streets v2 style family', () {
      expect(tamiMapConfig.styleId, 'streets-v2');
    });

    test('does not reference maplibre-gl-js for mobile', () {
      expect(tamiMapConfig.flutterPackage, isNot('maplibre-gl-js'));
      expect(tamiMapConfig.flutterPackage, isNot('maplibre_gl'));
    });
  });
}
