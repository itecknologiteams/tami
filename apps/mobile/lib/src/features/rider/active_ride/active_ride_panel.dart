import 'package:flutter/material.dart';

import '../booking/tami_place.dart';

class ActiveRidePanel extends StatelessWidget {
  const ActiveRidePanel({
    required this.destination,
    required this.rideState,
    required this.onCancel,
    required this.onChat,
    super.key,
  });

  final TamiPlace destination;
  final String rideState;
  final VoidCallback onCancel;
  final VoidCallback? onChat;

  bool get _chatAvailable => {
    'accepted',
    'driver_en_route_to_pickup',
    'arrived_at_pickup',
    'rider_onboarded',
    'in_progress',
    'arrived_at_destination',
    'payment_pending',
  }.contains(rideState);

  String get _heading {
    return switch (rideState) {
      'accepted' => 'Driver accepted your ride',
      'driver_en_route_to_pickup' => 'Driver is on the way',
      'arrived_at_pickup' => 'Driver has arrived',
      'rider_onboarded' || 'in_progress' => 'Ride in progress',
      'arrived_at_destination' => 'Arrived at destination',
      'payment_pending' => 'Payment pending',
      _ => 'Finding your driver',
    };
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      elevation: 12,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _chatAvailable
                      ? Icons.local_taxi_outlined
                      : Icons.radar_outlined,
                  color: const Color(0xFF006C5B),
                ),
                const SizedBox(width: 10),
                Text(
                  _heading,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              'Ride requested to ${destination.name}',
              style: const TextStyle(color: Color(0xFF55716A)),
            ),
            const SizedBox(height: 14),
            if (!_chatAvailable)
              const LinearProgressIndicator(color: Color(0xFFF2BC3D)),
            const SizedBox(height: 16),
            if (_chatAvailable)
              OutlinedButton.icon(
                onPressed: onChat,
                icon: const Icon(Icons.chat_bubble_outline),
                label: const Text('Chat with driver'),
              ),
            if (_chatAvailable) const SizedBox(height: 8),
            OutlinedButton(
              onPressed: onCancel,
              child: const Text('Cancel ride'),
            ),
          ],
        ),
      ),
    );
  }
}
