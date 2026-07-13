import 'package:flutter/material.dart';

import 'map_preview_fallback.dart';
import 'tami_map_view_state.dart';

class TamiMapSurface extends StatelessWidget {
  const TamiMapSurface({this.viewState = const TamiMapViewState(), super.key});

  final TamiMapViewState viewState;

  @override
  Widget build(BuildContext context) =>
      MapPreviewFallback(viewState: viewState);
}
