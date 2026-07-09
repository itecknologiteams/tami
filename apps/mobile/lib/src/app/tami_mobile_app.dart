import 'package:flutter/material.dart';

import '../features/driver/driver_home_screen.dart';
import '../features/rider/rider_home_screen.dart';

enum TamiAppMode {
  rider,
  driver,
}

class TamiMobileApp extends StatelessWidget {
  const TamiMobileApp({
    required this.mode,
    super.key,
  });

  final TamiAppMode mode;

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
        TamiAppMode.rider => const RiderHomeScreen(),
        TamiAppMode.driver => const DriverHomeScreen(),
      },
    );
  }
}
