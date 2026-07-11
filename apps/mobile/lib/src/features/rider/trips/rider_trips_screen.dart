import 'package:flutter/material.dart';

import '../../../ui/tami_colors.dart';

class RiderTripsScreen extends StatelessWidget {
  const RiderTripsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your trips')),
      body: const Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Upcoming',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            SizedBox(height: 12),
            Text(
              'No scheduled rides',
              style: TextStyle(color: TamiColors.mutedInk),
            ),
            Divider(height: 48),
            Text(
              'Past trips',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            SizedBox(height: 12),
            Text(
              'Completed rides will appear here.',
              style: TextStyle(color: TamiColors.mutedInk),
            ),
          ],
        ),
      ),
    );
  }
}
