import 'package:flutter/material.dart';

import '../../../auth/rider_session.dart';
import '../../../ui/tami_colors.dart';
import '../rider_ride_query_client.dart';

class RiderRideDetailScreen extends StatefulWidget {
  const RiderRideDetailScreen({
    required this.session,
    required this.rideQueryClient,
    required this.rideId,
    super.key,
  });

  final RiderSession session;
  final RiderRideQueryClient rideQueryClient;
  final String rideId;

  @override
  State<RiderRideDetailScreen> createState() => _RiderRideDetailScreenState();
}

class _RiderRideDetailScreenState extends State<RiderRideDetailScreen> {
  late Future<RiderRide> _ride;

  @override
  void initState() {
    super.initState();
    _ride = _load();
  }

  Future<RiderRide> _load() => widget.rideQueryClient.getRide(
    accessToken: widget.session.accessToken,
    rideId: widget.rideId,
  );

  void _retry() => setState(() => _ride = _load());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Trip details')),
      body: FutureBuilder<RiderRide>(
        future: _ride,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: OutlinedButton.icon(
                onPressed: _retry,
                icon: const Icon(Icons.refresh),
                label: const Text('Try again'),
              ),
            );
          }
          final ride = snapshot.data;
          if (ride == null) {
            return const Center(child: CircularProgressIndicator());
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
            children: [
              Text(
                _label(ride.state),
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: TamiColors.deepGreen,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _label(ride.categoryCode),
                style: const TextStyle(color: TamiColors.mutedInk),
              ),
              const Divider(height: 40),
              _LocationRow(
                icon: Icons.trip_origin,
                label: 'Pickup',
                address: ride.pickup.address,
              ),
              const SizedBox(height: 24),
              _LocationRow(
                icon: Icons.location_on_outlined,
                label: 'Destination',
                address: ride.destination.address,
              ),
              const Divider(height: 40),
              _DetailRow(
                label: ride.scheduledPickupAt == null
                    ? 'Requested'
                    : 'Scheduled',
                value: _formatTimestamp(
                  ride.scheduledPickupAt ?? ride.requestedAt,
                ),
              ),
              if (ride.estimatedFareMinor != null)
                _DetailRow(
                  label: 'Estimated fare',
                  value: _formatFare(
                    ride.estimatedFareMinor!,
                    ride.currency ?? 'PKR',
                  ),
                ),
              if (ride.paymentMethod != null)
                _DetailRow(
                  label: 'Payment',
                  value: _label(ride.paymentMethod!),
                ),
              if (ride.farePolicyVersion != null)
                _DetailRow(
                  label: 'Fare policy',
                  value: 'Policy version ${ride.farePolicyVersion}',
                ),
              _DetailRow(label: 'Ride ID', value: ride.id),
            ],
          );
        },
      ),
    );
  }
}

class _LocationRow extends StatelessWidget {
  const _LocationRow({
    required this.icon,
    required this.label,
    required this.address,
  });

  final IconData icon;
  final String label;
  final String address;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: TamiColors.civicGreen),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text(address),
            ],
          ),
        ),
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: const TextStyle(color: TamiColors.mutedInk),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

String _label(String value) {
  final words = value.split('_');
  return words
      .map(
        (word) => word.isEmpty
            ? word
            : '${word[0].toUpperCase()}${word.substring(1)}',
      )
      .join(' ');
}

String _formatTimestamp(String value) {
  final timestamp = DateTime.tryParse(value)?.toLocal();
  if (timestamp == null) {
    return value;
  }
  return '${timestamp.day.toString().padLeft(2, '0')}/'
      '${timestamp.month.toString().padLeft(2, '0')}/${timestamp.year} '
      '${timestamp.hour.toString().padLeft(2, '0')}:'
      '${timestamp.minute.toString().padLeft(2, '0')}';
}

String _formatFare(int amountMinor, String currency) {
  return '$currency ${(amountMinor / 100).toStringAsFixed(2)}';
}
