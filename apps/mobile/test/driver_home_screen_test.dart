import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/app/tami_mobile_app.dart';

void main() {
  testWidgets('renders driver home screen', (tester) async {
    await tester.pumpWidget(const TamiMobileApp(mode: TamiAppMode.driver));

    expect(find.text('Tami Driver'), findsOneWidget);
    expect(find.text('Go online to receive assigned ride offers.'), findsOneWidget);
  });
}
