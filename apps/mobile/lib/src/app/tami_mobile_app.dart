import 'package:flutter/material.dart';

import '../auth/rider_identity_client.dart';
import '../auth/rider_onboarding_screen.dart';
import '../features/driver/driver_home_screen.dart';
import '../features/rider/rider_booking_client.dart';
import '../features/rider/rider_category_client.dart';
import '../features/rider/rider_chat_client.dart';
import '../features/rider/rider_ride_query_client.dart';
import '../features/rider/rider_saved_place_client.dart';
import '../features/rider/rider_pricing_client.dart';
import '../features/rider/rider_place_search_client.dart';
import '../location/geolocator_rider_location_client.dart';
import '../location/rider_location_client.dart';
import '../ui/tami_theme.dart';

enum TamiAppMode { rider, driver }

class TamiMobileApp extends StatelessWidget {
  const TamiMobileApp({
    required this.mode,
    this.riderIdentityClient,
    this.riderBookingClient,
    this.riderCategoryClient,
    this.riderChatClient,
    this.riderRideQueryClient,
    this.riderSavedPlaceClient,
    this.riderPricingClient,
    this.riderLocationClient,
    this.riderPlaceSearchClient,
    super.key,
  });

  final TamiAppMode mode;
  final RiderIdentityClient? riderIdentityClient;
  final RiderBookingClient? riderBookingClient;
  final RiderCategoryClient? riderCategoryClient;
  final RiderChatClient? riderChatClient;
  final RiderRideQueryClient? riderRideQueryClient;
  final RiderSavedPlaceClient? riderSavedPlaceClient;
  final RiderPricingClient? riderPricingClient;
  final RiderLocationClient? riderLocationClient;
  final RiderPlaceSearchClient? riderPlaceSearchClient;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: mode == TamiAppMode.rider ? 'Tami Rider' : 'Tami Driver',
      theme: buildTamiTheme(),
      home: switch (mode) {
        TamiAppMode.rider => RiderOnboardingScreen(
          client:
              riderIdentityClient ??
              HttpRiderIdentityClient(baseUrl: _apiBaseUrl),
          bookingClient:
              riderBookingClient ??
              HttpRiderBookingClient(baseUrl: _apiBaseUrl),
          categoryClient:
              riderCategoryClient ??
              HttpRiderCategoryClient(baseUrl: _apiBaseUrl),
          chatClient:
              riderChatClient ?? HttpRiderChatClient(baseUrl: _apiBaseUrl),
          rideQueryClient:
              riderRideQueryClient ??
              HttpRiderRideQueryClient(baseUrl: _apiBaseUrl),
          savedPlaceClient:
              riderSavedPlaceClient ??
              HttpRiderSavedPlaceClient(baseUrl: _apiBaseUrl),
          pricingClient:
              riderPricingClient ??
              HttpRiderPricingClient(baseUrl: _apiBaseUrl),
          locationClient:
              riderLocationClient ?? GeolocatorRiderLocationClient(),
          placeSearchClient:
              riderPlaceSearchClient ??
              HttpRiderPlaceSearchClient(baseUrl: _apiBaseUrl),
        ),
        TamiAppMode.driver => const DriverHomeScreen(),
      },
    );
  }

  static const _apiBaseUrl = String.fromEnvironment(
    'TAMI_API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000',
  );
}
