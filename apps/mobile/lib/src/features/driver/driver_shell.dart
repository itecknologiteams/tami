import 'package:flutter/material.dart';

import '../../location/rider_location_client.dart';
import '../../realtime/realtime_client.dart';
import '../rider/rider_chat_client.dart';
import 'driver_account_screen.dart';
import 'driver_earnings_screen.dart';
import 'driver_home_screen.dart';
import 'driver_ride_client.dart';
import 'driver_session.dart';

class DriverShell extends StatefulWidget {
  const DriverShell({
    required this.session,
    required this.rideClient,
    this.chatClient,
    this.locationClient,
    this.apiBaseUrl,
    this.realtimeClient,
    this.pollInterval = const Duration(seconds: 15),
    super.key,
  });

  final DriverSession session;
  final DriverRideClient rideClient;
  final RiderChatClient? chatClient;
  final RiderLocationClient? locationClient;
  final String? apiBaseUrl;
  final RealtimeClient? realtimeClient;
  final Duration pollInterval;

  @override
  State<DriverShell> createState() => _DriverShellState();
}

class _DriverShellState extends State<DriverShell> {
  int _selectedIndex = 0;
  int _earningsVisit = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      DriverHomeScreen(
        session: widget.session,
        rideClient: widget.rideClient,
        chatClient: widget.chatClient,
        locationClient: widget.locationClient,
        apiBaseUrl: widget.apiBaseUrl,
        pollInterval: widget.pollInterval,
        realtimeClient: widget.realtimeClient,
      ),
      // Recreated per visit so totals reflect rides finished since mount.
      DriverEarningsScreen(
        key: ValueKey('driver-earnings-visit-$_earningsVisit'),
        session: widget.session,
        rideClient: widget.rideClient,
      ),
      DriverAccountScreen(session: widget.session),
    ];

    return Scaffold(
      body: IndexedStack(index: _selectedIndex, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() {
            if (index == 1 && _selectedIndex != 1) {
              _earningsVisit += 1;
            }
            _selectedIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            key: Key('driver-tab-duty'),
            icon: Icon(Icons.electric_car_outlined),
            selectedIcon: Icon(Icons.electric_car),
            label: 'Duty',
          ),
          NavigationDestination(
            key: Key('driver-tab-earnings'),
            icon: Icon(Icons.payments_outlined),
            selectedIcon: Icon(Icons.payments),
            label: 'Earnings',
          ),
          NavigationDestination(
            key: Key('driver-tab-account'),
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Account',
          ),
        ],
      ),
    );
  }
}
