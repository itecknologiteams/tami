import 'package:flutter/material.dart';

import '../../auth/rider_session.dart';
import '../../realtime/realtime_client.dart';
import '../../ui/tami_glass.dart';
import '../../location/rider_location_client.dart';
import 'account/rider_account_screen.dart';
import 'rider_booking_client.dart';
import 'rider_category_client.dart';
import 'rider_chat_client.dart';
import 'rider_home_screen.dart';
import 'rider_ride_query_client.dart';
import 'rider_saved_place_client.dart';
import 'rider_pricing_client.dart';
import 'rider_place_search_client.dart';
import 'trips/rider_trips_screen.dart';

class RiderShell extends StatefulWidget {
  const RiderShell({
    required this.session,
    this.bookingClient,
    this.categoryClient,
    this.chatClient,
    this.rideQueryClient,
    this.savedPlaceClient,
    this.pricingClient,
    this.locationClient,
    this.placeSearchClient,
    this.apiBaseUrl,
    this.realtimeClient,
    super.key,
  });

  final RiderSession session;
  final RiderBookingClient? bookingClient;
  final RiderCategoryClient? categoryClient;
  final RiderChatClient? chatClient;
  final RiderRideQueryClient? rideQueryClient;
  final RiderSavedPlaceClient? savedPlaceClient;
  final RiderPricingClient? pricingClient;
  final RiderLocationClient? locationClient;
  final RiderPlaceSearchClient? placeSearchClient;
  final String? apiBaseUrl;
  final RealtimeClient? realtimeClient;

  @override
  State<RiderShell> createState() => _RiderShellState();
}

class _RiderShellState extends State<RiderShell> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      RiderHomeScreen(
        session: widget.session,
        bookingClient: widget.bookingClient,
        categoryClient: widget.categoryClient,
        chatClient: widget.chatClient,
        rideQueryClient: widget.rideQueryClient,
        savedPlaceClient: widget.savedPlaceClient,
        pricingClient: widget.pricingClient,
        placeSearchClient: widget.placeSearchClient,
        locationClient: widget.locationClient,
        apiBaseUrl: widget.apiBaseUrl,
        realtimeClient: widget.realtimeClient,
      ),
      RiderTripsScreen(
        session: widget.session,
        rideQueryClient: widget.rideQueryClient,
      ),
      RiderAccountScreen(
        session: widget.session,
        savedPlaceClient: widget.savedPlaceClient,
      ),
    ];

    return Scaffold(
      extendBody: _selectedIndex == 0,
      body: IndexedStack(index: _selectedIndex, children: pages),
      bottomNavigationBar: SafeArea(
        top: false,
        minimum: const EdgeInsets.fromLTRB(12, 0, 12, 8),
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: TamiGlass(
              key: const Key('rider-navigation-glass'),
              level: TamiGlassLevel.navigation,
              semanticLabel: 'Rider navigation',
              padding: EdgeInsets.zero,
              child: NavigationBar(
                selectedIndex: _selectedIndex,
                onDestinationSelected: (index) =>
                    setState(() => _selectedIndex = index),
                destinations: const [
                  NavigationDestination(
                    icon: Icon(Icons.local_taxi_outlined),
                    selectedIcon: Icon(Icons.local_taxi),
                    label: 'Book',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.receipt_long_outlined),
                    selectedIcon: Icon(Icons.receipt_long),
                    label: 'Trips',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.person_outline),
                    selectedIcon: Icon(Icons.person),
                    label: 'Account',
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
