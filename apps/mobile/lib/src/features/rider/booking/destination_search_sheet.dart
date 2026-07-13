import 'dart:async';

import 'package:flutter/material.dart';

import '../../../ui/tami_colors.dart';
import '../../../ui/tami_glass.dart';
import '../rider_place_search_client.dart';
import '../rider_saved_place_client.dart';
import 'tami_place.dart';

enum RiderPlaceSearchMode { pickup, destination }

class RiderPlaceSearchSheet extends StatefulWidget {
  const RiderPlaceSearchSheet({
    required this.mode,
    required this.accessToken,
    required this.searchClient,
    this.savedPlaces = const [],
    this.showSavedPlacePrompts = true,
    this.proximity,
    super.key,
  });

  final RiderPlaceSearchMode mode;
  final String accessToken;
  final RiderPlaceSearchClient searchClient;
  final List<RiderSavedPlace> savedPlaces;
  final bool showSavedPlacePrompts;
  final RiderPlaceProximity? proximity;

  @override
  State<RiderPlaceSearchSheet> createState() => _RiderPlaceSearchSheetState();
}

class _RiderPlaceSearchSheetState extends State<RiderPlaceSearchSheet> {
  Timer? _debounce;
  String _query = '';
  List<TamiPlace> _results = const [];
  bool _isSearching = false;
  String? _error;
  int _requestVersion = 0;

  String get _title => widget.mode == RiderPlaceSearchMode.pickup
      ? 'Choose pickup'
      : 'Choose destination';

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    final query = value.trim();
    final requestVersion = ++_requestVersion;
    setState(() {
      _query = query;
      _results = const [];
      _error = null;
      _isSearching = query.length >= 2;
    });
    if (query.length < 2) {
      return;
    }
    _debounce = Timer(
      const Duration(milliseconds: 350),
      () => _runSearch(query, requestVersion),
    );
  }

  Future<void> _runSearch(String query, [int? version]) async {
    final requestVersion = version ?? ++_requestVersion;
    setState(() {
      _isSearching = true;
      _error = null;
    });
    try {
      final results = await widget.searchClient.search(
        accessToken: widget.accessToken,
        query: query,
        proximity: widget.proximity,
      );
      if (!mounted || requestVersion != _requestVersion) {
        return;
      }
      setState(() => _results = results);
    } on RiderPlaceSearchException catch (error) {
      if (!mounted || requestVersion != _requestVersion) {
        return;
      }
      setState(() => _error = error.message);
    } finally {
      if (mounted && requestVersion == _requestVersion) {
        setState(() => _isSearching = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Align(
        alignment: Alignment.bottomCenter,
        child: FractionallySizedBox(
          heightFactor: 0.82,
          widthFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: TamiGlass(
              key: const Key('place-search-glass'),
              semanticLabel: _title,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              child: Column(
                children: [
                  Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFB8CCC5),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      IconButton(
                        tooltip: 'Close place search',
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.arrow_back),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _title,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    key: const Key('place-search'),
                    autofocus: true,
                    onChanged: _onQueryChanged,
                    decoration: InputDecoration(
                      hintText: widget.mode == RiderPlaceSearchMode.pickup
                          ? 'Search pickup'
                          : 'Search destination',
                      prefixIcon: const Icon(Icons.search),
                      border: const OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(8)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(child: _buildResults()),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildResults() {
    if (_query.isEmpty) {
      return ListView(
        children: [
          if (widget.savedPlaces.isNotEmpty)
            for (final place in widget.savedPlaces)
              _SavedPlaceRow(
                icon: _savedPlaceIcon(place.designation),
                title: place.label,
                subtitle: place.address,
                onTap: () => Navigator.of(context).pop(
                  TamiPlace(
                    id: place.id,
                    name: place.label,
                    address: place.address,
                    latitude: place.latitude,
                    longitude: place.longitude,
                  ),
                ),
              )
          else if (widget.showSavedPlacePrompts) ...[
            const _SavedPlaceRow(
              icon: Icons.home_outlined,
              title: 'Home',
              subtitle: 'Save an address for faster booking',
            ),
            const _SavedPlaceRow(
              icon: Icons.business_center_outlined,
              title: 'Work',
              subtitle: 'Save an address for faster booking',
            ),
          ] else
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'No saved places yet',
                style: TextStyle(color: TamiColors.mutedInk),
              ),
            ),
        ],
      );
    }
    if (_query.length < 2) {
      return const Center(child: Text('Enter at least 2 characters'));
    }
    if (_isSearching) {
      return const Center(
        child: CircularProgressIndicator(key: Key('place-search-loading')),
      );
    }
    if (_error case final error?) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_outlined, color: TamiColors.danger),
            const SizedBox(height: 8),
            Text(error, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            IconButton(
              tooltip: 'Retry place search',
              onPressed: () => _runSearch(_query),
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
      );
    }
    if (_results.isEmpty) {
      return const Center(child: Text('No places found'));
    }
    return ListView.builder(
      itemCount: _results.length,
      itemBuilder: (context, index) {
        final place = _results[index];
        return ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(
            Icons.location_on_outlined,
            color: TamiColors.civicGreen,
          ),
          title: Text(
            place.name,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          subtitle: Text(place.address),
          onTap: () => Navigator.of(context).pop(place),
        );
      },
    );
  }
}

class _SavedPlaceRow extends StatelessWidget {
  const _SavedPlaceRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: TamiColors.civicGreen),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(subtitle),
      trailing: onTap == null ? const Icon(Icons.add) : null,
      onTap: onTap,
    );
  }
}

IconData _savedPlaceIcon(RiderPlaceDesignation? designation) {
  return switch (designation) {
    RiderPlaceDesignation.home => Icons.home_outlined,
    RiderPlaceDesignation.work => Icons.business_center_outlined,
    null => Icons.bookmark_outline,
  };
}
