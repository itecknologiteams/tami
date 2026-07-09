class TamiMapConfig {
  const TamiMapConfig({
    required this.provider,
    required this.styleId,
    required this.flutterPackage,
    required this.styleUrlTemplate,
    required this.defaultLatitude,
    required this.defaultLongitude,
    required this.defaultZoom,
  });

  final String provider;
  final String styleId;
  final String flutterPackage;
  final String styleUrlTemplate;
  final double defaultLatitude;
  final double defaultLongitude;
  final double defaultZoom;
}

const TamiMapConfig tamiMapConfig = TamiMapConfig(
  provider: 'maplibre_public',
  styleId: 'streets-v2',
  flutterPackage: 'maplibre',
  styleUrlTemplate: 'maplibre-public://styles/streets-v2',
  defaultLatitude: 24.8607,
  defaultLongitude: 67.0011,
  defaultZoom: 11,
);
