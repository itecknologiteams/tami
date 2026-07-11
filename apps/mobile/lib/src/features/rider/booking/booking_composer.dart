import 'package:flutter/material.dart';

import 'tami_place.dart';

class BookingComposer extends StatelessWidget {
  const BookingComposer({
    required this.destination,
    required this.onDestinationTap,
    super.key,
  });

  final TamiPlace? destination;
  final VoidCallback onDestinationTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      elevation: 12,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFD5E2DC),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            const _LocationRow(
              icon: Icons.my_location,
              title: 'Current location',
              subtitle: 'Use your pickup point',
              accent: Color(0xFF006C5B),
            ),
            const Divider(height: 24),
            InkWell(
              key: const Key('destination-trigger'),
              onTap: onDestinationTap,
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: _LocationRow(
                  icon: Icons.search,
                  title: destination?.name ?? 'Where to?',
                  subtitle:
                      destination?.address ??
                      'Search a place or choose a saved address',
                  accent: const Color(0xFFF2BC3D),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LocationRow extends StatelessWidget {
  const _LocationRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.accent,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
          child: Icon(icon, color: const Color(0xFF18302B), size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(color: Color(0xFF55716A), fontSize: 13),
              ),
            ],
          ),
        ),
        const Icon(Icons.chevron_right),
      ],
    );
  }
}
