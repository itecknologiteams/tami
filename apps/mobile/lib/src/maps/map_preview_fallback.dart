import 'package:flutter/material.dart';

import '../ui/tami_colors.dart';
import 'tami_map_view_state.dart';

class MapPreviewFallback extends StatelessWidget {
  const MapPreviewFallback({
    this.viewState = const TamiMapViewState(),
    super.key,
  });

  final TamiMapViewState viewState;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Size(constraints.maxWidth, constraints.maxHeight);
        return Stack(
          children: [
            Positioned.fill(
              child: CustomPaint(
                key: viewState.hasRoute ? const Key('map-road-route') : null,
                painter: MapPreviewPainter(viewState),
              ),
            ),
            if (viewState.pickup case final pickup?)
              _MapMarker(
                key: const Key('map-pickup-marker'),
                position: _project(pickup, viewState, size),
                color: TamiColors.routeCyan,
                icon: Icons.my_location,
              ),
            if (viewState.destination case final destination?)
              _MapMarker(
                key: const Key('map-destination-marker'),
                position: _project(destination, viewState, size),
                color: TamiColors.civicGreen,
                icon: Icons.location_on,
              ),
          ],
        );
      },
    );
  }
}

class _MapMarker extends StatelessWidget {
  const _MapMarker({
    required this.position,
    required this.color,
    required this.icon,
    super.key,
  });

  final Offset position;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    const dimension = 36.0;
    return Positioned(
      left: position.dx - dimension / 2,
      top: position.dy - dimension / 2,
      width: dimension,
      height: dimension,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 3),
          boxShadow: const [
            BoxShadow(
              color: Color(0x33000000),
              blurRadius: 8,
              offset: Offset(0, 3),
            ),
          ],
        ),
        child: Icon(icon, color: Colors.white, size: 19),
      ),
    );
  }
}

class MapPreviewPainter extends CustomPainter {
  const MapPreviewPainter(this.viewState);

  final TamiMapViewState viewState;

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
      ..cubicTo(
        size.width * .58,
        size.height * .25,
        size.width * .92,
        size.height * .52,
        size.width * .7,
        size.height,
      )
      ..lineTo(size.width, size.height)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(waterPath, water);

    for (var index = -1; index < 7; index++) {
      final offset = index * 96.0;
      canvas.drawLine(
        Offset(offset, 0),
        Offset(offset + 260, size.height),
        minorRoad,
      );
      canvas.drawLine(
        Offset(0, offset + 80),
        Offset(size.width, offset + 210),
        minorRoad,
      );
    }

    final route = Path()
      ..moveTo(-20, size.height * .72)
      ..cubicTo(
        size.width * .25,
        size.height * .5,
        size.width * .45,
        size.height * .78,
        size.width + 20,
        size.height * .28,
      );
    canvas.drawPath(route, majorRoad);

    if (viewState.hasRoute) {
      final roadRoute = Path();
      for (var index = 0; index < viewState.routeCoordinates.length; index++) {
        final point = _project(
          viewState.routeCoordinates[index],
          viewState,
          size,
        );
        if (index == 0) {
          roadRoute.moveTo(point.dx, point.dy);
        } else {
          roadRoute.lineTo(point.dx, point.dy);
        }
      }
      canvas.drawPath(
        roadRoute,
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.stroke
          ..strokeWidth = 10
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round,
      );
      canvas.drawPath(
        roadRoute,
        Paint()
          ..color = TamiColors.routeCyan
          ..style = PaintingStyle.stroke
          ..strokeWidth = 6
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round,
      );
    }
  }

  @override
  bool shouldRepaint(covariant MapPreviewPainter oldDelegate) =>
      oldDelegate.viewState != viewState;
}

Offset _project(
  TamiMapCoordinate coordinate,
  TamiMapViewState viewState,
  Size size,
) {
  final bounds = viewState.bounds;
  if (bounds == null || size.isEmpty) {
    return Offset(size.width / 2, size.height / 2);
  }
  const padding = 44.0;
  final drawableWidth = (size.width - padding * 2).clamp(1.0, double.infinity);
  final drawableHeight = (size.height - padding * 2).clamp(
    1.0,
    double.infinity,
  );
  final longitudeSpan = bounds.longitudeEast - bounds.longitudeWest;
  final latitudeSpan = bounds.latitudeNorth - bounds.latitudeSouth;
  final xRatio = longitudeSpan.abs() < 0.000001
      ? 0.5
      : (coordinate.longitude - bounds.longitudeWest) / longitudeSpan;
  final yRatio = latitudeSpan.abs() < 0.000001
      ? 0.5
      : (bounds.latitudeNorth - coordinate.latitude) / latitudeSpan;
  return Offset(
    padding + xRatio * drawableWidth,
    padding + yRatio * drawableHeight,
  );
}
