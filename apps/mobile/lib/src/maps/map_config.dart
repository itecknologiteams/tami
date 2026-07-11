class TamiMapConfig {
  const TamiMapConfig({
    required this.provider,
    required this.styleId,
    required this.flutterPackage,
    required this.styleUrl,
    required this.defaultLatitude,
    required this.defaultLongitude,
    required this.defaultZoom,
  });

  final String provider;
  final String styleId;
  final String flutterPackage;
  final String styleUrl;
  final double defaultLatitude;
  final double defaultLongitude;
  final double defaultZoom;
}

const TamiMapConfig tamiMapConfig = TamiMapConfig(
  provider: 'maplibre_public',
  styleId: 'streets-v2',
  flutterPackage: 'maplibre',
  // Supplied by the approved public-map deployment. The development fallback
  // keeps local native builds inspectable until that endpoint is provisioned.
  styleUrl: String.fromEnvironment(
    'TAMI_MAP_STYLE_URL',
    defaultValue: 'https://demotiles.maplibre.org/style.json',
  ),
  defaultLatitude: 24.8607,
  defaultLongitude: 67.0011,
  defaultZoom: 11,
);
