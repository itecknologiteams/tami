import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:maplibre/maplibre.dart';

import 'map_config.dart';
import 'map_preview_fallback.dart';
import 'tami_map_view_state.dart';

class TamiMapSurface extends StatefulWidget {
  const TamiMapSurface({this.viewState = const TamiMapViewState(), super.key});

  final TamiMapViewState viewState;

  @override
  State<TamiMapSurface> createState() => _TamiMapSurfaceState();
}

class _TamiMapSurfaceState extends State<TamiMapSurface> {
  MapController? _controller;

  @override
  void didUpdateWidget(covariant TamiMapSurface oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.viewState != widget.viewState) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _fitCamera());
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!Platform.isAndroid && !Platform.isIOS) {
      return MapPreviewFallback(viewState: widget.viewState);
    }

    final center = widget.viewState.cameraCenter;
    return Stack(
      children: [
        Positioned.fill(
          child: MapLibreMap(
            options: MapOptions(
              initStyle: tamiMapConfig.styleUrl,
              initZoom: widget.viewState.bounds == null
                  ? tamiMapConfig.defaultZoom
                  : 14,
              initCenter: Geographic(
                lon: center.longitude,
                lat: center.latitude,
              ),
            ),
            layers: _layers,
            onMapCreated: (controller) {
              _controller = controller;
              WidgetsBinding.instance.addPostFrameCallback((_) => _fitCamera());
            },
          ),
        ),
        Positioned(
          right: 18,
          bottom: 250,
          child: Material(
            color: Colors.white.withValues(alpha: 0.92),
            elevation: 3,
            shape: const CircleBorder(),
            child: IconButton(
              tooltip: 'Recenter map',
              onPressed: _fitCamera,
              icon: const Icon(Icons.my_location),
            ),
          ),
        ),
      ],
    );
  }

  List<Layer> get _layers => [
    if (widget.viewState.hasRoute)
      PolylineLayer(
        polylines: [
          Feature(
            geometry: LineString.from(
              widget.viewState.routeCoordinates
                  .map(
                    (coordinate) => Geographic(
                      lon: coordinate.longitude,
                      lat: coordinate.latitude,
                    ),
                  )
                  .toList(),
            ),
          ),
        ],
        color: const Color(0xFF006D77),
        width: 6,
      ),
    if (widget.viewState.pickup case final pickup?)
      CircleLayer(
        points: [
          Feature(
            geometry: Point(
              Geographic(lon: pickup.longitude, lat: pickup.latitude),
            ),
          ),
        ],
        radius: 9,
        color: const Color(0xFF00A7B5),
        strokeWidth: 3,
        strokeColor: Colors.white,
      ),
    if (widget.viewState.destination case final destination?)
      CircleLayer(
        points: [
          Feature(
            geometry: Point(
              Geographic(lon: destination.longitude, lat: destination.latitude),
            ),
          ),
        ],
        radius: 9,
        color: const Color(0xFF006C5B),
        strokeWidth: 3,
        strokeColor: Colors.white,
      ),
  ];

  Future<void> _fitCamera() async {
    final controller = _controller;
    final bounds = widget.viewState.bounds;
    if (controller == null || bounds == null) {
      return;
    }
    final hasArea =
        (bounds.latitudeNorth - bounds.latitudeSouth).abs() > 0.000001 ||
        (bounds.longitudeEast - bounds.longitudeWest).abs() > 0.000001;
    if (!hasArea) {
      await controller.animateCamera(
        center: Geographic(
          lon: widget.viewState.cameraCenter.longitude,
          lat: widget.viewState.cameraCenter.latitude,
        ),
        zoom: 15,
        nativeDuration: const Duration(milliseconds: 500),
      );
      return;
    }
    await controller.fitBounds(
      bounds: LngLatBounds(
        longitudeWest: bounds.longitudeWest,
        longitudeEast: bounds.longitudeEast,
        latitudeSouth: bounds.latitudeSouth,
        latitudeNorth: bounds.latitudeNorth,
      ),
      padding: const EdgeInsets.fromLTRB(48, 120, 48, 300),
      nativeDuration: const Duration(milliseconds: 650),
      webMaxZoom: 16,
    );
  }
}
