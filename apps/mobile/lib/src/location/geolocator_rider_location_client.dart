import 'package:geolocator/geolocator.dart';

import 'rider_location.dart';
import 'rider_location_client.dart';

enum RiderLocationPermission { denied, deniedForever, whileInUse, always }

class GeolocatorPosition {
  const GeolocatorPosition({
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    this.capturedAt,
  });

  final double latitude;
  final double longitude;
  final double accuracyMeters;
  final DateTime? capturedAt;
}

abstract interface class GeolocatorGateway {
  Future<bool> isLocationServiceEnabled();

  Future<RiderLocationPermission> checkPermission();

  Future<RiderLocationPermission> requestPermission();

  Future<GeolocatorPosition> getCurrentPosition();

  Future<bool> openAppSettings();

  Future<bool> openLocationSettings();
}

class GeolocatorRiderLocationClient implements RiderLocationClient {
  GeolocatorRiderLocationClient({GeolocatorGateway? gateway})
    : _gateway = gateway ?? const PluginGeolocatorGateway();

  final GeolocatorGateway _gateway;

  @override
  Future<RiderLocationResult> locate() async {
    try {
      if (!await _gateway.isLocationServiceEnabled()) {
        return const RiderLocationResult.unavailable(
          RiderLocationStatus.servicesDisabled,
        );
      }

      var permission = await _gateway.checkPermission();
      if (permission == RiderLocationPermission.denied) {
        permission = await _gateway.requestPermission();
      }
      if (permission == RiderLocationPermission.denied) {
        return const RiderLocationResult.unavailable(
          RiderLocationStatus.permissionDenied,
        );
      }
      if (permission == RiderLocationPermission.deniedForever) {
        return const RiderLocationResult.unavailable(
          RiderLocationStatus.permissionDeniedForever,
        );
      }

      final position = await _gateway.getCurrentPosition();
      return RiderLocationResult.ready(
        RiderDeviceLocation(
          latitude: position.latitude,
          longitude: position.longitude,
          accuracyMeters: position.accuracyMeters,
          capturedAt: position.capturedAt ?? DateTime.now().toUtc(),
        ),
      );
    } on LocationServiceDisabledException {
      return const RiderLocationResult.unavailable(
        RiderLocationStatus.servicesDisabled,
      );
    } catch (_) {
      return const RiderLocationResult.unavailable(RiderLocationStatus.failed);
    }
  }

  @override
  Future<void> openSettings(RiderLocationStatus status) async {
    if (status == RiderLocationStatus.servicesDisabled) {
      await _gateway.openLocationSettings();
      return;
    }
    if (status == RiderLocationStatus.permissionDeniedForever) {
      await _gateway.openAppSettings();
    }
  }
}

class PluginGeolocatorGateway implements GeolocatorGateway {
  const PluginGeolocatorGateway();

  @override
  Future<RiderLocationPermission> checkPermission() async {
    return _mapPermission(await Geolocator.checkPermission());
  }

  @override
  Future<GeolocatorPosition> getCurrentPosition() async {
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 12),
      ),
    );
    return GeolocatorPosition(
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMeters: position.accuracy,
      capturedAt: position.timestamp,
    );
  }

  @override
  Future<bool> isLocationServiceEnabled() {
    return Geolocator.isLocationServiceEnabled();
  }

  @override
  Future<bool> openAppSettings() => Geolocator.openAppSettings();

  @override
  Future<bool> openLocationSettings() => Geolocator.openLocationSettings();

  @override
  Future<RiderLocationPermission> requestPermission() async {
    return _mapPermission(await Geolocator.requestPermission());
  }
}

RiderLocationPermission _mapPermission(LocationPermission permission) {
  return switch (permission) {
    LocationPermission.denied || LocationPermission.unableToDetermine =>
      RiderLocationPermission.denied,
    LocationPermission.deniedForever => RiderLocationPermission.deniedForever,
    LocationPermission.whileInUse => RiderLocationPermission.whileInUse,
    LocationPermission.always => RiderLocationPermission.always,
  };
}
