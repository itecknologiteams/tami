class DriverRidePoint {
  const DriverRidePoint({
    required this.latitude,
    required this.longitude,
    required this.address,
  });

  final double latitude;
  final double longitude;
  final String address;

  factory DriverRidePoint.fromJson(Map<String, dynamic> json) {
    return DriverRidePoint(
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0,
      address: json['address'] as String? ?? '',
    );
  }
}

class DriverRide {
  const DriverRide({
    required this.id,
    required this.state,
    required this.riderPhone,
    required this.pickup,
    required this.destination,
    required this.estimatedFareMinor,
    required this.finalFareMinor,
    required this.currency,
    required this.requestedAt,
  });

  final String id;
  final String state;
  final String? riderPhone;
  final DriverRidePoint pickup;
  final DriverRidePoint destination;
  final int? estimatedFareMinor;
  final int? finalFareMinor;
  final String currency;
  final String requestedAt;

  String get pickupAddress => pickup.address;
  String get destinationAddress => destination.address;

  factory DriverRide.fromJson(Map<String, dynamic> json) {
    return DriverRide(
      id: json['id'] as String,
      state: json['state'] as String,
      riderPhone: json['riderPhone'] as String?,
      pickup: DriverRidePoint.fromJson(
        json['pickup'] as Map<String, dynamic>? ?? const {},
      ),
      destination: DriverRidePoint.fromJson(
        json['destination'] as Map<String, dynamic>? ?? const {},
      ),
      estimatedFareMinor: json['estimatedFareMinor'] as int?,
      finalFareMinor: json['finalFareMinor'] as int?,
      currency: json['currency'] as String? ?? 'PKR',
      requestedAt: json['requestedAt'] as String? ?? '',
    );
  }
}

class DriverRouteCoordinate {
  const DriverRouteCoordinate({
    required this.latitude,
    required this.longitude,
  });

  final double latitude;
  final double longitude;

  factory DriverRouteCoordinate.fromJson(Map<String, dynamic> json) {
    return DriverRouteCoordinate(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
    );
  }
}

class DriverRoute {
  const DriverRoute({
    required this.distanceMeters,
    required this.durationSeconds,
    required this.coordinates,
  });

  final int distanceMeters;
  final int durationSeconds;
  final List<DriverRouteCoordinate> coordinates;

  factory DriverRoute.fromJson(Map<String, dynamic> json) {
    return DriverRoute(
      distanceMeters: (json['distanceMeters'] as num).toInt(),
      durationSeconds: (json['durationSeconds'] as num).toInt(),
      coordinates: (json['coordinates'] as List<dynamic>? ?? const [])
          .cast<Map<String, dynamic>>()
          .map(DriverRouteCoordinate.fromJson)
          .toList(),
    );
  }
}

class DriverEarningsWindow {
  const DriverEarningsWindow({required this.rides, required this.totalMinor});

  final int rides;
  final int totalMinor;

  factory DriverEarningsWindow.fromJson(Map<String, dynamic> json) {
    return DriverEarningsWindow(
      rides: (json['rides'] as num?)?.toInt() ?? 0,
      totalMinor: (json['totalMinor'] as num?)?.toInt() ?? 0,
    );
  }
}

class DriverEarnings {
  const DriverEarnings({
    required this.currency,
    required this.today,
    required this.week,
  });

  final String currency;
  final DriverEarningsWindow today;
  final DriverEarningsWindow week;

  factory DriverEarnings.fromJson(Map<String, dynamic> json) {
    return DriverEarnings(
      currency: json['currency'] as String? ?? 'PKR',
      today: DriverEarningsWindow.fromJson(
        json['today'] as Map<String, dynamic>? ?? const {},
      ),
      week: DriverEarningsWindow.fromJson(
        json['week'] as Map<String, dynamic>? ?? const {},
      ),
    );
  }
}
