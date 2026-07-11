import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/auth/rider_session.dart';
import 'package:tami_mobile/src/features/rider/rider_shell.dart';

void main() {
  testWidgets('switches between booking, trips, and account', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: RiderShell(
          session: const RiderSession(
            accessToken: 'rider-session-token',
            rider: RiderProfile(
              id: 'rider_123',
              phone: '+923001234567',
              cityId: 'city_karachi',
              name: 'Aamir Khan',
              email: 'aamir@example.com',
              imageUrl: null,
            ),
          ),
        ),
      ),
    );

    expect(find.text('Where to?'), findsOneWidget);
    await tester.tap(find.text('Trips'));
    await tester.pumpAndSettle();
    expect(find.text('Your trips'), findsOneWidget);

    await tester.tap(find.text('Account'));
    await tester.pumpAndSettle();
    expect(find.text('Aamir Khan'), findsOneWidget);
    expect(find.text('Saved places'), findsOneWidget);
  });
}
