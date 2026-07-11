import 'package:flutter/material.dart';

class MapPreviewFallback extends StatelessWidget {
  const MapPreviewFallback({super.key});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _MapPreviewPainter(),
      child: const SizedBox.expand(),
    );
  }
}

class _MapPreviewPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = const Color(0xFFE5EFE9),
    );

    final minorRoad = Paint()
      ..color = const Color(0xFFCBDDD4)
      ..strokeWidth = 18
      ..strokeCap = StrokeCap.round;
    final majorRoad = Paint()
      ..color = const Color(0xFFF8FBF8)
      ..strokeWidth = 38
      ..strokeCap = StrokeCap.round;
    final water = Paint()..color = const Color(0xFFC7E4E7);

    final waterPath = Path()
      ..moveTo(size.width * .72, 0)
      ..cubicTo(size.width * .58, size.height * .25, size.width * .92,
          size.height * .52, size.width * .7, size.height)
      ..lineTo(size.width, size.height)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(waterPath, water);

    for (var index = -1; index < 7; index++) {
      final offset = index * 96.0;
      canvas.drawLine(Offset(offset, 0), Offset(offset + 260, size.height), minorRoad);
      canvas.drawLine(Offset(0, offset + 80), Offset(size.width, offset + 210), minorRoad);
    }

    final route = Path()
      ..moveTo(-20, size.height * .72)
      ..cubicTo(size.width * .25, size.height * .5, size.width * .45,
          size.height * .78, size.width + 20, size.height * .28);
    canvas.drawPath(route, majorRoad);
  }

  @override
  bool shouldRepaint(covariant _MapPreviewPainter oldDelegate) => false;
}
