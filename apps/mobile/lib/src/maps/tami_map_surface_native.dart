import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:maplibre/maplibre.dart';

import 'map_config.dart';
import 'map_preview_fallback.dart';

class TamiMapSurface extends StatelessWidget {
  const TamiMapSurface({super.key});

  @override
  Widget build(BuildContext context) {
    if (!Platform.isAndroid && !Platform.isIOS) {
      return const MapPreviewFallback();
    }

    return MapLibreMap(
      options: MapOptions(
        initStyle: tamiMapConfig.styleUrl,
        initZoom: tamiMapConfig.defaultZoom,
        initCenter: Geographic(
          lon: tamiMapConfig.defaultLongitude,
          lat: tamiMapConfig.defaultLatitude,
        ),
      ),
    );
  }
}
