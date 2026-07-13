import 'map_config.dart';

class TamiMapCoordinate {
  const TamiMapCoordinate({required this.latitude, required this.longitude})
    : assert(latitude >= -90 && latitude <= 90),
      assert(longitude >= -180 && longitude <= 180);

  final double latitude;
  final double longitude;
}

class TamiMapBounds {
  const TamiMapBounds({
    required this.latitudeSouth,
    required this.latitudeNorth,
    required this.longitudeWest,
    required this.longitudeEast,
  });

  final double latitudeSouth;
  final double latitudeNorth;
  final double longitudeWest;
  final double longitudeEast;
}

class TamiMapViewState {
  const TamiMapViewState({
    this.pickup,
    this.destination,
    this.routeCoordinates = const [],
  });

  final TamiMapCoordinate? pickup;
  final TamiMapCoordinate? destination;
  final List<TamiMapCoordinate> routeCoordinates;

  bool get hasRoute => routeCoordinates.length >= 2;

  TamiMapBounds? get bounds {
    final points = <TamiMapCoordinate>[
      ?pickup,
      ...routeCoordinates,
      ?destination,
    ];
    if (points.isEmpty) {
      return null;
    }

    var latitudeSouth = points.first.latitude;
    var latitudeNorth = points.first.latitude;
    var longitudeWest = points.first.longitude;
    var longitudeEast = points.first.longitude;
    for (final point in points.skip(1)) {
      if (point.latitude < latitudeSouth) latitudeSouth = point.latitude;
      if (point.latitude > latitudeNorth) latitudeNorth = point.latitude;
      if (point.longitude < longitudeWest) longitudeWest = point.longitude;
      if (point.longitude > longitudeEast) longitudeEast = point.longitude;
    }
    return TamiMapBounds(
      latitudeSouth: latitudeSouth,
      latitudeNorth: latitudeNorth,
      longitudeWest: longitudeWest,
      longitudeEast: longitudeEast,
    );
  }

  TamiMapCoordinate get cameraCenter {
    final currentBounds = bounds;
    if (currentBounds == null) {
      return TamiMapCoordinate(
        latitude: tamiMapConfig.defaultLatitude,
        longitude: tamiMapConfig.defaultLongitude,
      );
    }
    return TamiMapCoordinate(
      latitude: (currentBounds.latitudeSouth + currentBounds.latitudeNorth) / 2,
      longitude:
          (currentBounds.longitudeWest + currentBounds.longitudeEast) / 2,
    );
  }
}
