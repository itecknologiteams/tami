import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/location/geolocator_rider_location_client.dart';
import 'package:tami_mobile/src/location/rider_location.dart';

void main() {
  test('returns services disabled before requesting permission', () async {
    final gateway = _FakeGeolocatorGateway(serviceEnabled: false);
    final client = GeolocatorRiderLocationClient(gateway: gateway);

    final result = await client.locate();

    expect(result.status, RiderLocationStatus.servicesDisabled);
    expect(result.location, isNull);
    expect(gateway.permissionRequests, 0);
  });

  test('requests denied permission and returns a precise position', () async {
    final capturedAt = DateTime.utc(2026, 7, 13, 8, 30);
    final gateway = _FakeGeolocatorGateway(
      checkedPermission: RiderLocationPermission.denied,
      requestedPermission: RiderLocationPermission.whileInUse,
      position: GeolocatorPosition(
        latitude: 25.396,
        longitude: 68.3578,
        accuracyMeters: 8.4,
        capturedAt: capturedAt,
      ),
    );
    final client = GeolocatorRiderLocationClient(gateway: gateway);

    final result = await client.locate();

    expect(gateway.permissionRequests, 1);
    expect(result.status, RiderLocationStatus.ready);
    expect(result.location?.latitude, 25.396);
    expect(result.location?.longitude, 68.3578);
    expect(result.location?.accuracyMeters, 8.4);
    expect(result.location?.capturedAt, capturedAt);
  });

  test('distinguishes denied and permanently denied permission', () async {
    final denied = GeolocatorRiderLocationClient(
      gateway: _FakeGeolocatorGateway(
        checkedPermission: RiderLocationPermission.denied,
        requestedPermission: RiderLocationPermission.denied,
      ),
    );
    final forever = GeolocatorRiderLocationClient(
      gateway: _FakeGeolocatorGateway(
        checkedPermission: RiderLocationPermission.deniedForever,
      ),
    );

    expect((await denied.locate()).status, RiderLocationStatus.permissionDenied);
    expect(
      (await forever.locate()).status,
      RiderLocationStatus.permissionDeniedForever,
    );
  });

  test('returns failed when the position provider throws', () async {
    final gateway = _FakeGeolocatorGateway(positionError: Exception('gps'));
    final client = GeolocatorRiderLocationClient(gateway: gateway);

    final result = await client.locate();

    expect(result.status, RiderLocationStatus.failed);
    expect(result.location, isNull);
  });

  test('opens the matching operating system settings screen', () async {
    final gateway = _FakeGeolocatorGateway();
    final client = GeolocatorRiderLocationClient(gateway: gateway);

    await client.openSettings(RiderLocationStatus.servicesDisabled);
    await client.openSettings(RiderLocationStatus.permissionDeniedForever);

    expect(gateway.locationSettingsOpens, 1);
    expect(gateway.appSettingsOpens, 1);
  });
}

class _FakeGeolocatorGateway implements GeolocatorGateway {
  _FakeGeolocatorGateway({
    this.serviceEnabled = true,
    this.checkedPermission = RiderLocationPermission.whileInUse,
    this.requestedPermission = RiderLocationPermission.whileInUse,
    this.position = const GeolocatorPosition(
      latitude: 24.8607,
      longitude: 67.0011,
      accuracyMeters: 10,
    ),
    this.positionError,
  });

  final bool serviceEnabled;
  final RiderLocationPermission checkedPermission;
  final RiderLocationPermission requestedPermission;
  final GeolocatorPosition position;
  final Object? positionError;
  int permissionRequests = 0;
  int appSettingsOpens = 0;
  int locationSettingsOpens = 0;

  @override
  Future<RiderLocationPermission> checkPermission() async => checkedPermission;

  @override
  Future<GeolocatorPosition> getCurrentPosition() async {
    if (positionError case final error?) {
      throw error;
    }
    return position;
  }

  @override
  Future<bool> isLocationServiceEnabled() async => serviceEnabled;

  @override
  Future<bool> openAppSettings() async {
    appSettingsOpens += 1;
    return true;
  }

  @override
  Future<bool> openLocationSettings() async {
    locationSettingsOpens += 1;
    return true;
  }

  @override
  Future<RiderLocationPermission> requestPermission() async {
    permissionRequests += 1;
    return requestedPermission;
  }
}
