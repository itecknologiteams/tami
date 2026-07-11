import 'package:flutter/material.dart';

import '../../auth/rider_session.dart';
import 'rider_booking_client.dart';
import 'rider_chat_client.dart';
import 'rider_home_screen.dart';

class RiderShell extends StatefulWidget {
  const RiderShell({
    required this.session,
    this.bookingClient,
    this.chatClient,
    super.key,
  });

  final RiderSession session;
  final RiderBookingClient? bookingClient;
  final RiderChatClient? chatClient;

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
        chatClient: widget.chatClient,
      ),
      const _TripsScreen(),
      _AccountScreen(rider: widget.session.rider),
    ];

    return Scaffold(
      body: IndexedStack(index: _selectedIndex, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) => setState(() => _selectedIndex = index),
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
    );
  }
}

class _TripsScreen extends StatelessWidget {
  const _TripsScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your trips')),
      body: const Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Upcoming', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            SizedBox(height: 12),
            Text('No scheduled rides'),
            Divider(height: 48),
            Text('Past trips', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            SizedBox(height: 12),
            Text('Completed rides will appear here.'),
          ],
        ),
      ),
    );
  }
}

class _AccountScreen extends StatelessWidget {
  const _AccountScreen({required this.rider});

  final RiderProfile rider;

  @override
  Widget build(BuildContext context) {
    final initial = (rider.name?.trim().isNotEmpty ?? false)
        ? rider.name!.trim().substring(0, 1).toUpperCase()
        : 'T';
    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 12),
        children: [
          ListTile(
            leading: CircleAvatar(
              backgroundColor: const Color(0xFFE4EFEA),
              foregroundColor: const Color(0xFF006C5B),
              backgroundImage: rider.imageUrl == null
                  ? null
                  : NetworkImage(rider.imageUrl!),
              child: rider.imageUrl == null ? Text(initial) : null,
            ),
            title: Text(
              rider.name?.trim().isNotEmpty ?? false ? rider.name! : rider.phone,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            subtitle: Text(rider.phone),
            trailing: const Icon(Icons.chevron_right),
          ),
          const Divider(height: 32),
          const _AccountRow(icon: Icons.bookmark_outline, label: 'Saved places'),
          const _AccountRow(icon: Icons.account_balance_wallet_outlined, label: 'Payment methods'),
          const _AccountRow(icon: Icons.shield_outlined, label: 'Safety and support'),
          const _AccountRow(icon: Icons.settings_outlined, label: 'Settings'),
        ],
      ),
    );
  }
}

class _AccountRow extends StatelessWidget {
  const _AccountRow({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(label),
      trailing: const Icon(Icons.chevron_right),
      onTap: () {},
    );
  }
}
