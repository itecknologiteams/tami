import 'package:flutter/material.dart';

import '../../../auth/rider_session.dart';
import '../../../ui/tami_colors.dart';

class RiderAccountScreen extends StatelessWidget {
  const RiderAccountScreen({required this.rider, super.key});

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
            minTileHeight: 72,
            leading: CircleAvatar(
              backgroundColor: TamiColors.mist,
              foregroundColor: TamiColors.civicGreen,
              backgroundImage: rider.imageUrl == null
                  ? null
                  : NetworkImage(rider.imageUrl!),
              child: rider.imageUrl == null ? Text(initial) : null,
            ),
            title: Text(
              rider.name?.trim().isNotEmpty ?? false
                  ? rider.name!
                  : rider.phone,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            subtitle: Text(rider.phone),
            trailing: const Icon(Icons.chevron_right),
          ),
          const Divider(height: 32),
          const _AccountRow(
            icon: Icons.bookmark_outline,
            label: 'Saved places',
          ),
          const _AccountRow(
            icon: Icons.account_balance_wallet_outlined,
            label: 'Payment methods',
          ),
          const _AccountRow(
            icon: Icons.shield_outlined,
            label: 'Safety and support',
          ),
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
      minTileHeight: 56,
      leading: Icon(icon),
      title: Text(label),
      trailing: const Icon(Icons.chevron_right),
      onTap: () {},
    );
  }
}
