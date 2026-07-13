enum RiderLocationStatus {
  ready,
  servicesDisabled,
  permissionDenied,
  permissionDeniedForever,
  failed,
}

class RiderDeviceLocation {
  const RiderDeviceLocation({
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    required this.capturedAt,
  });

  final double latitude;
  final double longitude;
  final double accuracyMeters;
  final DateTime capturedAt;
}

class RiderLocationResult {
  const RiderLocationResult._({required this.status, this.location});

  const RiderLocationResult.ready(RiderDeviceLocation location)
    : this._(status: RiderLocationStatus.ready, location: location);

  const RiderLocationResult.unavailable(RiderLocationStatus status)
    : this._(status: status);

  final RiderLocationStatus status;
  final RiderDeviceLocation? location;
}
