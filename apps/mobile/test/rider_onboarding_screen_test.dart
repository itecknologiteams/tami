import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/app/tami_mobile_app.dart';
import 'package:tami_mobile/src/auth/rider_identity_client.dart';
import 'package:tami_mobile/src/auth/rider_session.dart';

void main() {
  testWidgets('takes a rider from phone verification to the rider home', (
    tester,
  ) async {
    await tester.pumpWidget(
      TamiMobileApp(
        mode: TamiAppMode.rider,
        riderIdentityClient: FakeRiderIdentityClient(),
      ),
    );

    expect(find.text('Verify your phone'), findsOneWidget);
    await tester.enterText(find.byKey(const Key('phone-input')), '+923001234567');
    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();

    expect(find.text('Development code: 123456'), findsOneWidget);
    await tester.enterText(find.byKey(const Key('code-input')), '123456');
    await tester.tap(find.text('Verify code'));
    await tester.pumpAndSettle();

    expect(find.text('Complete your profile'), findsOneWidget);
    await tester.enterText(find.byKey(const Key('name-input')), 'Aamir');
    await tester.tap(find.text('Save profile'));
    await tester.pumpAndSettle();

    expect(find.text('Book a Tami ride'), findsOneWidget);
  });
}

class FakeRiderIdentityClient implements RiderIdentityClient {
  @override
  Future<List<RiderCity>> getActiveCities() async => const [
    RiderCity(id: 'city_karachi', name: 'Karachi'),
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
      name: name,
      email: email,
      imageUrl: imageUrl,
    );
  }
}
