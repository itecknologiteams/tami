import 'package:flutter/material.dart';

import '../auth/rider_identity_client.dart';
import '../auth/rider_onboarding_screen.dart';
import '../features/driver/driver_home_screen.dart';

enum TamiAppMode { rider, driver }

class TamiMobileApp extends StatelessWidget {
  const TamiMobileApp({
    required this.mode,
    this.riderIdentityClient,
    super.key,
  });

  final TamiAppMode mode;
  final RiderIdentityClient? riderIdentityClient;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: mode == TamiAppMode.rider ? 'Tami Rider' : 'Tami Driver',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF007A5E)),
        useMaterial3: true,
      ),
      home: switch (mode) {
        TamiAppMode.rider => RiderOnboardingScreen(
          client:
              riderIdentityClient ??
              HttpRiderIdentityClient(
                baseUrl: const String.fromEnvironment(
                  'TAMI_API_BASE_URL',
                  defaultValue: 'http://10.0.2.2:4000',
                ),
              ),
        ),
        TamiAppMode.driver => const DriverHomeScreen(),
      },
    );
  }
}
