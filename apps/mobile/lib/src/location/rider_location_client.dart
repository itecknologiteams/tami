import 'rider_location.dart';

abstract interface class RiderLocationClient {
  Future<RiderLocationResult> locate();

  Future<void> openSettings(RiderLocationStatus status);
}
