import 'package:flutter/material.dart';

import '../../../ui/tami_colors.dart';
import '../../../ui/tami_glass.dart';
import '../../../location/rider_location.dart';
import 'tami_place.dart';

class BookingComposer extends StatelessWidget {
  const BookingComposer({
    required this.destination,
    required this.pickup,
    required this.pickupStatus,
    required this.isLocatingPickup,
    required this.onPickupTap,
    required this.onDestinationTap,
    this.onPickupRetry,
    this.onPickupSettings,
    super.key,
  });

  final TamiPlace? destination;
  final TamiPlace? pickup;
  final RiderLocationStatus pickupStatus;
  final bool isLocatingPickup;
  final VoidCallback onPickupTap;
  final VoidCallback onDestinationTap;
  final VoidCallback? onPickupRetry;
  final VoidCallback? onPickupSettings;

  @override
  Widget build(BuildContext context) {
    return TamiGlass(
      key: const Key('rider-booking-glass'),
      level: TamiGlassLevel.action,
      semanticLabel: 'Book a ride',
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 42,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFB8CCC5),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),
          InkWell(
            key: const Key('pickup-trigger'),
            onTap: onPickupTap,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: _PickupRow(
                pickup: pickup,
                status: pickupStatus,
                isLocating: isLocatingPickup,
                onRetry: onPickupRetry,
                onSettings: onPickupSettings,
              ),
            ),
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
                accent: TamiColors.signalYellow,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PickupRow extends StatelessWidget {
  const _PickupRow({
    required this.pickup,
    required this.status,
    required this.isLocating,
    this.onRetry,
    this.onSettings,
  });

  final TamiPlace? pickup;
  final RiderLocationStatus status;
  final bool isLocating;
  final VoidCallback? onRetry;
  final VoidCallback? onSettings;

  @override
  Widget build(BuildContext context) {
    final (title, subtitle) = _copy;
    final settingsAvailable =
        status == RiderLocationStatus.servicesDisabled ||
        status == RiderLocationStatus.permissionDeniedForever;
    return _LocationRow(
      icon: isLocating ? Icons.location_searching : Icons.my_location,
      title: title,
      subtitle: subtitle,
      accent: TamiColors.routeCyan,
      trailing: isLocating
          ? const SizedBox.square(
              dimension: 22,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : settingsAvailable
          ? IconButton(
              tooltip: 'Open location settings',
              onPressed: onSettings,
              icon: const Icon(Icons.settings_outlined),
            )
          : status == RiderLocationStatus.failed ||
                status == RiderLocationStatus.permissionDenied
          ? IconButton(
              tooltip: 'Retry current location',
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
            )
          : const Icon(Icons.chevron_right),
    );
  }

  (String, String) get _copy {
    if (isLocating) {
      return ('Finding your pickup', 'Getting your current location');
    }
    if (status == RiderLocationStatus.ready && pickup != null) {
      return (pickup!.name, pickup!.address);
    }
    return switch (status) {
      RiderLocationStatus.servicesDisabled =>
        ('Choose pickup', 'Location services are off'),
      RiderLocationStatus.permissionDenied =>
        ('Choose pickup', 'Location permission is off'),
      RiderLocationStatus.permissionDeniedForever =>
        ('Choose pickup', 'Location access is blocked'),
      RiderLocationStatus.failed =>
        ('Choose pickup', 'Current location is unavailable'),
      RiderLocationStatus.ready => ('Choose pickup', 'Select a pickup point'),
    };
  }
}

class _LocationRow extends StatelessWidget {
  const _LocationRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.accent,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color accent;
  final Widget? trailing;

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
        trailing ?? const Icon(Icons.chevron_right),
      ],
    );
  }
}
