import 'package:flutter/material.dart';

import '../../ui/tami_glass.dart';
import 'driver_session.dart';

class DriverAccountScreen extends StatelessWidget {
  const DriverAccountScreen({required this.session, super.key});

  final DriverSession session;

  @override
  Widget build(BuildContext context) {
    final driver = session.driver;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text('Account', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 16),
            TamiGlass(
              semanticLabel: 'Driver identity',
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    driver.name,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text('Phone: ${driver.phone}'),
                  Text('Duty city: ${driver.cityName}'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              key: const Key('driver-sign-out'),
              onPressed: () {
                Navigator.of(context).popUntil((route) => route.isFirst);
              },
              icon: const Icon(Icons.logout),
              label: const Text('Sign out'),
            ),
            const SizedBox(height: 8),
            const Text(
              'Signing out returns to phone verification. Duty status stays '
              'until you go offline.',
              style: TextStyle(fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
