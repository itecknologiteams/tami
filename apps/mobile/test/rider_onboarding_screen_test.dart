import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/app/tami_mobile_app.dart';
import 'package:tami_mobile/src/auth/rider_identity_client.dart';
import 'package:tami_mobile/src/auth/rider_onboarding_screen.dart';
import 'package:tami_mobile/src/auth/rider_session.dart';
import 'package:tami_mobile/src/location/rider_location.dart';
import 'package:tami_mobile/src/location/rider_location_client.dart';
import 'package:tami_mobile/src/ui/tami_theme.dart';

void main() {
  testWidgets('takes a rider from phone verification to the rider home', (
    tester,
  ) async {
    await tester.pumpWidget(
      TamiMobileApp(
        mode: TamiAppMode.rider,
        riderIdentityClient: FakeRiderIdentityClient(),
        riderLocationClient: _DeniedRiderLocationClient(),
      ),
    );

    expect(find.text('Verify your phone'), findsOneWidget);
    expect(find.byKey(const Key('onboarding-step-glass')), findsOneWidget);
    expect(find.byKey(const Key('onboarding-route-ribbon')), findsOneWidget);
    await tester.enterText(
      find.byKey(const Key('phone-input')),
      '+923001234567',
    );
    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();

    expect(find.text('Development code: 123456'), findsOneWidget);
    await tester.tap(find.byType(DropdownButtonFormField<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Hyderabad').last);
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('code-input')), '123456');
    await tester.tap(find.text('Verify code'));
    await tester.pumpAndSettle();

    expect(find.text('Complete your profile'), findsOneWidget);
    await tester.enterText(find.byKey(const Key('name-input')), 'Aamir');
    await tester.tap(find.text('Save profile'));
    await tester.pumpAndSettle();

    expect(find.text('Where to?'), findsOneWidget);
    expect(find.text('Hyderabad'), findsOneWidget);
  });

  testWidgets('keeps onboarding usable at two hundred percent text scale', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildTamiTheme(),
        home: MediaQuery(
          data: const MediaQueryData(
            size: Size(390, 844),
            textScaler: TextScaler.linear(2),
          ),
          child: RiderOnboardingScreen(client: FakeRiderIdentityClient()),
        ),
      ),
    );

    expect(find.text('Send code'), findsOneWidget);
    await tester.drag(find.byType(ListView), const Offset(0, -320));
    await tester.pump();
    expect(find.byKey(const Key('phone-input')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

class FakeRiderIdentityClient implements RiderIdentityClient {
  @override
  Future<List<RiderCity>> getActiveCities() async => const [
    RiderCity(id: 'city_karachi', name: 'Karachi'),
    RiderCity(id: 'city_hyderabad', name: 'Hyderabad'),
  ];

  @override
  Future<DevelopmentOtpChallenge> requestOtp(String phone) async {
    return const DevelopmentOtpChallenge(
      challengeId: 'challenge_123',
      developmentCode: '123456',
      expiresAt: '2026-07-10T10:05:00.000Z',
    );
  }

  @override
  Future<RiderSession> verifyOtp({
    required String challengeId,
    required String code,
    required String cityId,
  }) async {
    return const RiderSession(
      accessToken: 'session-token',
      rider: RiderProfile(
        id: 'rider_123',
        phone: '+923001234567',
        cityId: 'city_karachi',
        cityName: 'Karachi',
        name: null,
        email: null,
        imageUrl: null,
      ),
    );
  }

  @override
  Future<RiderProfile> updateProfile({
    required String accessToken,
    required String cityId,
    required String name,
    String? email,
    String? imageUrl,
  }) async {
    return RiderProfile(
      id: 'rider_123',
      phone: '+923001234567',
      cityId: cityId,
      cityName: cityId == 'city_hyderabad' ? 'Hyderabad' : 'Karachi',
      name: name,
      email: email,
      imageUrl: imageUrl,
    );
  }
}

class _DeniedRiderLocationClient implements RiderLocationClient {
  @override
  Future<RiderLocationResult> locate() async =>
      const RiderLocationResult.unavailable(
        RiderLocationStatus.permissionDenied,
      );

  @override
  Future<void> openSettings(RiderLocationStatus status) async {}
}
